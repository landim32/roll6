using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.DTO.Turn;

namespace Roll6.Tests.Domain.Services;

/// <summary>098: "Agir sobre…" — the target of an action, resolved on the actor's map and stored as a snapshot.</summary>
public partial class TurnServiceTests
{
    private static TurnActInfo ActOn(long piece, int x, int y, long? seen = null, string text = "Ataco") => new()
    {
        MapTokenId = piece, Description = text, Target = new TurnTargetInsertInfo { X = x, Y = y, MapTokenId = seen }
    };

    private void SetupTargetTable()
    {
        var (bram, goblin, ariaPlay, _, goblin1) = Table();
        ariaPlay.Posture = Posture.Down;
        goblin1.Status = "atordoado";
        goblin1.Posture = Posture.Standing;
        _mapTokenRepository.Setup(r => r.GetByIdAsync(GOBLIN_PIECE)).ReturnsAsync(goblin);
        _mapTokenRepository.Setup(r => r.GetByIdAsync(BRAM_PIECE)).ReturnsAsync(bram);
        _mapNpcRepository.Setup(r => r.GetByIdAsync(MAP_NPC)).ReturnsAsync(goblin1);
        _npcRepository.Setup(r => r.GetByIdAsync(NPC)).ReturnsAsync(new Npc { NpcId = NPC, Name = "Goblin", Life = 7, Energy = 2 });
        _campaignCharacterRepository.Setup(r => r.GetByIdAsync(BRAM_PARTICIPATION)).ReturnsAsync(
            new CampaignCharacter { CampaignCharacterId = BRAM_PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = BRAM, Status = CampaignCharacterStatus.Approved, CurrentLife = 12, CurrentEnergy = 5 });
        _characterRepository.Setup(r => r.GetByIdAsync(BRAM)).ReturnsAsync(new Character { CharacterId = BRAM, UserId = MASTER, Name = "Bram", Life = 12, Energy = 6 });
    }

    [Fact]
    public async Task ActOn_EnemyNpc_SnapshotsThePieceAndTheDistance()
    {
        SetupTargetTable();
        Turn? saved = null;
        _repository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).ReturnsAsync((Turn t) => { saved = t; return t; });

        var result = await _service.ActAsync(PLAYER, ActOn(ARIA_PIECE, 6, 6));

