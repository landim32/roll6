using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.DTO.Realtime;
using Roll6.DTO.Turn;

namespace Roll6.Tests.Domain.Services;

/// <summary>108: one turn played on several maps (same fixture as the turn tests).</summary>
public partial class TurnServiceTests
{
    private const long CELLAR = 31;
    private const long EMPTY_MAP = 33;
    private const long CELLAR_NPC = 92;
    private const long RAT_PIECE = 46;
    private const long LONE_NPC = 93;

    /// <summary>
    /// Aria and the goblin on "Taverna" (10×10), Bram and a rat on "Porão" (5×5), and a dragon alone on a map with no character.
    /// </summary>
    private (MapToken Bram, MapToken Goblin, MapToken Rat) SplitTable()
    {
        var (bram, goblin, _, _, _) = Table();
        _mapRepository.Setup(r => r.GetByIdAsync(CELLAR)).ReturnsAsync(new Map { MapId = CELLAR, CampaignId = CAMPAIGN, MapModelId = 51, UserId = MASTER, Name = "Porão", Status = MapStatus.Active });
        _mapRepository.Setup(r => r.GetByIdAsync(EMPTY_MAP)).ReturnsAsync(new Map { MapId = EMPTY_MAP, CampaignId = CAMPAIGN, MapModelId = 50, UserId = MASTER, Name = "Covil", Status = MapStatus.Active });
        _mapModelRepository.Setup(r => r.GetByIdAsync(51)).ReturnsAsync(new MapModel { MapModelId = 51, GridWidth = 5, GridHeight = 5 });
        bram.MapId = CELLAR;

        var rat = MapToken.PlaceNpc(CELLAR, 5, CELLAR_NPC, "Rato", 3, 3, 0);
        rat.MapTokenId = RAT_PIECE;
        var dragon = MapToken.PlaceNpc(EMPTY_MAP, 5, LONE_NPC, "Dragão", 2, 2, 0);
        dragon.MapTokenId = 47;
        _tablePieces.AddRange(new[] { rat, dragon });
        _tableOccurrences.Add(new MapNpc { MapNpcId = CELLAR_NPC, MapId = CELLAR, NpcId = NPC, Name = "Rato", CurrentLife = 2 });
        _tableOccurrences.Add(new MapNpc { MapNpcId = LONE_NPC, MapId = EMPTY_MAP, NpcId = NPC, Name = "Dragão", CurrentLife = 50 });
        return (bram, goblin, rat);
    }

    // ---- turn data ----

    [Fact]
    public async Task Data_SplitParty_ListsEveryMapByName_AndNoSingleMap()
    {
        SplitTable();

        var data = await _service.GetDataAsync(MASTER, CAMPAIGN, null);

        data.MapId.Should().BeNull();
        data.Maps.Select(m => (m.MapId, m.Name)).Should().Equal((CELLAR, "Porão"), (MAP, "Taverna"));
    }

    [Fact]
    public async Task Data_SplitParty_EachCharacterCarriesItsMap()
    {
        SplitTable();

        var data = await _service.GetDataAsync(MASTER, CAMPAIGN, null);

        data.Characters.Select(c => (c.Name, c.MapId)).Should().Equal(("Aria", (long?)MAP), ("Bram", (long?)CELLAR));
    }

    [Fact]
    public async Task Data_SplitParty_BringsTheNpcsOfTheMapsWithCharactersOnly()
    {
        SplitTable();

        var data = await _service.GetDataAsync(MASTER, CAMPAIGN, null);

        data.Npcs.Select(n => (n.Name, n.MapId)).Should().Equal(("Goblin 1", MAP), ("Rato", CELLAR));
    }

    [Fact]
    public async Task Data_CharacterOffEveryMap_HasNoMapNorPosition()
    {
        var (bram, _, _) = SplitTable();
        _tablePieces.Remove(bram);

        var data = await _service.GetDataAsync(MASTER, CAMPAIGN, null);

        var character = data.Characters.Single(c => c.Name == "Bram");
        (character.MapId, character.MapTokenId, character.X, character.Y, character.LookName)
            .Should().Be(((long?)null, (long?)null, (int?)null, (int?)null, (string?)null));
        data.MapId.Should().Be(MAP);
    }

    [Fact]
    public async Task Data_NobodyOnAMap_HasNoMaps()
    {
        Table();
        _tablePieces.Clear();

        var data = await _service.GetDataAsync(MASTER, CAMPAIGN, null);

        data.MapId.Should().BeNull();
        data.Maps.Should().BeEmpty();
        data.Npcs.Should().BeEmpty();
        data.Characters.Should().HaveCount(2);
    }

    // ---- processing ----

    private async Task<List<Turn>> ProcessAsync(TurnProcessInfo info)
    {
        var inserted = CaptureInserts();
        await _service.ProcessAsync(MASTER, CAMPAIGN, info);
        return inserted;
    }

