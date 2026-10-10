using Roll6.Domain.Notifications;
using Roll6.Domain.Interfaces;
using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Chat;
using Roll6.DTO.Realtime;
using Roll6.DTO.Turn;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

/// <summary>041: the campaign chat — the same timeline as the turn log, read and written by the TurnService.</summary>
public partial class TurnServiceChatTests
{
    private const long MASTER = 1;
    private const long PLAYER = 2;
    private const long STRANGER = 3;
    private const long CAMPAIGN = 10;
    private const long MAP = 30;
    private const long ARIA = 80;
    private const long BRAM = 81;

    private readonly Mock<ITurnRepository<Turn>> _repository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly Mock<ICharacterRepository<Character>> _characterRepository = new();
    private readonly Mock<IMapNpcRepository<MapNpc>> _mapNpcRepository = new();
    private readonly Mock<INpcRepository<Npc>> _npcRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly Mock<INotificationQueue> _queue = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<IChatReactionRepository<ChatReaction>> _chatReactions = new();
    private readonly Mock<IChatPollRepository<ChatPollOption, ChatPollVote>> _chatPolls = new();
    private readonly Mock<ITurnWhisperRepository<TurnWhisperTarget>> _whispers = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly Mock<IChatReadRepository<ChatRead>> _chatReadRepository = new();
    private readonly Mock<IImageStorageAppService> _imageStorage = new();
    private readonly Campaign _campaign = new() { CampaignId = CAMPAIGN, UserId = MASTER, Name = "C", CurrentTurn = 3, CurrentMapId = MAP };
    private readonly TurnService _service;

