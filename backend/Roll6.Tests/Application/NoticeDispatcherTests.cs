using FluentAssertions;
using Moq;
using Roll6.Application.Notifications;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Application;

/// <summary>
/// 074: every notice goes to every device of each recipient through the durable outbox — no presence, no toast.
/// </summary>
public class NoticeDispatcherTests
{
    private const long MASTER = 1;
    private const long ANA = 2;
    private const long BRUNO = 3;
    private const long OUTSIDER = 9;
    private const long CAMPAIGN = 10;
    private static readonly DateTime NOW = new(2026, 10, 15, 21, 0, 0, DateTimeKind.Utc);

    private readonly Mock<ICampaignRepository<Campaign>> _campaigns = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _participations = new();
    private readonly Mock<ICharacterRepository<Character>> _characters = new();
    private readonly Mock<ICampaignNotificationPrefRepository<CampaignNotificationPref>> _prefs = new();
    private readonly Mock<IPushSubscriptionRepository<PushSubscription>> _subscriptions = new();
    private readonly Mock<IPushDeliveryRepository<PushDelivery>> _deliveries = new();
    private readonly Mock<IPushSender> _sender = new();
    private readonly Mock<IUserNotificationRepository<UserNotification>> _inbox = new();
    private readonly Mock<INoticeChannel> _channel = new();
    private readonly PushDeliverySignal _signal = new();
    private readonly List<PushDelivery> _queued = new();
    private readonly List<UserNotification> _stored = new();
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
        // Two devices per user (a phone and a desktop): both get every notice.
        _subscriptions.Setup(r => r.ListByUsersAsync(It.IsAny<IReadOnlyCollection<long>>()))
            .ReturnsAsync((IReadOnlyCollection<long> ids) => ids.SelectMany(id => new[]
            {
                new PushSubscription { PushSubscriptionId = id * 100, UserId = id, Endpoint = $"https://push/{id}/phone", P256dh = "k", Auth = "a" },
                new PushSubscription { PushSubscriptionId = id * 100 + 1, UserId = id, Endpoint = $"https://push/{id}/desktop", P256dh = "k", Auth = "a" }
            }).ToList());
        _deliveries.Setup(r => r.InsertRangeAsync(It.IsAny<IReadOnlyCollection<PushDelivery>>()))
            .Callback((IReadOnlyCollection<PushDelivery> rows) => _queued.AddRange(rows)).Returns(Task.CompletedTask);
        _inbox.Setup(r => r.InsertRangeAsync(It.IsAny<IEnumerable<UserNotification>>()))
            .Callback((IEnumerable<UserNotification> rows) => _stored.AddRange(rows)).Returns(Task.CompletedTask);
        _sender.SetupGet(s => s.Enabled).Returns(true);
        var time = new TestClock(NOW);
        _dispatcher = new NoticeDispatcher(_campaigns.Object, _participations.Object, _characters.Object, _prefs.Object,
            _subscriptions.Object, _deliveries.Object, _inbox.Object, _sender.Object, _channel.Object, _signal, time);
    }

    private static TableNotice Message(long actor) => new()
    {
        Kind = NoticeKind.Message, CampaignId = CAMPAIGN, ActorUserId = actor, Speaker = "Aria", Body = "Vamos pela ponte"
    };

    private long[] QueuedUsers() => _queued.Select(d => d.PushSubscriptionId / 100).Distinct().OrderBy(u => u).ToArray();

    [Fact]
    public async Task Message_GoesToEveryDeviceOfEveryoneButTheAuthor()
    {
        await _dispatcher.DispatchAsync(Message(ANA));

        _queued.Select(d => d.PushSubscriptionId).Should().BeEquivalentTo(new long[] { 100, 101, 300, 301 });
        var payload = _queued[0].Payload;
        payload.Should().Contain("\"title\":\"Aria · Tormento Vil\"").And.Contain("\"body\":\"Vamos pela ponte\"")
            .And.Contain("/campaign/tormento-vil?chat=1").And.Contain("campaign:10:message").And.Contain("\"renotify\":true");
        _queued.Should().OnlyContain(d => d.Topic == "c10-message" && d.NextAttemptAt == NOW && d.ExpiresAt == NOW.AddHours(12));
    }

    [Fact]
    public async Task Muted_AreSkipped_ButNothingDependsOnWhatIsOnScreen()
    {
        _prefs.Setup(r => r.ListMutedUserIdsAsync(CAMPAIGN)).ReturnsAsync(new List<long> { MASTER });

        await _dispatcher.DispatchAsync(Message(ANA));

        QueuedUsers().Should().Equal(BRUNO);
    }

    [Fact]
    public async Task Personal_IsAlwaysAPush_WithTheBodyOfEachRecipient()
    {
        var notice = new TableNotice
        {
            Kind = NoticeKind.Pending, CampaignId = CAMPAIGN, ActorUserId = MASTER, Body = NoticeTexts.Pending(Array.Empty<string>()),
            TargetUserIds = new[] { ANA, BRUNO },
            BodyByUser = new Dictionary<long, string> { [ANA] = NoticeTexts.Pending(new[] { "Bruno" }) }
        };

        await _dispatcher.DispatchAsync(notice);

        _queued.Where(d => d.PushSubscriptionId / 100 == ANA).Should().OnlyContain(d => d.Payload.Contains("Falta apenas Bruno e você"));
        _queued.Where(d => d.PushSubscriptionId / 100 == BRUNO).Should().OnlyContain(d => d.Payload.Contains("\"body\":\"Falta só você\""));
        _queued.Should().OnlyContain(d => d.Payload.Contains("\"kind\":\"pending\"") && d.Topic == "c10-pending");
    }

    [Fact]
    public async Task OnlyCurrentParticipants_AreNotified()
    {
        await _dispatcher.DispatchAsync(new TableNotice
        {
            Kind = NoticeKind.Poke, CampaignId = CAMPAIGN, ActorUserId = ANA, Body = NoticeTexts.Poke("Ana"),
            TargetUserIds = new[] { BRUNO, OUTSIDER }
        });

        QueuedUsers().Should().Equal(BRUNO);
    }

    [Fact]
    public async Task Deliveries_AreQueued_AndTheWorkerIsWoken()
    {
        await _dispatcher.DispatchAsync(Message(ANA));

        var woke = _signal.WaitAsync(TimeSpan.FromSeconds(5), CancellationToken.None);
        (await Task.WhenAny(woke, Task.Delay(1000))).Should().Be(woke);
        _sender.Verify(s => s.SendAsync(It.IsAny<PushTarget>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>()), Times.Never);
    }

    [Fact]
    public async Task WithoutKeys_NothingIsQueued_ButTheBellStillLists()
    {
        _sender.SetupGet(s => s.Enabled).Returns(false);

        await _dispatcher.DispatchAsync(Message(ANA));

        _queued.Should().BeEmpty();
        _stored.Select(n => n.UserId).Should().BeEquivalentTo(new[] { MASTER, BRUNO });
    }

    [Fact]
    public async Task Inbox_GetsEveryRecipient_ExactlyAsSent()
    {
        await _dispatcher.DispatchAsync(new TableNotice
        {
            Kind = NoticeKind.PokeMaster, CampaignId = CAMPAIGN, ActorUserId = ANA, Body = NoticeTexts.PokeMaster("Ana"),
            TargetUserIds = new[] { MASTER }
        });

        _stored.Select(n => (n.UserId, n.Title, n.Body, n.Url, n.Kind)).Should().Equal(
            (MASTER, "Tormento Vil", "Ana está cutucando você: todos já agiram", "/campaign/tormento-vil?chat=1", "pokeMaster"));
        _channel.Verify(c => c.InboxChangedAsync(MASTER), Times.Once);
    }
}