    [Fact]
    public async Task Process_SameHexOnTwoMaps_DoesNotCollide()
    {
        var (bram, _, _) = SplitTable();

        await ProcessAsync(new TurnProcessInfo
        {
            Characters = new()
            {
                new TurnProcessCharacterInfo { CharacterId = ARIA, X = 1, Y = 1 },
                new TurnProcessCharacterInfo { CharacterId = BRAM, X = 2, Y = 2 }
            },
            Npcs = new() { new TurnProcessNpcInfo { MapNpcId = MAP_NPC, X = 2, Y = 2 } }
        });

        (_ariaPiece.X, _ariaPiece.Y).Should().Be((1, 1));
        (bram.X, bram.Y).Should().Be((2, 2));
    }

    [Fact]
    public async Task Process_TwoPiecesOnOneHexOfTheSameMap_IsRefused()
    {
        var (bram, _, _) = SplitTable();

        var act = () => _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo
        {
            Characters = new() { new TurnProcessCharacterInfo { CharacterId = BRAM, X = 3, Y = 3 } }
        });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("characters[0].x");
        (bram.X, bram.Y).Should().Be((1, 1));
    }

    [Fact]
    public async Task Process_PiecesMaySwapHexesOnEachMap()
    {
        var (bram, _, rat) = SplitTable();

        await ProcessAsync(new TurnProcessInfo
        {
            Characters = new() { new TurnProcessCharacterInfo { CharacterId = BRAM, X = 3, Y = 3 } },
            Npcs = new() { new TurnProcessNpcInfo { MapNpcId = CELLAR_NPC, X = 1, Y = 1 } }
        });

        (bram.X, bram.Y, rat.X, rat.Y).Should().Be((3, 3, 1, 1));
    }

    [Fact]
    public async Task Process_ChecksEachPieceAgainstTheGridOfItsOwnMap()
    {
        SplitTable();

        var act = () => _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo
        {
            Characters = new()
            {
                new TurnProcessCharacterInfo { CharacterId = ARIA, X = 8, Y = 8 },
                new TurnProcessCharacterInfo { CharacterId = BRAM, X = 8, Y = 8 }
            }
        });

        var errors = (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors;
        errors.Should().ContainKey("characters[1].x").And.NotContainKey("characters[0].x");
    }

    [Fact]
    public async Task Process_EachRecordCarriesItsActorsMap_AndTheTableRecordsNone()
    {
        SplitTable();

        var inserted = await ProcessAsync(new TurnProcessInfo
        {
            Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, CurrentLife = 3 } },
            Npcs = new() { new TurnProcessNpcInfo { MapNpcId = CELLAR_NPC, CurrentLife = 1, X = 2, Y = 3 } },
            Narration = "O rato foge."
        });

        inserted.Where(t => t.TurnType == TurnType.CharacterUpdate).Select(t => t.MapId).Should().Equal(MAP, CELLAR);
        inserted.Single(t => t.TurnType == TurnType.Movement).MapId.Should().Be(CELLAR);
        inserted.Single(t => t.TurnType == TurnType.Narration).MapId.Should().BeNull();
        inserted.Single(t => t.TurnType == TurnType.TurnFinished).MapId.Should().BeNull();
    }

    [Fact]
    public async Task Process_MovingACharacterOffEveryMap_IsRefused()
    {
        var (bram, _, _) = SplitTable();
        _tablePieces.Remove(bram);

        var act = () => _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo
        {
            Characters = new() { new TurnProcessCharacterInfo { CharacterId = BRAM, X = 2, Y = 2 } }
        });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors["characters[0].x"]
            .Should().Equal("O personagem não está em um mapa.");
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Process_CharacterOffEveryMap_MayStillChangeItsValues()
    {
        var (bram, _, _) = SplitTable();
        _tablePieces.Remove(bram);

        var inserted = await ProcessAsync(new TurnProcessInfo
        {
            Characters = new() { new TurnProcessCharacterInfo { CharacterId = BRAM, CurrentLife = 1 } }
        });

        inserted.Single(t => t.TurnType == TurnType.CharacterUpdate).MapId.Should().BeNull();
    }

    [Fact]
    public async Task Process_NpcOnAMapWithoutCharacters_IsRefused()
    {
        SplitTable();

        var act = () => _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo
        {
            Npcs = new() { new TurnProcessNpcInfo { MapNpcId = LONE_NPC, CurrentLife = 1 } }
        });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors["npcs[0].mapNpcId"]
            .Should().Equal("O NPC não está em um mapa com personagens.");
    }

    // ---- reset after a transfer ----

    [Fact]
    public async Task Reset_AfterBeingTaken_DoesNotBringThePieceBack()
    {
        SplitTable();
        _ariaPiece.TransferTo(CELLAR, 5, "Aria", 2, 2);
        _repository.Setup(r => r.ListByActorTurnAsync(CAMPAIGN, 3, ARIA, null))
            .ReturnsAsync(new List<Turn> { Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, (4, 5, 3), (4, 4, 0)) });

        var result = await _service.ResetAsync(PLAYER, new TurnPieceInfo { MapTokenId = ARIA_PIECE });

        result.Reverted.Should().BeFalse();
        (_ariaPiece.MapId, _ariaPiece.X, _ariaPiece.Y).Should().Be((CELLAR, 2, 2));
        _mapTokenRepository.Verify(r => r.UpdateAsync(It.IsAny<MapToken>()), Times.Never);
    }

    // ---- summary ----

    private void NamesOfSplitTable() =>
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignCharacterId = PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved },
            new() { CampaignCharacterId = BRAM_PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = BRAM, Status = CampaignCharacterStatus.Approved }
        });

    [Fact]
    public async Task Summary_SplitParty_SeparatesThePositionsByMap()
    {
        SplitTable();
        NamesOfSplitTable();

        var summary = await _service.GetSummaryAsync(MASTER, CAMPAIGN, null);

        summary.Markdown.Should().Contain("### Porão\n- Bram (User 1) - (1, 1) - Norte\n");
        summary.Markdown.Should().Contain("### Taverna\n- Aria (User 2) - (4, 4) - Norte\n");
        summary.Markdown.IndexOf("### Porão").Should().BeLessThan(summary.Markdown.IndexOf("### Taverna"));
    }

    [Fact]
    public async Task Summary_LeavesOutMapsWithoutCharactersThatTheTurnDidNotTouch()
    {
        SplitTable();
        NamesOfSplitTable();

        (await _service.GetSummaryAsync(MASTER, CAMPAIGN, null)).Markdown.Should().NotContain("Covil");
    }

    [Fact]
    public async Task Summary_ShowsAMapWithoutCharactersThatTheTurnTouched()
    {
        SplitTable();
        NamesOfSplitTable();
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(new List<Turn>
        {
            Turn.Action(CAMPAIGN, EMPTY_MAP, null, NPC, LONE_NPC, 3, MASTER, "Ruge")
        });

        (await _service.GetSummaryAsync(MASTER, CAMPAIGN, null)).Markdown.Should().Contain("### Covil\n");
    }

    [Fact]
    public async Task Summary_FinishedTurn_ALastMoveOnAnotherMap_KeepsTheCurrentPosition()
    {
        SplitTable();
        NamesOfSplitTable();
        _ariaPiece.TransferTo(CELLAR, 5, "Aria", 2, 2);
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 2)).ReturnsAsync(new List<Turn>());
        _repository.Setup(r => r.ListLastMovementsAsync(CAMPAIGN, 2)).ReturnsAsync(new List<Turn>
        {
            Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 2, PLAYER, (1, 1, 0), (1, 2, 3))
        });

        (await _service.GetSummaryAsync(MASTER, CAMPAIGN, 2)).Markdown.Should().Contain("- Aria (User 2) - (2, 2) - Norte");
    }

    // ---- what stands on a map, and what does not ----

    [Fact]
    public async Task Repeat_AppliesOnTheMapOfEachCharacter()
    {
        var (bram, _, _) = SplitTable();
        var inserted = CaptureInserts();
        _campaignCharacterRepository.Setup(r => r.ListRepeatingAsync(CAMPAIGN)).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignCharacterId = PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = ARIA, RepeatedAction = "Ataco", RepeatedActionUserId = PLAYER },
            new() { CampaignCharacterId = BRAM_PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = BRAM, RepeatedAction = "Vigio", RepeatedActionUserId = MASTER },
            new() { CampaignCharacterId = 999, CampaignId = CAMPAIGN, CharacterId = 5000, RepeatedAction = "Espero", RepeatedActionUserId = PLAYER }
        });

        await _service.FinishAsync(MASTER, CAMPAIGN, new TurnFinishInfo { Force = true });

        inserted.Where(t => t.TurnType == TurnType.Action).Select(t => (t.CharacterId, t.MapId)).Should()
            .Equal(((long?)ARIA, (long?)MAP), ((long?)BRAM, (long?)bram.MapId), ((long?)5000, (long?)null));
    }

    [Fact]
    public async Task Finish_TheDividerHasNoMap()
    {
        SplitTable();
        var inserted = CaptureInserts();

        await _service.FinishAsync(MASTER, CAMPAIGN, new TurnFinishInfo { Force = true });

        inserted.Single(t => t.TurnType == TurnType.TurnFinished).MapId.Should().BeNull();
    }

    [Fact]
    public async Task ActionByPiece_CarriesThePiecesMap()
    {
        SplitTable();
        _ariaPiece.TransferTo(CELLAR, 5, "Aria", 2, 2);

        var result = await _service.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "Desce" });

        result.MapId.Should().Be(CELLAR);
    }
}
