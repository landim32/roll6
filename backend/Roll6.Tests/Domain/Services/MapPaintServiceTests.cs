using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Maps;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.Domain.Services;
using Roll6.DTO.Map;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class MapPaintServiceTests
{
    private const long MASTER = 1;
    private const long PLAYER = 2;
    private const long STRANGER = 3;
    private const long MAP = 30;

    private readonly Mock<IMapPaintRepository<MapHexMark, MapDrawing>> _repository = new();
    private readonly Mock<IMapRepository<Map>> _mapRepository = new();
    private readonly Mock<IMapModelRepository<MapModel>> _mapModelRepository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<ICharacterRepository<Character>> _characterRepository = new();
    private readonly Mock<IMapNpcRepository<MapNpc>> _mapNpcRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly TestClock _clock = new(new DateTime(2026, 11, 3, 21, 10, 0, DateTimeKind.Utc));
    private readonly Campaign _campaign = new() { CampaignId = 10, UserId = MASTER, Name = "C", Status = CampaignStatus.Active };
    private readonly Map _map = new() { MapId = MAP, CampaignId = 10, MapModelId = 50, UserId = MASTER, Status = MapStatus.Active };
    private readonly MapModel _model = new() { MapModelId = 50, GridWidth = 10, GridHeight = 8 };
    private readonly List<MapHexMark> _marks = new();
    private readonly List<TableEventInfo> _events = new();
    private readonly MapPaintService _service;

    public MapPaintServiceTests()
    {
        _mapRepository.Setup(r => r.GetByIdAsync(MAP)).ReturnsAsync(() => _map);
        _mapModelRepository.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(() => _model);
        _campaignRepository.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(() => _campaign);
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(10, PLAYER)).ReturnsAsync(true);
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _repository.Setup(r => r.ListMarksAsync(MAP)).ReturnsAsync(() => _marks.ToList());
        _repository.Setup(r => r.ListDrawingsAsync(MAP)).ReturnsAsync(new List<MapDrawing>());
        _repository.Setup(r => r.InsertDrawingAsync(It.IsAny<MapDrawing>())).ReturnsAsync((MapDrawing d) => { d.MapDrawingId = 7; return d; });
        _notifier.Setup(n => n.PublishAsync(It.IsAny<TableEventInfo>())).Callback((TableEventInfo e) => _events.Add(e)).Returns(Task.CompletedTask);
        _mapTokenRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapToken>());
        _service = new MapPaintService(_repository.Object, _mapRepository.Object, _mapModelRepository.Object, _campaignRepository.Object,
            _campaignCharacterRepository.Object, _mapTokenRepository.Object, _tokenRepository.Object, _characterRepository.Object,
            _mapNpcRepository.Object, _unitOfWork.Object, _clock, _notifier.Object);
    }

    private static MapHexMarksInfo Marks(params MapHexMarkWriteInfo[] items) => new() { Marks = items.ToList() };

    private static MapHexMarkWriteInfo Mark(int x, int y, int? kind, string? text = null) => new() { X = x, Y = y, Kind = kind, Text = text };

    private MapHexMark Stored(int x, int y, HexMarkKind kind, string? text = null) =>
        MapHexMark.Create(MAP, x, y, kind, text, MASTER, _clock.Now.AddHours(-1));

    // ---- hex marks (US2) ----

    [Fact]
    public async Task SetHexMarks_Master_UpsertsAndRemovesInOneTransactionAndPublishes()
    {
        _marks.Add(Stored(6, 7, HexMarkKind.Wall));
        _marks.Add(Stored(5, 7, HexMarkKind.Stone));
        IReadOnlyList<MapHexMark>? applied = null;
        IReadOnlyList<(int X, int Y)>? removed = null;
        _repository.Setup(r => r.ApplyMarksAsync(MAP, It.IsAny<IReadOnlyList<MapHexMark>>(), It.IsAny<IReadOnlyList<(int X, int Y)>>()))
            .Callback((long _, IReadOnlyList<MapHexMark> u, IReadOnlyList<(int X, int Y)> r) => { applied = u; removed = r; })
            .Returns(Task.CompletedTask);

        var result = await _service.SetHexMarksAsync(MASTER, MAP, Marks(Mark(4, 7, 4), Mark(5, 7, 7, "Baú"), Mark(6, 7, null), Mark(7, 7, null)));

        applied!.Select(m => (m.X, m.Y, m.Kind, m.Text, m.UserId, m.UpdatedAt))
            .Should().Equal((4, 7, HexMarkKind.Water, (string?)null, MASTER, _clock.Now), (5, 7, HexMarkKind.Mark, "Baú", MASTER, _clock.Now));
        removed.Should().Equal((6, 7));
        _unitOfWork.Verify(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>()), Times.Once);
        result.Marks.Select(m => (m.X, m.Y, m.Kind, m.Text)).Should().Equal((4, 7, 4, (string?)null), (5, 7, 7, "Baú"));
        result.RemovedHexes.Select(h => (h.X, h.Y)).Should().Equal((6, 7));
        result.Cleared.Should().BeFalse();
        var tableEvent = _events.Should().ContainSingle().Which;
        tableEvent.Type.Should().Be(TableEventType.MAP_PAINT_CHANGED);
        tableEvent.MapId.Should().Be(MAP);
        tableEvent.CampaignId.Should().Be(10);
        tableEvent.Data.Should().BeSameAs(result);
    }

    [Fact]
    public async Task SetHexMarks_NothingChanges_WritesAndPublishesNothing()
    {
        _marks.Add(Stored(4, 7, HexMarkKind.Water));

        var result = await _service.SetHexMarksAsync(MASTER, MAP, Marks(Mark(4, 7, 4), Mark(8, 1, null)));

        result.Marks.Should().ContainSingle();
        result.RemovedHexes.Should().BeEmpty();
        _repository.Verify(r => r.ApplyMarksAsync(It.IsAny<long>(), It.IsAny<IReadOnlyList<MapHexMark>>(), It.IsAny<IReadOnlyList<(int X, int Y)>>()), Times.Never);
        _events.Should().BeEmpty();
    }

    [Fact]
    public async Task SetHexMarks_ReplacingAMark_WritesOnlyTheChangedHex()
    {
        _marks.Add(Stored(1, 1, HexMarkKind.Wall));
        _marks.Add(Stored(2, 1, HexMarkKind.Fire));
        IReadOnlyList<MapHexMark>? applied = null;
        _repository.Setup(r => r.ApplyMarksAsync(MAP, It.IsAny<IReadOnlyList<MapHexMark>>(), It.IsAny<IReadOnlyList<(int X, int Y)>>()))
            .Callback((long _, IReadOnlyList<MapHexMark> u, IReadOnlyList<(int X, int Y)> _) => applied = u)
            .Returns(Task.CompletedTask);

        await _service.SetHexMarksAsync(MASTER, MAP, Marks(Mark(1, 1, 3), Mark(2, 1, 5)));

        applied!.Select(m => (m.X, m.Y, m.Kind)).Should().Equal((1, 1, HexMarkKind.Hole));
        _events.Should().ContainSingle();
    }

    [Fact]
    public async Task SetHexMarks_Player_Is403()
    {
        var act = () => _service.SetHexMarksAsync(PLAYER, MAP, Marks(Mark(1, 1, 1)));

        (await act.Should().ThrowAsync<UnauthorizedAccessException>()).WithMessage(MapPaintService.MASTER_ONLY);
    }

    [Theory]
    [InlineData(CampaignStatus.Paused)]
    [InlineData(CampaignStatus.Finished)]
    public async Task SetHexMarks_FrozenCampaign_Is409(CampaignStatus status)
    {
        _campaign.Status = status;

        var act = () => _service.SetHexMarksAsync(MASTER, MAP, Marks(Mark(1, 1, 1)));

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task SetHexMarks_PreparingCampaign_IsAllowedToTheMaster()
    {
        _campaign.Status = CampaignStatus.Preparing;

        await _service.SetHexMarksAsync(MASTER, MAP, Marks(Mark(1, 1, 1)));

        _events.Should().ContainSingle();
    }

    [Fact]
    public async Task SetHexMarks_DeletedMap_Is404()
    {
        _map.Status = MapStatus.Deleted;

        var act = () => _service.SetHexMarksAsync(MASTER, MAP, Marks(Mark(1, 1, 1)));

        (await act.Should().ThrowAsync<KeyNotFoundException>()).WithMessage(MapPaintService.MAP_NOT_FOUND);
    }

    [Fact]
    public async Task SetHexMarks_OutsideTheGrid_Is400()
    {
        var act = () => _service.SetHexMarksAsync(MASTER, MAP, Marks(Mark(10, 0, 1)));

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("marks[0].x");
    }

    // ---- reads ----

    [Fact]
    public async Task GetPaint_HidesMarksOutsideAShrunkGrid()
    {
        _marks.Add(Stored(1, 1, HexMarkKind.Wall));
        _marks.Add(Stored(9, 7, HexMarkKind.Mark, "Baú"));
        _model.GridWidth = 5;
        _repository.Setup(r => r.ListDrawingsAsync(MAP)).ReturnsAsync(new List<MapDrawing>
        {
            new() { MapDrawingId = 9, MapId = MAP, Kind = DrawingKind.Line, Points = new List<int[]> { new[] { 0, 0 }, new[] { 5, 5 } }, Color = "#000000", Width = 2, Opacity = 1 },
            new() { MapDrawingId = 4, MapId = MAP, Kind = DrawingKind.Arrow, Points = new List<int[]> { new[] { 0, 0 }, new[] { 5, 5 } }, Color = "#000000", Width = 2, Opacity = 0.8f }
        });

        var paint = await _service.GetPaintAsync(PLAYER, MAP);

        paint.MapId.Should().Be(MAP);
        paint.Marks.Select(m => (m.X, m.Y)).Should().Equal((1, 1));
        paint.Drawings.Select(d => d.MapDrawingId).Should().Equal(4, 9);
        paint.Drawings[0].Opacity.Should().Be(0.8);
    }

    [Fact]
    public async Task GetPaint_Stranger_Is403()
    {
        var act = () => _service.GetPaintAsync(STRANGER, MAP);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetPaint_PausedCampaign_StillReads()
    {
        _campaign.Status = CampaignStatus.Paused;

        (await _service.GetPaintAsync(MASTER, MAP)).Marks.Should().BeEmpty();
    }

    // ---- hex content (US3) ----

    [Fact]
    public async Task GetHexContent_ReturnsTheMarkWithItsText()
    {
        _repository.Setup(r => r.GetMarkAsync(MAP, 5, 7)).ReturnsAsync(Stored(5, 7, HexMarkKind.Mark, "Baú"));

        var content = await _service.GetHexContentAsync(PLAYER, MAP, 5, 7);

        content.Inside.Should().BeTrue();
        content.Mark!.Kind.Should().Be((int)HexMarkKind.Mark);
        content.Mark.Text.Should().Be("Baú");
        content.Pieces.Should().BeEmpty();
    }

    [Fact]
    public async Task GetHexContent_ListsABigPieceCenteredElsewhere()
    {
        // A size-3 character facing up at (5, 6) covers (5, 5), (5, 6) and (5, 7); an object sits at (2, 2).
        _mapTokenRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapToken>
        {
            new() { MapTokenId = 40, MapId = MAP, TokenId = 6, TokenType = MapTokenType.Character, CampaignCharacterId = 9, Name = "old", X = 5, Y = 6, Look = 0 },
            new() { MapTokenId = 41, MapId = MAP, TokenId = 5, TokenType = MapTokenType.Object, Name = "Baú", X = 2, Y = 2 },
            new() { MapTokenId = 42, MapId = MAP, TokenId = 5, TokenType = MapTokenType.Npc, MapNpcId = 12, Name = "x", X = 6, Y = 7 }
        });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token>
        {
            new() { TokenId = 6, Name = "Grande", UpSpace = 3 },
            new() { TokenId = 5, Name = "Pequeno", UpSpace = 1 }
        });
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignCharacterId = 9, CampaignId = 10, CharacterId = 5, Posture = Posture.Standing }
        });
        _mapNpcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<MapNpc>
        {
            new() { MapNpcId = 12, MapId = MAP, Name = "Goblin 2", Posture = Posture.Down }
        });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character>
        {
            new() { CharacterId = 5, Name = "Aria" }
        });

        var content = await _service.GetHexContentAsync(PLAYER, MAP, 5, 7);

        var piece = content.Pieces.Should().ContainSingle().Which;
        piece.MapTokenId.Should().Be(40);
        piece.Name.Should().Be("Aria");
        piece.TokenType.Should().Be((int)MapTokenType.Character);
        piece.CampaignCharacterId.Should().Be(9);
        piece.CharacterId.Should().Be(5);
        piece.Posture.Should().Be((int)Posture.Standing);
        (piece.X, piece.Y).Should().Be((5, 6));
        content.Mark.Should().BeNull();

        var npcHex = await _service.GetHexContentAsync(PLAYER, MAP, 6, 7);
        npcHex.Pieces.Should().ContainSingle().Which.Should().BeEquivalentTo(new { MapTokenId = 42L, Name = "Goblin 2", MapNpcId = (long?)12, Posture = (int?)2 });

        var objectHex = await _service.GetHexContentAsync(MASTER, MAP, 2, 2);
        objectHex.Pieces.Should().ContainSingle().Which.Should().BeEquivalentTo(new { Name = "Baú", Posture = (int?)1 }); // 109: objects have their own posture
    }

    [Fact]
    public async Task GetHexContent_EmptyHex_HasNothing()
    {
        var content = await _service.GetHexContentAsync(MASTER, MAP, 0, 0);

        content.Mark.Should().BeNull();
        content.Pieces.Should().BeEmpty();
        (content.X, content.Y, content.MapId).Should().Be((0, 0, MAP));
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(10, 0)]
    [InlineData(0, 8)]
    public async Task GetHexContent_OutsideTheGrid_Is400OnX(int x, int y)
    {
        var act = () => _service.GetHexContentAsync(MASTER, MAP, x, y);

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors["x"].Should().Equal(HexMarkSet.OUTSIDE);
    }

    [Fact]
    public async Task GetHexContent_Stranger_Is403()
    {
        var act = () => _service.GetHexContentAsync(STRANGER, MAP, 1, 1);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ---- drawings (US4) ----

    private static MapDrawingInsertInfo Arrow() => new()
    {
        Kind = (int)DrawingKind.Arrow,
        Points = new List<int[]> { new[] { 120, 80 }, new[] { 400, 260 } },
        Color = "#E03131",
        Width = 6,
        Opacity = 1
    };

    [Fact]
    public async Task AddDrawing_Master_InsertsAndPublishes()
    {
        var result = await _service.AddDrawingAsync(MASTER, MAP, Arrow());

        result.MapDrawingId.Should().Be(7);
        result.Kind.Should().Be((int)DrawingKind.Arrow);
        result.Color.Should().Be("#e03131");
        result.UserId.Should().Be(MASTER);
        result.CreatedAt.Should().Be(_clock.Now);
        result.Points.Select(p => (p[0], p[1])).Should().Equal((120, 80), (400, 260));
        var change = (MapPaintChangeInfo)_events.Should().ContainSingle().Which.Data!;
        change.Drawing.Should().BeSameAs(result);
    }

    [Fact]
    public async Task AddDrawing_AtTheLimit_Is409()
    {
        _repository.Setup(r => r.CountDrawingsAsync(MAP)).ReturnsAsync(MapDrawing.MAX_PER_MAP);

        var act = () => _service.AddDrawingAsync(MASTER, MAP, Arrow());

        (await act.Should().ThrowAsync<ConflictException>()).WithMessage(MapPaintService.TOO_MANY_DRAWINGS);
        _repository.Verify(r => r.InsertDrawingAsync(It.IsAny<MapDrawing>()), Times.Never);
    }

    [Fact]
    public async Task AddDrawing_Invalid_Is400()
    {
        var info = Arrow();
        info.Width = 0;

        var act = () => _service.AddDrawingAsync(MASTER, MAP, info);

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("width");
    }

    [Fact]
    public async Task AddDrawing_Player_Is403()
    {
        var act = () => _service.AddDrawingAsync(PLAYER, MAP, Arrow());

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task DeleteDrawing_OfThisMap_DeletesAndPublishes()
    {
        _repository.Setup(r => r.GetDrawingAsync(7)).ReturnsAsync(new MapDrawing { MapDrawingId = 7, MapId = MAP });

        await _service.DeleteDrawingAsync(MASTER, MAP, 7);

        _repository.Verify(r => r.DeleteDrawingAsync(7));
        ((MapPaintChangeInfo)_events.Single().Data!).DeletedDrawingId.Should().Be(7);
    }

    [Fact]
    public async Task DeleteDrawing_OfAnotherMap_Is404()
    {
        _repository.Setup(r => r.GetDrawingAsync(7)).ReturnsAsync(new MapDrawing { MapDrawingId = 7, MapId = 99 });

        var act = () => _service.DeleteDrawingAsync(MASTER, MAP, 7);

        (await act.Should().ThrowAsync<KeyNotFoundException>()).WithMessage(MapPaintService.DRAWING_NOT_FOUND);
        _repository.Verify(r => r.DeleteDrawingAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Clear_WithPaint_ClearsAndPublishesCleared()
    {
        _repository.Setup(r => r.ClearAsync(MAP)).ReturnsAsync(3);

        await _service.ClearAsync(MASTER, MAP);

        ((MapPaintChangeInfo)_events.Single().Data!).Cleared.Should().BeTrue();
    }

    [Fact]
    public async Task Clear_NothingToClear_PublishesNothing()
    {
        _repository.Setup(r => r.ClearAsync(MAP)).ReturnsAsync(0);

        await _service.ClearAsync(MASTER, MAP);

        _events.Should().BeEmpty();
    }

    [Fact]
    public async Task Clear_PausedCampaign_Is409()
    {
        _campaign.Status = CampaignStatus.Paused;

        var act = () => _service.ClearAsync(MASTER, MAP);

        await act.Should().ThrowAsync<ConflictException>();
        _repository.Verify(r => r.ClearAsync(It.IsAny<long>()), Times.Never);
    }

    // ---- audience ----

    [Fact]
    public void PaintEvent_GoesToWhoIsOnTheMap()
    {
        var tableEvent = TableEvents.Create(TableEventType.MAP_PAINT_CHANGED, 10, MASTER, MAP);

        TableEventAudience.For(tableEvent).Should().Be(TableEventAudienceKind.Map);
    }
}
