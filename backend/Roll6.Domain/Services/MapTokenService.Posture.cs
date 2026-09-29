using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.MapToken;
using Roll6.DTO.Realtime;

namespace Roll6.Domain.Services;

public partial class MapTokenService
{
    /// <summary>
    /// Standing, down or out of combat (031), from the piece menu. A character's posture belongs to its participation
    /// (every piece of it in the campaign shows it) and may be changed by its owner or the master; an NPC's belongs to
    /// the occurrence and only the master changes it. Objects have none. Never refused for lack of space: a piece that
    /// lies down over another one stays like that until it moves. The change is recorded in the turn like the other
    /// character/NPC changes (024).
    /// </summary>
    public async Task<MapTokenInfo> SetPostureAsync(long userId, long mapTokenId, MapTokenPostureInfo info)
    {
        var mapToken = await _repository.GetByIdAsync(mapTokenId)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        var map = await _mapRepository.GetByIdAsync(mapToken.MapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        if (mapToken.CampaignCharacterId is long participationId)
            await SetCharacterPostureAsync(userId, map, participationId, info.Posture);
        else if (mapToken.MapNpcId is long mapNpcId)
            await SetNpcPostureAsync(userId, map, mapToken, mapNpcId, info.Posture);
        else
            throw new DomainValidationException("posture", "Objetos não têm postura.");
        return await MapToDtoAsync(mapToken);
    }

    private async Task SetCharacterPostureAsync(long userId, Map map, long participationId, int posture)
    {
        var participation = await _campaignCharacterRepository.GetByIdAsync(participationId)
            ?? throw new KeyNotFoundException("Participação não encontrada.");
        var character = await _characterRepository.GetByIdAsync(participation.CharacterId)
            ?? throw new KeyNotFoundException("Personagem não encontrado.");
        if (character.UserId != userId && map.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono do personagem ou o mestre da campanha podem alterar a postura.");

        var before = participation.Posture;
        if (!participation.ChangePosture(posture))
            return;
        var campaign = await _campaignRepository.GetByIdAsync(map.CampaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        var turn = Turn.CharacterUpdate(campaign.CampaignId, map.MapId, character.CharacterId, null, null, campaign.CurrentTurn, userId,
            TurnChange.Diff(("posture", (int)before, (int)participation.Posture)));
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _campaignCharacterRepository.UpdateAsync(participation);
            await _turnRepository.InsertAsync(turn);
        });
        // The character may have pieces on other maps of the campaign, and the party cards show the posture.
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.PARTY_CHANGED, map.CampaignId, userId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, map.CampaignId, userId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_CHANGED, map.CampaignId, userId));
    }

    private async Task SetNpcPostureAsync(long userId, Map map, MapToken mapToken, long mapNpcId, int posture)
    {
        if (map.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o mestre da campanha pode alterar a postura dos NPCs.");
        var mapNpc = await _mapNpcRepository.GetByIdAsync(mapNpcId)
            ?? throw new KeyNotFoundException("NPC do mapa não encontrado.");

        var before = mapNpc.Posture;
        if (!mapNpc.ChangePosture(posture))
            return;
        var campaign = await _campaignRepository.GetByIdAsync(map.CampaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        var turn = Turn.CharacterUpdate(campaign.CampaignId, map.MapId, null, mapNpc.NpcId, mapNpc.MapNpcId, campaign.CurrentTurn, userId,
            TurnChange.Diff(("posture", (int)before, (int)mapNpc.Posture)));
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _mapNpcRepository.UpdateAsync(mapNpc);
            await _turnRepository.InsertAsync(turn);
        });
        await PublishPieceAsync(map, userId, await MapToDtoAsync(mapToken));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_CHANGED, map.CampaignId, userId));
    }
}