        saved!.Target.Should().NotBeNull();
        var target = saved.Target!;
        (target.X, target.Y, target.Distance, target.MapTokenId).Should().Be((6, 6, 3, GOBLIN_PIECE));
        (target.Kind, target.Side, target.Name, target.MapNpcId, target.Look).Should().Be((TurnTarget.KIND_NPC, TurnTarget.SIDE_ENEMY, "Goblin 1", MAP_NPC, 0));
        (target.CurrentLife, target.TotalLife, target.CurrentEnergy, target.TotalEnergy, target.Status, target.Posture).Should().Be((7, 7, 2, 2, "atordoado", 1));
        result.Target!.Text.Should().Be("Goblin 1 (inimigo, NPC) em (6, 6), a 3 hexes, olhando para o Norte, PV 7/7, Fadiga 2/2, status: \"atordoado\"");
        (result.Target.SideLabel, result.Target.KindLabel, result.Target.LookName).Should().Be(("inimigo", "NPC", "Norte"));
    }

    [Fact]
    public async Task ActOn_AllyNpc_And_Character_TakeTheirSides()
    {
        SetupTargetTable();
        _campaignNpcRepository.Setup(r => r.GetAsync(CAMPAIGN, NPC)).ReturnsAsync(new CampaignNpc { CampaignNpcId = 5, CampaignId = CAMPAIGN, NpcId = NPC, Category = NpcCategory.Ally });

        (await _service.ActAsync(PLAYER, ActOn(ARIA_PIECE, 6, 6))).Target!.Side.Should().Be(TurnTarget.SIDE_ALLY);

        var onBram = (await _service.ActAsync(PLAYER, ActOn(ARIA_PIECE, 1, 1))).Target!;
        (onBram.Kind, onBram.Side, onBram.Name, onBram.CharacterId, onBram.MapTokenId).Should().Be((TurnTarget.KIND_CHARACTER, TurnTarget.SIDE_ALLY, "Bram", BRAM, BRAM_PIECE));
        (onBram.CurrentLife, onBram.TotalLife, onBram.CurrentEnergy, onBram.TotalEnergy, onBram.Distance).Should().Be((12, 12, 5, 6, 4));
    }

    [Fact]
    public async Task ActOn_EmptyHex_And_OwnHex()
    {
        SetupTargetTable();

        var empty = (await _service.ActAsync(PLAYER, ActOn(ARIA_PIECE, 9, 2))).Target!;
        (empty.MapTokenId, empty.Kind, empty.Side, empty.Name, empty.Distance).Should().Be((null, null, null, null, 5));
        empty.Text.Should().Be("o hex (9, 2), a 5 hexes");

        var self = (await _service.ActAsync(PLAYER, ActOn(ARIA_PIECE, 4, 4))).Target!;
        (self.Side, self.MapTokenId, self.CharacterId, self.Distance, self.Text).Should().Be((TurnTarget.SIDE_SELF, ARIA_PIECE, ARIA, 0, "si mesmo em (4, 4)"));
    }

    [Fact]
    public async Task ActOn_SeenPiece_MustCoverTheHex_AndOverlapPicksTheTopOne()
    {
        SetupTargetTable();
        await _service.Invoking(s => s.ActAsync(PLAYER, ActOn(ARIA_PIECE, 9, 2, seen: GOBLIN_PIECE)))
            .Should().ThrowAsync<DomainValidationException>().Where(e => e.Errors.ContainsKey("target"));
        (await _service.ActAsync(PLAYER, ActOn(ARIA_PIECE, 6, 6, seen: GOBLIN_PIECE))).Target!.MapTokenId.Should().Be(GOBLIN_PIECE);

        // Free mode overlap: a second goblin lying on the same hex is the one drawn on top (the greatest id).
        var goblin2 = MapToken.PlaceNpc(MAP, 5, MAP_NPC, "Goblin 2", 6, 6, 0);
        goblin2.MapTokenId = GOBLIN_PIECE + 1;
        _mapTokenRepository.Setup(r => r.GetByIdAsync(goblin2.MapTokenId)).ReturnsAsync(goblin2);
        _mapTokenRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapToken>
        {
            _ariaPiece, goblin2, (await _mapTokenRepository.Object.GetByIdAsync(GOBLIN_PIECE))!
        });
        (await _service.ActAsync(PLAYER, ActOn(ARIA_PIECE, 6, 6))).Target!.MapTokenId.Should().Be(goblin2.MapTokenId);
    }

    [Fact]
    public async Task ActOn_OutsideTheGrid_OrWithoutAPiece_Throws400Target()
    {
        SetupTargetTable();
        await _service.Invoking(s => s.ActAsync(PLAYER, ActOn(ARIA_PIECE, 10, 3)))
            .Should().ThrowAsync<DomainValidationException>().Where(e => e.Errors.ContainsKey("target"));
        await _service.Invoking(s => s.ActAsync(PLAYER, new TurnActInfo
        {
            CampaignId = CAMPAIGN, CharacterId = ARIA, Description = "x", Target = new TurnTargetInsertInfo { X = 1, Y = 1 }
        })).Should().ThrowAsync<DomainValidationException>().Where(e => e.Errors.ContainsKey("target"));
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Act_WithoutTarget_IsUnchanged()
    {
        Turn? saved = null;
        _repository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).ReturnsAsync((Turn t) => { saved = t; return t; });
        var result = await _service.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "Defendo" });
        saved!.Target.Should().BeNull();
        result.Target.Should().BeNull();
        _mapModelRepository.Verify(r => r.GetByIdAsync(It.IsAny<long>()), Times.Never);
    }
}
