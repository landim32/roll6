using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.Realtime;
using Roll6.DTO.Turn;

namespace Roll6.Domain.Services;

/// <summary>
/// Turn log administration (030, API and MCP only): the master fixes entries of any turn and sets the turn in
/// progress. Only the log changes — pieces, characters and NPCs stay as they are.
/// </summary>
public partial class TurnService
{
    public async Task<TurnInfo> UpdateAsync(long userId, long turnId, TurnUpdateInfo info)
    {
        var turn = await _repository.GetByIdAsync(turnId)
            ?? throw new KeyNotFoundException("Registro de turno não encontrado.");
        var campaign = await GetMasteredCampaignAsync(userId, turn.CampaignId);

        if (info.TurnNo is int turnNo)
            turn.MoveToTurn(turnNo, campaign.CurrentTurn);
        if (info.MapId is long mapId)
        {
            await EnsureMapInCampaignAsync(mapId, campaign.CampaignId);
            turn.ChangeMap(mapId);
        }
        if (info.Description != null)
            turn.ChangeText(info.Description);
        if (info.BeforeX.HasValue || info.BeforeY.HasValue || info.BeforeLook.HasValue || info.X.HasValue || info.Y.HasValue
            || info.Look.HasValue || info.Moved.HasValue)
            turn.ChangeMovement(info.BeforeX, info.BeforeY, info.BeforeLook, info.X, info.Y, info.Look, info.Moved);
        if (info.Changes != null)
            turn.ChangeChanges(ToChanges(info.Changes));

        var result = (await MapToDtoAsync(new List<Turn> { await _repository.UpdateAsync(turn) })).Single();
        await PublishTurnChangedAsync(campaign.CampaignId, userId);
        return result;
    }

    /// <summary>
    /// Moves the turn in progress to any number ≥ 1. Going forward works like finishing the turn (no pending check);
    /// going back refuses while later turns have entries, unless the caller asks to discard them.
    /// </summary>
    public async Task<TurnSetCurrentResultInfo> SetCurrentAsync(long userId, long campaignId, TurnSetCurrentInfo info)
    {
        var campaign = await GetMasteredCampaignAsync(userId, campaignId);
        var previous = campaign.CurrentTurn;
        if (info.TurnNo < 1)
            throw new DomainValidationException("turnNo", "O turno deve ser maior que zero.");
        var result = new TurnSetCurrentResultInfo { PreviousTurn = previous, TurnNo = info.TurnNo };
        if (info.TurnNo == previous)
            return result;

        if (info.TurnNo > previous)
        {
            campaign.SetCurrentTurn(info.TurnNo);
            await _campaignRepository.UpdateAsync(campaign);
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_FINISHED, campaignId, userId,
                data: new { finishedTurn = info.TurnNo - 1, turnNo = info.TurnNo }));
            return result;
        }

        var laterTurns = await _repository.ListTurnNosAfterAsync(campaignId, info.TurnNo);
        if (laterTurns.Count > 0 && !info.DiscardLaterEntries)
            throw new ConflictException(
                $"Existem registros nos turnos {string.Join(", ", laterTurns)}. Envie discardLaterEntries = true para excluí-los.");

        campaign.SetCurrentTurn(info.TurnNo);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (laterTurns.Count > 0)
                result.DiscardedEntries = await _repository.DeleteAfterTurnAsync(campaignId, info.TurnNo);
            await _campaignRepository.UpdateAsync(campaign);
        });
        await PublishTurnChangedAsync(campaignId, userId);
        return result;
    }

    private static List<TurnChange> ToChanges(IEnumerable<TurnChangeInfo>? changes) =>
        (changes ?? Enumerable.Empty<TurnChangeInfo>()).Select(c => new TurnChange(c.Field, c.Before, c.After)).ToList();

    /// <summary>A narration belongs to the whole turn: no character or NPC.</summary>
    private static void EnsureNoActor(TurnInsertInfo info)
    {
        var field = info.CharacterId.HasValue ? "characterId" : info.NpcId.HasValue ? "npcId" : info.MapNpcId.HasValue ? "mapNpcId" : null;
        if (field != null)
            throw new DomainValidationException(field, "A narração não tem personagem nem NPC.");
    }

    /// <summary>The map must be one of the campaign's (archived and deleted maps included: it is history).</summary>
    private async Task EnsureMapInCampaignAsync(long mapId, long campaignId)
    {
        var map = await _mapRepository.GetByIdAsync(mapId);
        if (map == null || map.CampaignId != campaignId)
            throw new DomainValidationException("mapId", "O mapa não é desta campanha.");
    }

    /// <summary>
    /// The actor of a new entry must belong to the campaign: a character with a participation in it (any status, since
    /// old entries may be about characters who left), an NPC available in it and an occurrence of that NPC on one of
    /// its maps. A missing actor is left to the entry's own validation.
    /// </summary>
    private async Task EnsureActorInCampaignAsync(long campaignId, long? characterId, long? npcId, long? mapNpcId)
    {
        if (characterId is long character && await _campaignCharacterRepository.GetAsync(campaignId, character) == null)
            throw new DomainValidationException("characterId", "O personagem não participa desta campanha.");
        if (npcId is long npc && await _campaignNpcRepository.GetAsync(campaignId, npc) == null)
            throw new DomainValidationException("npcId", "O NPC não está nesta campanha.");
        if (mapNpcId is long occurrenceId)
        {
            var occurrence = await _mapNpcRepository.GetByIdAsync(occurrenceId);
            var map = occurrence == null ? null : await _mapRepository.GetByIdAsync(occurrence.MapId);
            if (occurrence == null || occurrence.NpcId != npcId || map == null || map.CampaignId != campaignId)
                throw new DomainValidationException("mapNpcId", "A ocorrência não é deste NPC nesta campanha.");
        }
    }
}
