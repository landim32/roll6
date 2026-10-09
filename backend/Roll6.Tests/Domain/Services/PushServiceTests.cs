using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Push;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class PushServiceTests
{
    private const long ANA = 2;
    private const long BRUNO = 3;
    private const long CAMPAIGN = 10;

    private readonly Mock<IPushSubscriptionRepository<PushSubscription>> _subscriptions = new();
    private readonly Mock<ICampaignNotificationPrefRepository<CampaignNotificationPref>> _prefs = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaigns = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _participations = new();
    private readonly Mock<IPushSender> _sender = new();
    private readonly Mock<IUserNotificationRepository<UserNotification>> _inbox = new();
    private readonly PushService _service;

    public PushServiceTests()
    {
        _campaigns.Setup(r => r.GetByIdAsync(CAMPAIGN)).ReturnsAsync(new Campaign { CampaignId = CAMPAIGN, UserId = 1, Name = "C", Slug = "c" });
        _participations.Setup(r => r.HasApprovedCharacterAsync(CAMPAIGN, ANA)).ReturnsAsync(true);
        _service = new PushService(_subscriptions.Object, _prefs.Object, _campaigns.Object, _participations.Object, _sender.Object, _inbox.Object);
    }

    private static PushSubscriptionInfo Device(string endpoint = "https://fcm.googleapis.com/fcm/send/abc") =>
        new() { Endpoint = endpoint, Keys = new PushSubscriptionKeysInfo { P256dh = "BPk", Auth = "au" }, UserAgent = "Chrome" };

    [Fact]
    public void Key_IsNullWithoutConfiguration()
    {
        _sender.SetupGet(s => s.Enabled).Returns(false);
        _service.GetKey().PublicKey.Should().BeNull();

        _sender.SetupGet(s => s.Enabled).Returns(true);
        _sender.SetupGet(s => s.PublicKey).Returns("BKey");
        _service.GetKey().PublicKey.Should().Be("BKey");
    }

    [Fact]
    public async Task Subscribe_InsertsANewDevice()
    {
        await _service.SubscribeAsync(ANA, Device());

        _subscriptions.Verify(r => r.InsertAsync(It.Is<PushSubscription>(s =>
            s.UserId == ANA && s.Endpoint == "https://fcm.googleapis.com/fcm/send/abc" && s.P256dh == "BPk" && s.Auth == "au")), Times.Once);
    }

    [Fact]
    public async Task Subscribe_TheSameEndpointMovesToTheNewUser()
    {
        _subscriptions.Setup(r => r.GetByEndpointAsync("https://fcm.googleapis.com/fcm/send/abc"))
            .ReturnsAsync(PushSubscription.Create(BRUNO, "https://fcm.googleapis.com/fcm/send/abc", "old", "old", null));

        await _service.SubscribeAsync(ANA, Device());

        _subscriptions.Verify(r => r.UpdateAsync(It.Is<PushSubscription>(s => s.UserId == ANA && s.P256dh == "BPk")), Times.Once);
        _subscriptions.Verify(r => r.InsertAsync(It.IsAny<PushSubscription>()), Times.Never);
    }

    [Fact]
    public async Task Subscribe_RejectsBadEndpointsAndKeys()
    {
        await _service.Invoking(s => s.SubscribeAsync(ANA, Device("http://insecure/push"))).Should().ThrowAsync<DomainValidationException>();
        await _service.Invoking(s => s.SubscribeAsync(ANA, new PushSubscriptionInfo { Endpoint = "https://x/y" }))
            .Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task Unsubscribe_OnlyTheCallersEndpoint()
    {
        await _service.UnsubscribeAsync(ANA, new PushUnsubscribeInfo { Endpoint = " https://x/y " });

        _subscriptions.Verify(r => r.DeleteByEndpointAsync(ANA, "https://x/y"), Times.Once);
    }

    [Fact]
    public async Task SetMuted_ParticipantsOnly()
    {
        var result = await _service.SetMutedAsync(ANA, CAMPAIGN, new CampaignNotificationUpdateInfo { Muted = true });

        result.Muted.Should().BeTrue();
        _prefs.Verify(r => r.InsertAsync(It.Is<CampaignNotificationPref>(p => p.UserId == ANA && p.CampaignId == CAMPAIGN && p.Muted)), Times.Once);
        await _service.Invoking(s => s.SetMutedAsync(BRUNO, CAMPAIGN, new CampaignNotificationUpdateInfo { Muted = true }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task ListCampaigns_MarksTheMutedOnes()
    {
        _campaigns.Setup(r => r.ListTableAsync(ANA)).ReturnsAsync(new List<CampaignTableRow>
        {
            new() { CampaignId = CAMPAIGN, Name = "C", Slug = "c" },
            new() { CampaignId = 11, Name = "D", Slug = "d" }
        });
        _prefs.Setup(r => r.ListByUserAsync(ANA)).ReturnsAsync(new List<CampaignNotificationPref>
        {
            CampaignNotificationPref.Create(ANA, 11, true)
        });

        var list = await _service.ListCampaignsAsync(ANA);

        list.Select(c => (c.CampaignId, c.Muted)).Should().Equal((CAMPAIGN, false), (11L, true));
    }

    [Fact]
    public async Task Inbox_ListsAndMarksRead()
    {
        var notice = UserNotification.Create(ANA, CAMPAIGN, "poke", "C", "Bruno está cutucando você", "/campaign/c?chat=1");
        _inbox.Setup(r => r.ListByUserAsync(ANA, PushService.INBOX_SIZE)).ReturnsAsync(new List<UserNotification> { notice });
        _inbox.Setup(r => r.CountUnreadAsync(ANA)).ReturnsAsync(1);

        var page = await _service.ListInboxAsync(ANA);
        (page.UnreadCount, page.Items.Single().Body, page.Items.Single().Read).Should().Be((1, "Bruno está cutucando você", false));

        await _service.MarkInboxReadAsync(ANA, new UserNotificationReadInfo());
        _inbox.Verify(r => r.MarkReadAsync(ANA, null, It.IsAny<DateTime>()), Times.Once);
    }
}