    public TurnServiceChatTests()
    {
        _campaignRepository.Setup(r => r.GetByIdAsync(CAMPAIGN)).ReturnsAsync(_campaign);
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(CAMPAIGN, PLAYER)).ReturnsAsync(true);
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, ARIA)).ReturnsAsync(new CampaignCharacter
            { CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved });
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, BRAM)).ReturnsAsync(new CampaignCharacter
            { CampaignId = CAMPAIGN, CharacterId = BRAM, Status = CampaignCharacterStatus.RequestedAccess });
        var aria = new Character { CharacterId = ARIA, UserId = PLAYER, Name = "Aria", Image = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png" };
        var bram = new Character { CharacterId = BRAM, UserId = PLAYER, Name = "Bram" };
        _characterRepository.Setup(r => r.GetByIdAsync(ARIA)).ReturnsAsync(aria);
        _characterRepository.Setup(r => r.GetByIdAsync(BRAM)).ReturnsAsync(bram);
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync((IEnumerable<long> ids) => new[] { aria, bram }.Where(c => ids.Contains(c.CharacterId)).ToList());
        _mapNpcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<MapNpc>());
        _npcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Npc>());
        _userRepository.Setup(r => r.GetByIdAsync(MASTER)).ReturnsAsync(new User { UserId = MASTER, Name = "Ana" });
        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync((IEnumerable<long> ids) => ids.Select(id => new User { UserId = id, Name = id == MASTER ? "Ana" : "Bruno" }).ToList());
        _repository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).ReturnsAsync((Turn t) => { t.TurnId = 900; return t; });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Turn>())).ReturnsAsync((Turn t) => t);
        _repository.Setup(r => r.ListLogByTurnsAsync(CAMPAIGN, It.IsAny<IEnumerable<int>>())).ReturnsAsync(new List<Turn>());
        _repository.Setup(r => r.ListByCampaignTurnAsync(It.IsAny<long>(), It.IsAny<int>())).ReturnsAsync(new List<Turn>());
        _campaignCharacterRepository.Setup(r => r.ListByCampaignAsync(CAMPAIGN, true)).ReturnsAsync(new List<CampaignCharacter>());
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _imageStorage.Setup(s => s.GetUrl(It.IsAny<string?>())).Returns((string? f) => f == null ? null : $"https://cdn/{f}");

        // 044 defaults: no reactions, no reply targets, no earlier valid action.
        _chatReactions.Setup(r => r.ListByTurnsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<ChatReaction>());
        _whispers.Setup(r => r.ListByTurnsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<TurnWhisperTarget>());
        _chatPolls.Setup(r => r.ListOptionsByTurnsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<ChatPollOption>());
        _chatPolls.Setup(r => r.ListVotesByTurnsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<ChatPollVote>());
        _repository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Turn>());
        _repository.Setup(r => r.ListValidActionsAsync(It.IsAny<long>(), It.IsAny<int>(), It.IsAny<long?>(), It.IsAny<long?>()))
            .ReturnsAsync(new List<Turn>());
        _service = new TurnService(_repository.Object, _campaignRepository.Object, new Mock<IMapRepository<Map>>().Object,
            _mapTokenRepository.Object, _campaignCharacterRepository.Object, _characterRepository.Object,
            _mapNpcRepository.Object, _npcRepository.Object, _unitOfWork.Object, _userRepository.Object,
            new Mock<IMapModelRepository<MapModel>>().Object, new Mock<ICampaignNpcRepository<CampaignNpc>>().Object,
            new Mock<ITokenRepository<Token>>().Object, _chatReadRepository.Object, _imageStorage.Object, _chatReactions.Object, _chatPolls.Object, _whispers.Object, _queue.Object, _notifier.Object);
    }

    private static Turn At(Turn t, long id, int second)
    {
        t.TurnId = id;
        t.CreatedAt = new DateTime(2026, 10, 9, 21, 0, second);
        return t;
    }

    // --- Access and identity (US1) ---

    [Fact]
    public async Task Stranger_CannotReadNorSend()
    {
        await _service.Invoking(s => s.ListAsync(STRANGER, CAMPAIGN, null, null, null)).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.SendAsync(STRANGER, CAMPAIGN, new ChatSendInfo { Text = "oi" })).Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Player_SpeaksAsOwnApprovedCharacter()
    {
        var item = await _service.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo { CharacterId = ARIA, Text = "Abro a porta" });

        (item.Kind, item.DisplayName, item.DisplayImageUrl, item.Text, item.TurnNo, item.MapId, item.CanDelete)
            .Should().Be(("text", "Aria", "https://cdn/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png", "Abro a porta", 3, (long?)MAP, true));
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_MESSAGE && e.CampaignId == CAMPAIGN)), Times.Once);
    }

    [Fact]
    public async Task Player_CannotSpeakAsANotApprovedCharacter_NorAsTheMaster()
    {
        await _service.Invoking(s => s.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo { CharacterId = BRAM, Text = "oi" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo { Text = "oi" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Roll_DrawsThreeD6_AsTheCharacter_AndOnlyTheMasterDeletesIt()
    {
        var item = await _service.RollAsync(PLAYER, CAMPAIGN, new ChatRollInfo { CharacterId = ARIA, Text = "Ataque" });

        item.Kind.Should().Be("roll");
        item.Dice.Should().HaveCount(3).And.OnlyContain(d => d >= 1 && d <= 6);
        (item.DisplayName, item.Text, item.CanDelete).Should().Be(("Aria", "Ataque", false));
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_MESSAGE)), Times.Once);
    }

    [Fact]
    public async Task Roll_StrangerOrSomeoneElsesCharacter_Is403()
    {
        await _service.Invoking(s => s.RollAsync(STRANGER, CAMPAIGN, new ChatRollInfo())).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.RollAsync(PLAYER, CAMPAIGN, new ChatRollInfo { CharacterId = BRAM }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Master_SpeaksAsTheMaster()
    {
        var item = await _service.SendAsync(MASTER, CAMPAIGN, new ChatSendInfo { Text = "Rolem iniciativa" });

        (item.DisplayName, item.CharacterId).Should().Be(("Mestre (GM) — Ana", (long?)null));
    }

    [Fact]
    public async Task Send_PhotoAndAudio()
    {
        var photo = await _service.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo
            { CharacterId = ARIA, Image = "0123456789abcdef0123456789abcdef.jpg", Text = "o mapa" });
        var audio = await _service.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo
            { CharacterId = ARIA, Audio = "0123456789abcdef0123456789abcdef.mp4", AudioSeconds = 20 });

        (photo.Kind, photo.ImageUrl, photo.Text).Should().Be(("image", "https://cdn/0123456789abcdef0123456789abcdef.jpg", "o mapa"));
        (audio.Kind, audio.AudioSeconds, audio.AudioType).Should().Be(("audio", (int?)20, "audio/mp4"));
    }

    // --- Page (US1/US2) ---

    [Fact]
    public async Task List_MixesConversationAndTurnRecords_WithTheSummaryText()
    {
        var move = At(Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, (3, 2, 0), (4, 4, 3), 3), 10, 1);
        var talk = At(Turn.Text(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, "Cheguei"), 11, 2);
        var change = At(Turn.CharacterUpdate(CAMPAIGN, MAP, ARIA, null, null, 3, MASTER,
            new[] { new TurnChange("currentLife", "12", "8") }), 12, 3);
        var divider = At(Turn.TurnFinished(CAMPAIGN, MAP, 3, MASTER), 13, 4);
        _repository.Setup(r => r.ListChatPageAsync(CAMPAIGN, null, null, 51, It.IsAny<long>(), It.IsAny<bool>())).ReturnsAsync(new List<Turn> { move, talk, change, divider });
        _repository.Setup(r => r.ListLogByTurnsAsync(CAMPAIGN, It.IsAny<IEnumerable<int>>())).ReturnsAsync(new List<Turn> { move, change });

        var page = await _service.ListAsync(PLAYER, CAMPAIGN, null, null, null);

        page.Items.Select(i => i.Kind).Should().Equal("movement", "text", "characterUpdate", "turnFinished");
        page.HasMore.Should().BeFalse();
        var m = page.Items[0];
        (m.DisplayName, m.Before!.X, m.After!.LookName, m.Moved, m.MovedTotal).Should().Be(("Aria (Bruno)", 3, "Sul", (int?)3, (int?)3));
        m.Text.Should().Be("Aria (Bruno): Moveu de (3, 2) olhando para o Norte para (4, 4) olhando para o Sul, gastou 3 pontos de movimento (3)");
        page.Items[2].Changes!.Single().Should().BeEquivalentTo(new ChatChangeInfo { Field = "currentLife", Label = "Vida", Before = "12", After = "8" });
        page.Items[2].AuthorLabel.Should().Be("GM (Ana)");
        page.Items[3].Text.Should().Be("Turno 3 finalizado");
        page.Items.Select(i => i.CanDelete).Should().Equal(false, true, false, false);
    }

    [Fact]
    public async Task List_OneMoreThanTheLimit_MeansMore()
    {
        var a = At(Turn.Text(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, "1"), 1, 1);
        var b = At(Turn.Text(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, "2"), 2, 2);
        var c = At(Turn.Text(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, "3"), 3, 3);
        _repository.Setup(r => r.ListChatPageAsync(CAMPAIGN, null, null, 3, It.IsAny<long>(), It.IsAny<bool>())).ReturnsAsync(new List<Turn> { a, b, c });

        var page = await _service.ListAsync(PLAYER, CAMPAIGN, null, null, 2);

        page.HasMore.Should().BeTrue();
        page.Items.Select(i => i.Text).Should().Equal("2", "3");
    }

    [Fact]
    public async Task List_BadCursor_Is400()
    {
        (await _service.Invoking(s => s.ListAsync(PLAYER, CAMPAIGN, "abc", null, null)).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey("before");
    }

    [Fact]
    public async Task List_DeletedMessage_HasNoContent()
    {
        var gone = At(Turn.Photo(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, "0123456789abcdef0123456789abcdef.png", "x"), 5, 1);
        gone.Delete(PLAYER, false);
        _repository.Setup(r => r.ListChatPageAsync(CAMPAIGN, null, null, 51, It.IsAny<long>(), It.IsAny<bool>())).ReturnsAsync(new List<Turn> { gone });

        var item = (await _service.ListAsync(MASTER, CAMPAIGN, null, null, null)).Items.Single();

        (item.Deleted, item.Text, item.ImageUrl, item.CanDelete).Should().Be((true, (string?)null, (string?)null, false));
    }

    // --- Unread (US4) ---

    [Fact]
    public async Task List_CountsUnreadSinceTheMark()
    {
        var mark = new DateTime(2026, 10, 9, 20, 0, 0);
        _chatReadRepository.Setup(r => r.GetAsync(CAMPAIGN, PLAYER)).ReturnsAsync(ChatRead.Create(CAMPAIGN, PLAYER, mark));
        _repository.Setup(r => r.ListChatPageAsync(CAMPAIGN, null, null, 51, It.IsAny<long>(), It.IsAny<bool>())).ReturnsAsync(new List<Turn>());
        _repository.Setup(r => r.CountUnreadAsync(CAMPAIGN, PLAYER, mark, TurnService.UNREAD_CAP, false)).ReturnsAsync(3);
        _repository.Setup(r => r.FirstUnreadAsync(CAMPAIGN, PLAYER, mark, false))
            .ReturnsAsync(At(Turn.Text(CAMPAIGN, MAP, 3, MASTER, null, "Mestre", null, "oi"), 77, 5));

        var page = await _service.ListAsync(PLAYER, CAMPAIGN, null, null, null);

        page.UnreadCount.Should().Be(3);
        page.FirstUnreadCursor.Should().EndWith("_77");
    }

    [Fact]
    public async Task MarkRead_OnlyMovesForward()
    {
        var read = ChatRead.Create(CAMPAIGN, PLAYER, new DateTime(2026, 10, 9, 21, 0, 0));
        _chatReadRepository.Setup(r => r.GetAsync(CAMPAIGN, PLAYER)).ReturnsAsync(read);

        await _service.MarkReadAsync(PLAYER, CAMPAIGN, $"{new DateTime(2026, 10, 9, 20, 0, 0).Ticks}_1");
        _chatReadRepository.Verify(r => r.UpdateAsync(It.IsAny<ChatRead>()), Times.Never);

        await _service.MarkReadAsync(PLAYER, CAMPAIGN, $"{new DateTime(2026, 10, 9, 22, 0, 0).Ticks}_2");
        _chatReadRepository.Verify(r => r.UpdateAsync(It.Is<ChatRead>(c => c.LastReadAt == new DateTime(2026, 10, 9, 22, 0, 0))), Times.Once);
    }

    [Fact]
    public async Task MarkRead_FirstTime_CreatesTheMark()
    {
        await _service.MarkReadAsync(PLAYER, CAMPAIGN, $"{new DateTime(2026, 10, 9, 22, 0, 0).Ticks}_2");

        _chatReadRepository.Verify(r => r.InsertAsync(It.Is<ChatRead>(c => c.UserId == PLAYER && c.CampaignId == CAMPAIGN)), Times.Once);
    }

    // --- Audio (US5) ---

    [Theory]
    [InlineData(new byte[] { 0x1A, 0x45, 0xDF, 0xA3, 0, 0, 0, 0 }, "audio/webm", "webm")]
    [InlineData(new byte[] { 0, 0, 0, 0x18, (byte)'f', (byte)'t', (byte)'y', (byte)'p' }, "audio/mp4", "mp4")]
    [InlineData(new byte[] { (byte)'O', (byte)'g', (byte)'g', (byte)'S', 0, 0, 0, 0 }, "audio/ogg", "ogg")]
    public async Task UploadAudio_AcceptsTheBrowserFormats(byte[] head, string type, string ext)
    {
        _imageStorage.Setup(s => s.UploadAsync(It.IsAny<Stream>(), type, ext)).ReturnsAsync($"0123456789abcdef0123456789abcdef.{ext}");

        var result = await _service.UploadAudioAsync(new MemoryStream(head), head.Length);

        (result.ContentType, result.FileName).Should().Be((type, $"0123456789abcdef0123456789abcdef.{ext}"));
    }

    [Fact]
    public async Task UploadAudio_RefusesOtherFilesAndBigOnes()
    {
        (await _service.Invoking(s => s.UploadAudioAsync(new MemoryStream(new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 }), 8))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("file");
        await _service.Invoking(s => s.UploadAudioAsync(new MemoryStream(), TurnService.MAX_AUDIO_BYTES + 1))
            .Should().ThrowAsync<DomainValidationException>();
    }

    // --- Delete (US6) ---

    [Fact]
    public async Task Delete_ByTheAuthor_PublishesAndKeepsTheRow()
    {
        var message = At(Turn.Text(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, "ops"), 50, 1);
        _repository.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(message);

        await _service.DeleteMessageAsync(PLAYER, 50);

        _repository.Verify(r => r.UpdateAsync(It.Is<Turn>(t => t.TurnId == 50 && t.DeletedAt != null)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_DELETED)), Times.Once);
    }

    [Fact]
    public async Task Delete_SomeoneElsesMessage_ByAPlayer_Is403()
    {
        var message = At(Turn.Text(CAMPAIGN, MAP, 3, MASTER, null, "Mestre", null, "x"), 51, 1);
        _repository.Setup(r => r.GetByIdAsync(51)).ReturnsAsync(message);

        await _service.Invoking(s => s.DeleteMessageAsync(PLAYER, 51)).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Delete_Narration_ByTheMaster_AlsoRefreshesTheTurn()
    {
        _repository.Setup(r => r.GetByIdAsync(52)).ReturnsAsync(At(Turn.Narration(CAMPAIGN, MAP, 3, MASTER, "A ponte caiu."), 52, 1));

        await _service.DeleteMessageAsync(MASTER, 52);

        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.TURN_CHANGED)), Times.Once);
    }

    [Fact]
    public async Task Delete_AMove_Is400()
    {
        _repository.Setup(r => r.GetByIdAsync(53))
            .ReturnsAsync(At(Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, (1, 1, 0), (1, 0, 0), 1), 53, 1));

        await _service.Invoking(s => s.DeleteMessageAsync(MASTER, 53)).Should().ThrowAsync<DomainValidationException>();
    }

    // --- Turn records keep their contracts (US2) ---

    [Fact]
    public async Task Finish_WritesTheDivider()
    {
        Turn? divider = null;
        _repository.Setup(r => r.InsertAsync(It.Is<Turn>(t => t.TurnType == TurnType.TurnFinished)))
            .Callback((Turn t) => divider = t).ReturnsAsync((Turn t) => t);

        await _service.FinishAsync(MASTER, CAMPAIGN, new TurnFinishInfo { Force = true });

        (divider!.TurnNo, divider.UserId).Should().Be((3, MASTER));
        _campaign.CurrentTurn.Should().Be(4);
    }

    [Fact]
    public async Task SetCurrent_Forward_WritesOneDividerPerTurn_AndBackRemovesThem()
    {
        var dividers = new List<int>();
        _repository.Setup(r => r.InsertAsync(It.Is<Turn>(t => t.TurnType == TurnType.TurnFinished)))
            .Callback((Turn t) => dividers.Add(t.TurnNo)).ReturnsAsync((Turn t) => t);

        await _service.SetCurrentAsync(MASTER, CAMPAIGN, new TurnSetCurrentInfo { TurnNo = 6 });
        dividers.Should().Equal(3, 4, 5);

        _repository.Setup(r => r.ListTurnNosAfterAsync(CAMPAIGN, 4)).ReturnsAsync(new List<int>());
        await _service.SetCurrentAsync(MASTER, CAMPAIGN, new TurnSetCurrentInfo { TurnNo = 4 });
        _repository.Verify(r => r.DeleteFinishedFromAsync(CAMPAIGN, 4), Times.Once);
    }

    [Fact]
    public async Task AdminTools_DontSeeChatMessages()
    {
        _repository.Setup(r => r.GetByIdAsync(60)).ReturnsAsync(At(Turn.Text(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, "x"), 60, 1));

        await _service.Invoking(s => s.DeleteAsync(MASTER, 60)).Should().ThrowAsync<KeyNotFoundException>();
        await _service.Invoking(s => s.UpdateAsync(MASTER, 60, new TurnUpdateInfo { Description = "y" })).Should().ThrowAsync<KeyNotFoundException>();
        (await _service.Invoking(s => s.CreateAsync(MASTER, new TurnInsertInfo { CampaignId = CAMPAIGN, TurnType = 6, Description = "x" }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("turnType");
    }

    // --- Notices (043) ---

    [Fact]
    public async Task Send_EnqueuesTheMessageForTheOthers()
    {
        await _service.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo { CharacterId = ARIA, Text = "Vamos pela **ponte**" });

        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.Message && n.Speaker == "Aria"
            && n.Body == "Vamos pela ponte" && n.ActorUserId == PLAYER && n.TargetUserIds == null)), Times.Once);
    }

    [Fact]
    public async Task Send_AsTheMaster_UsesTheFirstName()
    {
        _userRepository.Setup(r => r.GetByIdAsync(MASTER)).ReturnsAsync(new User { UserId = MASTER, Name = "Ana Paula" });

        await _service.SendAsync(MASTER, CAMPAIGN, new ChatSendInfo { Text = "Rolem iniciativa" });

        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Speaker == "Mestre (GM) — Ana")), Times.Once);
    }

    [Fact]
    public async Task Roll_EnqueuesTheTotal()
    {
        var item = await _service.RollAsync(PLAYER, CAMPAIGN, new ChatRollInfo { CharacterId = ARIA });

        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Body == $"rolou 3d6: total {item.Dice!.Sum()}")), Times.Once);
    }

    private void PokeTable()
    {
        // Aria (PLAYER) acted; Bram (user 5) and Cael (user 6) did not.
        _campaignCharacterRepository.Setup(r => r.ListByCampaignAsync(CAMPAIGN, true)).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved },
            new() { CampaignId = CAMPAIGN, CharacterId = 81, Status = CampaignCharacterStatus.Approved },
            new() { CampaignId = CAMPAIGN, CharacterId = 82, Status = CampaignCharacterStatus.Approved }
        });
        var owners = new Dictionary<long, long> { [ARIA] = PLAYER, [81] = 5, [82] = 6 };
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync((IEnumerable<long> ids) =>
            ids.Select(id => new Character { CharacterId = id, UserId = owners[id], Name = $"C{id}" }).ToList());
        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync((IEnumerable<long> ids) =>
            ids.Select(id => new User { UserId = id, Name = id == 5 ? "Bruno Lima" : id == 6 ? "Caio Reis" : "Rodrigo Landim" }).ToList());
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(new List<Turn>
        {
            new() { CampaignId = CAMPAIGN, TurnNo = 3, TurnType = TurnType.Action, CharacterId = ARIA }
        });
    }

    [Fact]
    public async Task Poke_TellsWhoHasNotActed_AndLeavesALineInTheChat()
    {
        PokeTable();

        var result = await _service.PokeAsync(PLAYER, CAMPAIGN);

        (result.Poked, string.Join(",", result.Names)).Should().Be((2, "Bruno,Caio"));
        result.Item!.Kind.Should().Be("poke");
        result.Item.Text.Should().Be("Rodrigo cutucou Bruno e Caio");
        result.Item.CanDelete.Should().BeFalse();
        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.Poke && n.Body == "Rodrigo está cutucando você"
            && n.TargetUserIds!.OrderBy(u => u).SequenceEqual(new[] { 5L, 6L }))), Times.Once);
    }

    [Fact]
    public async Task Poke_WhenEveryoneActed_SendsNothing()
    {
        PokeTable();
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(new[] { ARIA, 81L, 82L }
            .Select(c => new Turn { CampaignId = CAMPAIGN, TurnNo = 3, TurnType = TurnType.Action, CharacterId = c }).ToList());

        var result = await _service.PokeAsync(PLAYER, CAMPAIGN);

        result.Poked.Should().Be(0);
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Poke_TwiceInAMinute_Is409()
    {
        PokeTable();
        _repository.Setup(r => r.LastPokeAtAsync(CAMPAIGN, PLAYER)).ReturnsAsync(DateTime.UtcNow.AddSeconds(-20));

        await _service.Invoking(s => s.PokeAsync(PLAYER, CAMPAIGN)).Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Poke_Stranger_Is403()
    {
        await _service.Invoking(s => s.PokeAsync(STRANGER, CAMPAIGN)).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // --- 044: replies, reactions, conversion, cancelled actions ---

    [Fact]
    public async Task Send_AsAReply_CarriesTheQuote()
    {
        var target = Turn.Text(CAMPAIGN, MAP, 3, MASTER, null, "Mestre (GM) — Ana Paula", null, "Rolem **iniciativa**");
        target.TurnId = 50;
        _repository.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(target);
        _repository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Turn> { target });

        var item = await _service.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo { CharacterId = ARIA, Text = "Rolei!", ReplyToTurnId = 50 });

        item.ReplyTo.Should().BeEquivalentTo(new ChatReplyInfo
        {
            Key = "t50", TurnId = 50, DisplayName = "Mestre (GM) — Ana", Kind = "text", Excerpt = "Rolem iniciativa"
        });
        (item.CanReply, item.CanReact).Should().Be((true, true));
    }

    [Fact]
    public async Task React_SetsSwitchesAndRemoves()
    {
        var target = Turn.Text(CAMPAIGN, MAP, 3, MASTER, null, "Mestre (GM) — Ana", null, "Oi");
        target.TurnId = 60;
        _repository.Setup(r => r.GetByIdAsync(60)).ReturnsAsync(target);

        await _service.ReactAsync(PLAYER, 60, new ChatReactInfo { Kind = "like" });
        _chatReactions.Verify(r => r.InsertAsync(It.Is<ChatReaction>(x => x.TurnId == 60 && x.UserId == PLAYER && x.Kind == ChatReactionKind.Like)), Times.Once);

        var existing = ChatReaction.Create(60, PLAYER, ChatReactionKind.Like);
        existing.ChatReactionId = 9;
        _chatReactions.Setup(r => r.GetAsync(60, PLAYER)).ReturnsAsync(existing);
        await _service.ReactAsync(PLAYER, 60, new ChatReactInfo { Kind = "love" });
        _chatReactions.Verify(r => r.UpdateAsync(It.Is<ChatReaction>(x => x.Kind == ChatReactionKind.Love)), Times.Once);

        await _service.ReactAsync(PLAYER, 60, new ChatReactInfo { Kind = "love" });
        _chatReactions.Verify(r => r.DeleteAsync(9), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_UPDATED)), Times.Exactly(3));
        _queue.Verify(q => q.Enqueue(It.IsAny<TableNotice>()), Times.Never);
    }

    [Fact]
    public async Task React_StrangerIs403_AndMovesAreNotReactable()
    {
        var target = Turn.Text(CAMPAIGN, MAP, 3, MASTER, null, "Mestre (GM) — Ana", null, "Oi");
        target.TurnId = 61;
        _repository.Setup(r => r.GetByIdAsync(61)).ReturnsAsync(target);
        await _service.Invoking(s => s.ReactAsync(STRANGER, 61, new ChatReactInfo { Kind = "like" })).Should().ThrowAsync<UnauthorizedAccessException>();

        var move = Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, (1, 1, 0), (1, 2, 0));
        move.TurnId = 62;
        _repository.Setup(r => r.GetByIdAsync(62)).ReturnsAsync(move);
        await _service.Invoking(s => s.ReactAsync(PLAYER, 62, new ChatReactInfo { Kind = "like" })).Should().ThrowAsync<DomainValidationException>();
    }

    private Turn AriaText(long id, string text = "Abro a porta")
    {
        var turn = Turn.Text(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, text);
        turn.TurnId = id;
        _repository.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(turn);
        return turn;
    }

    [Fact]
    public async Task Convert_TextToAction_WhenThePieceIsOnTheMap()
    {
        var text = AriaText(70);
        _mapTokenRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapToken>
        {
            MapToken.PlaceCharacter(MAP, 5, 700, "Aria", 2, 2)
        });
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, ARIA)).ReturnsAsync(new CampaignCharacter
            { CampaignCharacterId = 700, CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved });

        await _service.ConvertAsync(PLAYER, 70, new ChatConvertInfo { To = "action" });

        text.IsValidAction.Should().BeTrue();
        _repository.Verify(r => r.UpdateAsync(It.Is<Turn>(t => t.TurnId == 70 && t.TurnType == TurnType.Action)), Times.Once);
        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.Action)), Times.Once);
    }

    [Fact]
    public async Task Convert_TextToAction_WithoutAPiece_Is400()
    {
        AriaText(71);
        _mapTokenRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapToken>());

        await _service.Invoking(s => s.ConvertAsync(PLAYER, 71, new ChatConvertInfo { To = "action" }))
            .Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task Convert_ActionToMessage_ByTheMaster()
    {
        var action = Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, "Ataco");
        action.TurnId = 72;
        _repository.Setup(r => r.GetByIdAsync(72)).ReturnsAsync(action);

        await _service.ConvertAsync(MASTER, 72, new ChatConvertInfo { To = "message" });

        (action.TurnType, action.DisplayName).Should().Be((TurnType.Text, "Aria"));
    }

    [Fact]
    public async Task Convert_SomeoneElsesCharacter_Is403_AndOldTurns400()
    {
        _userRepository.Setup(r => r.GetByIdAsync(STRANGER)).ReturnsAsync(new User { UserId = STRANGER, Name = "X" });
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(CAMPAIGN, STRANGER)).ReturnsAsync(true);
        AriaText(73);
        await _service.Invoking(s => s.ConvertAsync(STRANGER, 73, new ChatConvertInfo { To = "action" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();

        var old = Turn.Text(CAMPAIGN, MAP, 2, PLAYER, ARIA, "Aria", null, "Antes");
        old.TurnId = 74;
        _repository.Setup(r => r.GetByIdAsync(74)).ReturnsAsync(old);
        await _service.Invoking(s => s.ConvertAsync(PLAYER, 74, new ChatConvertInfo { To = "action" }))
            .Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task DeleteAnAction_CancelsIt_ForTheOwnerOrTheMaster()
    {
        var action = Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, "Ataco");
        action.TurnId = 75;
        _repository.Setup(r => r.GetByIdAsync(75)).ReturnsAsync(action);

        await _service.DeleteMessageAsync(PLAYER, 75);

        action.IsCancelled.Should().BeTrue();
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_UPDATED)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_DELETED)), Times.Never);
    }

    [Fact]
    public async Task List_ShowsCancelledActionsAndWhatTheViewerMayDo()
    {
        var cancelled = Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, "Ataco");
        cancelled.TurnId = 80;
        cancelled.Cancel(DateTime.UtcNow);
        var text = Turn.Text(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, "Abro");
        text.TurnId = 81;
        _repository.Setup(r => r.ListChatPageAsync(CAMPAIGN, null, null, It.IsAny<int>(), It.IsAny<long>(), It.IsAny<bool>())).ReturnsAsync(new List<Turn> { cancelled, text });

        var page = await _service.ListAsync(PLAYER, CAMPAIGN, null, null, null);

        var items = page.Items.ToDictionary(i => i.TurnId);
        (items[80].Cancelled, items[80].CanDelete, items[80].CanConvert).Should().Be((true, false, (string?)null));
        (items[81].CanConvert, items[81].CanReply).Should().Be(("action", true));
    }
}
