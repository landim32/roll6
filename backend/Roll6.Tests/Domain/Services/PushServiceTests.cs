using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
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
    private readonly Mock<ICharacterRepository<Character>> _characters = new();
    private readonly Mock<IUserRepository<User>> _users = new();
    private readonly Mock<ITurnRepository<Turn>> _turns = new();
    private readonly List<(string Endpoint, string Payload)> _pushed = new();
    private readonly PushService _service;

    public PushServiceTests()
    {
        _campaigns.Setup(r => r.GetByIdAsync(CAMPAIGN)).ReturnsAsync(new Campaign { CampaignId = CAMPAIGN, UserId = 1, Name = "C", Slug = "c" });
        _participations.Setup(r => r.HasApprovedCharacterAsync(CAMPAIGN, ANA)).ReturnsAsync(true);
        _service = new PushService(_subscriptions.Object, _prefs.Object, _campaigns.Object, _participations.Object, _sender.Object, _inbox.Object,
            _characters.Object, _users.Object, _turns.Object, new TestClock(new DateTime(2026, 10, 15, 21, 0, 0, DateTimeKind.Utc)));
        _sender.Setup(s => s.SendAsync(It.IsAny<PushTarget>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>()))
            .Callback((PushTarget t, string payload, string _, TimeSpan _) => _pushed.Add((t.Endpoint, payload)))
            .ReturnsAsync((PushTarget t, string _, string _, TimeSpan _) =>
                t.Endpoint.EndsWith("gone") ? PushSendResult.Gone : t.Endpoint.EndsWith("dead") ? PushSendResult.Failed : PushSendResult.Sent);
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

    // ---- 074: devices, test, simulation, preview ----

    private void AnaHasDevices(params string[] names) =>
        _subscriptions.Setup(r => r.ListByUserAsync(ANA)).ReturnsAsync(names.Select((name, i) => new PushSubscription
        {
            PushSubscriptionId = 100 + i, UserId = ANA, Endpoint = $"https://push/{name}", P256dh = "k", Auth = "a",
            UserAgent = "Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36",
            FailureCount = name == "dead" ? 5 : 0
        }).ToList());

    [Fact]
    public async Task Devices_ListEveryDevice_WithLabelAndSkippedFlag()
    {
        AnaHasDevices("phone", "dead");

        var devices = await _service.ListDevicesAsync(ANA);

        devices.Select(d => (d.Label, d.Endpoint, d.Skipped)).Should().Equal(
            ("Chrome · Android", "https://push/phone", false), ("Chrome · Android", "https://push/dead", true));
    }

    [Fact]
    public async Task Test_ThisDevice_SendsNow_AndRecordsTheAnswer()
    {
        _sender.SetupGet(s => s.Enabled).Returns(true);
        AnaHasDevices("phone", "dead", "gone");

        var one = await _service.TestAsync(ANA, new PushTestInfo { Endpoint = "https://push/dead" });
        one.Devices.Select(d => d.Result).Should().Equal("failed");
        _subscriptions.Verify(r => r.RecordFailureAsync(101), Times.Once);

        var all = await _service.TestAsync(ANA, new PushTestInfo());
        all.Devices.Select(d => (d.PushSubscriptionId, d.Result)).Should().Equal((100L, "sent"), (101L, "failed"), (102L, "gone"));
        _subscriptions.Verify(r => r.RecordSuccessAsync(100, It.IsAny<DateTime>()), Times.Once);
        _subscriptions.Verify(r => r.DeleteAsync(102), Times.Once);
        _pushed[0].Payload.Should().Contain("\"title\":\"Roll6 · Teste\"").And.Contain("\"kind\":\"test\"");
    }

    [Fact]
    public async Task Test_AForeignDevice_Is400_AndWithoutKeys409()
    {
        _sender.SetupGet(s => s.Enabled).Returns(true);
        AnaHasDevices("phone");
        (await _service.Invoking(s => s.TestAsync(ANA, new PushTestInfo { Endpoint = "https://push/other" }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("endpoint");

        _sender.SetupGet(s => s.Enabled).Returns(false);
        await _service.Invoking(s => s.TestAsync(ANA, new PushTestInfo())).Should().ThrowAsync<ConflictException>();
    }

    private void TableOfTwo()
    {
        // The master (1) runs C; Ana plays Aria (80, acted), Bruno plays Bram (81, has not acted).
        _campaigns.Setup(r => r.GetByIdAsync(CAMPAIGN)).ReturnsAsync(new Campaign
            { CampaignId = CAMPAIGN, UserId = 1, Name = "Tormento Vil", Slug = "tormento-vil", CurrentTurn = 4 });
        _participations.Setup(r => r.ListByCampaignAsync(CAMPAIGN, true)).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignId = CAMPAIGN, CharacterId = 80, Status = CampaignCharacterStatus.Approved },
            new() { CampaignId = CAMPAIGN, CharacterId = 81, Status = CampaignCharacterStatus.Approved }
        });
        _characters.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character>
        {
            new() { CharacterId = 80, UserId = ANA, Name = "Aria", Life = 12, Energy = 10 },
            new() { CharacterId = 81, UserId = BRUNO, Name = "Bram", Life = 14, Energy = 9 }
        });
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<User>
        {
            new() { UserId = ANA, Name = "Ana Souza" },
            new() { UserId = BRUNO, Name = "Bruno Lima" }
        });
        _turns.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 4)).ReturnsAsync(new List<Turn>
        {
            new() { CampaignId = CAMPAIGN, TurnNo = 4, TurnType = TurnType.Action, CharacterId = 80 }
        });
        _subscriptions.Setup(r => r.ListByUserAsync(1)).ReturnsAsync(new List<PushSubscription>
        {
            new() { PushSubscriptionId = 9, UserId = 1, Endpoint = "https://push/master", P256dh = "k", Auth = "a" }
        });
    }

    [Theory]
    [InlineData("message", "Teste · Aria · Tormento Vil", "Vamos pela ponte do norte, antes que escureça.")]
    [InlineData("action", "Teste · Aria · Tormento Vil", "Ataco o goblin com a espada.")]
    [InlineData("pending", "Teste · Tormento Vil", "Falta apenas Bruno e você")]
    [InlineData("pendingLast", "Teste · Tormento Vil", "Falta só você")]
    [InlineData("turnFinished", "Teste · Tormento Vil", "Turno 4 terminado. Pode agir novamente")]
    [InlineData("life", "Teste · Aria · Tormento Vil", "Você está com 6/12 PV")]
    [InlineData("fatigue", "Teste · Aria · Tormento Vil", "Você está com 5/10 de Fadiga")]
    [InlineData("poke", "Teste · Tormento Vil", "Ana está cutucando você")]
    [InlineData("pokeMaster", "Teste · Tormento Vil", "Ana está cutucando você: todos já agiram")]
    public async Task Simulate_SendsEachKind_OnlyToTheMastersDevices(string kind, string title, string body)
    {
        _sender.SetupGet(s => s.Enabled).Returns(true);
        TableOfTwo();

        var result = await _service.SimulateAsync(1, CAMPAIGN, new NotificationSimulateInfo { Kind = kind });

        result.Devices.Select(d => d.Result).Should().Equal("sent");
        _pushed.Should().ContainSingle();
        _pushed[0].Endpoint.Should().Be("https://push/master");
        _pushed[0].Payload.Should().Contain($"\"title\":\"{title}\"").And.Contain($"\"body\":\"{body}\"")
            .And.Contain("campaign:10:test");
        _inbox.Verify(r => r.InsertRangeAsync(It.IsAny<IEnumerable<UserNotification>>()), Times.Never);
    }

    [Fact]
    public async Task Simulate_NotTheMasterOrUnknownKind_IsRefused()
    {
        _sender.SetupGet(s => s.Enabled).Returns(true);
        TableOfTwo();

        await _service.Invoking(s => s.SimulateAsync(ANA, CAMPAIGN, new NotificationSimulateInfo { Kind = "message" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        (await _service.Invoking(s => s.SimulateAsync(1, CAMPAIGN, new NotificationSimulateInfo { Kind = "x" }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("kind");
        _pushed.Should().BeEmpty();
    }

    [Fact]
    public async Task Preview_ShowsWhoIsMissing_AndWhatTheyWouldGet()
    {
        TableOfTwo();

        var preview = await _service.PreviewAsync(1, CAMPAIGN);

        (preview.TurnNo, preview.Approved, preview.Acted, preview.Threshold, preview.MajorityReached).Should().Be((4, 2, 1, 1, true));
        preview.Pending.Should().ContainSingle();
        (preview.Pending[0].UserId, preview.Pending[0].Name, preview.Pending[0].Body).Should().Be((BRUNO, "Bruno", "Falta só você"));
        preview.Pending[0].Characters.Should().Equal("Bram");
        await _service.Invoking(s => s.PreviewAsync(ANA, CAMPAIGN)).Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
