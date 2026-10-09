using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Roll6.Application.Notifications;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.DTO.Push;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Application;

public class NoticeDispatcherTests
{
    private const long MASTER = 1;
    private const long ANA = 2;
    private const long BRUNO = 3;
    private const long OUTSIDER = 9;
    private const long CAMPAIGN = 10;

    private readonly Mock<ICampaignRepository<Campaign>> _campaigns = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _participations = new();
    private readonly Mock<ICharacterRepository<Character>> _characters = new();
    private readonly Mock<ICampaignNotificationPrefRepository<CampaignNotificationPref>> _prefs = new();
    private readonly Mock<IPushSubscriptionRepository<PushSubscription>> _subscriptions = new();
    private readonly Mock<IPushSender> _sender = new();
    private readonly Mock<IPresence> _presence = new();
    private readonly Mock<INoticeChannel> _channel = new();
    private readonly List<(long UserId, string Payload)> _sent = new();
    private readonly NoticeDispatcher _dispatcher;

    public NoticeDispatcherTests()
    {
        _campaigns.Setup(r => r.GetByIdAsync(CAMPAIGN))
            .ReturnsAsync(new Campaign { CampaignId = CAMPAIGN, UserId = MASTER, Name = "Tormento Vil", Slug = "tormento-vil" });
        _participations.Setup(r => r.ListByCampaignAsync(CAMPAIGN, true)).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignId = CAMPAIGN, CharacterId = 80, Status = CampaignCharacterStatus.Approved },
            new() { CampaignId = CAMPAIGN, CharacterId = 81, Status = CampaignCharacterStatus.Approved },
            new() { CampaignId = CAMPAIGN, CharacterId = 82, Status = CampaignCharacterStatus.Approved }
        });
        _characters.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character>
        {
            new() { CharacterId = 80, UserId = ANA, Name = "Aria" },
            new() { CharacterId = 81, UserId = BRUNO, Name = "Bram" },
            // The master also plays a character: still one notice per person.
            new() { CharacterId = 82, UserId = MASTER, Name = "Goran" }
        });
        _prefs.Setup(r => r.ListMutedUserIdsAsync(CAMPAIGN)).ReturnsAsync(new List<long>());
        _subscriptions.Setup(r => r.ListByUsersAsync(It.IsAny<IReadOnlyCollection<long>>()))
            .ReturnsAsync((IReadOnlyCollection<long> ids) => ids.Select(id => new PushSubscription
            {
                PushSubscriptionId = id * 100, UserId = id, Endpoint = $"https://push/{id}", P256dh = "k", Auth = "a"
            }).ToList());
        _sender.SetupGet(s => s.Enabled).Returns(true);
        _sender.Setup(s => s.SendAsync(It.IsAny<PushTarget>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
            .Callback((PushTarget t, string payload, string _, bool _, TimeSpan _) => _sent.Add((long.Parse(t.Endpoint.Split('/').Last()), payload)))
            .ReturnsAsync(PushSendResult.Sent);
        _dispatcher = new NoticeDispatcher(_campaigns.Object, _participations.Object, _characters.Object, _prefs.Object,
            _subscriptions.Object, _sender.Object, _presence.Object, _channel.Object, NullLogger<NoticeDispatcher>.Instance);
    }

    private static TableNotice Message(long actor) => new()
    {
        Kind = NoticeKind.Message, CampaignId = CAMPAIGN, ActorUserId = actor, Speaker = "Aria", Body = "Vamos pela ponte"
    };

    [Fact]
    public async Task Message_GoesToEveryoneButTheAuthor_OncePerPerson()
    {
        await _dispatcher.DispatchAsync(Message(ANA));

        _sent.Select(s => s.UserId).Should().BeEquivalentTo(new[] { MASTER, BRUNO });
        _sent[0].Payload.Should().Contain("\"title\":\"Aria · Tormento Vil\"").And.Contain("\"body\":\"Vamos pela ponte\"")
            .And.Contain("/campaign/tormento-vil?chat=1").And.Contain("campaign:10:chat");
    }

    [Fact]
    public async Task Message_SkipsWhoHasTheChatOnScreen_AndWhoMuted()
    {
        _presence.Setup(p => p.IsChatVisible(BRUNO, CAMPAIGN)).Returns(true);
        _prefs.Setup(r => r.ListMutedUserIdsAsync(CAMPAIGN)).ReturnsAsync(new List<long> { MASTER });

        await _dispatcher.DispatchAsync(Message(ANA));

        _sent.Should().BeEmpty();
        _channel.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Personal_IsAToastWhenTheCampaignIsOnScreen_ElseAPush()
    {
        _presence.Setup(p => p.IsCampaignVisible(ANA, CAMPAIGN)).Returns(true);
        var notice = new TableNotice
        {
            Kind = NoticeKind.TurnFinished, CampaignId = CAMPAIGN, ActorUserId = MASTER, Body = NoticeTexts.TurnFinished(4),
            TargetUserIds = new[] { ANA, BRUNO }
        };

        await _dispatcher.DispatchAsync(notice);

        _channel.Verify(c => c.SendNoticeAsync(ANA, CAMPAIGN, It.Is<NoticeInfo>(n =>
            n.Kind == "turnFinished" && n.Body == "Turno 4 terminado. Pode agir novamente" && n.Title == "Tormento Vil")), Times.Once);
        _sent.Select(s => s.UserId).Should().Equal(BRUNO);
    }

    [Fact]
    public async Task Personal_UsesTheBodyOfEachRecipient()
    {
        var notice = new TableNotice
        {
            Kind = NoticeKind.Majority, CampaignId = CAMPAIGN, ActorUserId = MASTER, Body = NoticeTexts.Majority(Array.Empty<string>()),
            TargetUserIds = new[] { ANA, BRUNO },
            BodyByUser = new Dictionary<long, string> { [ANA] = NoticeTexts.Majority(new[] { "Bruno" }) }
        };

        await _dispatcher.DispatchAsync(notice);

        _sent.Single(s => s.UserId == ANA).Payload.Should().Contain("Falta apenas você e Bruno");
        _sent.Single(s => s.UserId == BRUNO).Payload.Should().Contain("\"body\":\"Falta apenas você\"");
    }

    [Fact]
    public async Task OnlyCurrentParticipants_AreNotified()
    {
        var notice = new TableNotice
        {
            Kind = NoticeKind.Poke, CampaignId = CAMPAIGN, ActorUserId = ANA, Body = NoticeTexts.Poke("Ana"),
            TargetUserIds = new[] { BRUNO, OUTSIDER }
        };

        await _dispatcher.DispatchAsync(notice);

        _sent.Select(s => s.UserId).Should().Equal(BRUNO);
    }

    [Fact]
    public async Task GoneSubscriptions_AreRemoved()
    {
        _sender.Setup(s => s.SendAsync(It.IsAny<PushTarget>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<TimeSpan>()))
            .ReturnsAsync(PushSendResult.Gone);

        await _dispatcher.DispatchAsync(Message(ANA));

        _subscriptions.Verify(r => r.DeleteAsync(MASTER * 100), Times.Once);
        _subscriptions.Verify(r => r.DeleteAsync(BRUNO * 100), Times.Once);
        _subscriptions.Verify(r => r.TouchAsync(It.IsAny<long>(), It.IsAny<DateTime>()), Times.Never);
    }

    [Fact]
    public async Task WithoutKeys_NothingIsPushed()
    {
        _sender.SetupGet(s => s.Enabled).Returns(false);

        await _dispatcher.DispatchAsync(Message(ANA));

        _subscriptions.Verify(r => r.ListByUsersAsync(It.IsAny<IReadOnlyCollection<long>>()), Times.Never);
    }
}
