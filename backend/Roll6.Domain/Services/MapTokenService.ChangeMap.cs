using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.MapToken;
using Roll6.DTO.Realtime;

namespace Roll6.Domain.Services;

/// <summary>
/// "Mudar de mapa" (111): the master takes a character or NPC piece to another active map of the campaign. The same piece
/// (and, for an NPC, the same instance) moves, to the same hex and facing — or the free hex nearest to it —, so turn
/// entries, the repeated action and every value stay. No Movement is recorded and no Deslocamento is spent.
/// </summary>
public partial class MapTokenService
{
    public async Task<MapTokenMapResultInfo> ChangeMapAsync(long userId, long mapTokenId, MapTokenMapInfo info)
    {
        var piece = await _repository.GetByIdAsync(mapTokenId)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        var origin = await _mapRepository.GetByIdAsync(piece.MapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        origin.EnsureNotDeleted();
        var campaign = await _campaignRepository.GetByIdAsync(origin.CampaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o mestre muda peças de mapa.");
        campaign.EnsureMapEditable(true);
        if (piece.CampaignCharacterId == null && piece.MapNpcId == null)
            throw new DomainValidationException("mapTokenId", "Só personagens e NPCs mudam de mapa.");

        var target = await _mapRepository.GetByIdAsync(info.MapId);
        if (target == null || target.IsDeleted || target.CampaignId != origin.CampaignId)
            throw new KeyNotFoundException("Mapa não encontrado.");
        if (target.MapId == origin.MapId)
            throw new ConflictException("A peça já está neste mapa.");
        if (target.Status == MapStatus.Archived)
            throw new ConflictException("Este mapa está arquivado.");

        return piece.CampaignCharacterId is long participationId
            ? await ChangeCharacterMapAsync(userId, campaign, origin, target, piece, participationId)
            : await ChangeNpcMapAsync(userId, origin, target, piece, piece.MapNpcId!.Value);
    }

    private async Task<MapTokenMapResultInfo> ChangeCharacterMapAsync(long userId, Campaign campaign, Map origin, Map target,
        MapToken piece, long participationId)
    {
        var participation = await _campaignCharacterRepository.GetByIdAsync(participationId)
            ?? throw new KeyNotFoundException("Participação não encontrada.");
        if (participation.CampaignId != campaign.CampaignId || participation.Status != CampaignCharacterStatus.Approved)
            throw new ConflictException("Só personagens aprovados nesta campanha podem ser colocados no mapa.");
        var character = await _characterRepository.GetByIdAsync(participation.CharacterId)
            ?? throw new KeyNotFoundException("Personagem não encontrado.");

        var space = await _occupancy.SpaceOfTokenAsync(piece.TokenId, participation.Posture);
        var (x, y, adjusted) = (await _occupancy.LoadAsync(target)).PlaceNear(piece.X, piece.Y, piece.Look, space);

        piece.MoveToMap(target.MapId, x, y);
        MapToken saved = piece;
        await _unitOfWork.ExecuteInTransactionAsync(async () => saved = await _repository.UpdateAsync(piece));

        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKEN_DELETED, origin.CampaignId, userId, origin.MapId,
            new { mapTokenId = saved.MapTokenId }));
        var dto = await PublishPieceAsync(target, userId, await MapToDtoAsync(saved));
        await PublishCharacterMapAsync(campaign, userId, character.UserId, participation.CampaignCharacterId, target.MapId);
        return new MapTokenMapResultInfo { MapToken = dto, FromMapId = origin.MapId, Adjusted = adjusted };
    }

    private async Task<MapTokenMapResultInfo> ChangeNpcMapAsync(long userId, Map origin, Map target, MapToken piece, long mapNpcId)
    {
        var instance = await _mapNpcRepository.GetByIdAsync(mapNpcId);
        if (instance == null || instance.IsRemoved)
            throw new KeyNotFoundException("NPC do mapa não encontrado.");
        var npc = await _npcRepository.GetByIdAsync(instance.NpcId)
            ?? throw new KeyNotFoundException("NPC não encontrado.");

        var space = await _occupancy.SpaceOfTokenAsync(piece.TokenId, instance.Posture);
        var (x, y, adjusted) = (await _occupancy.LoadAsync(target)).PlaceNear(piece.X, piece.Y, piece.Look, space);

        // 051: the name stays unless another active instance of this NPC on the target map already uses it.
        var namesInUse = (await _mapNpcRepository.ListByMapAsync(target.MapId) ?? new List<MapNpc>())
            .Where(m => m.NpcId == instance.NpcId && m.MapNpcId != instance.MapNpcId)
            .Select(m => m.Name.Trim())
            .ToHashSet();
        var name = namesInUse.Contains(instance.Name.Trim()) ? MapNpc.NextName(npc.Name, namesInUse) : instance.Name;

        instance.MoveToMap(target.MapId, name);
        piece.MoveToMap(target.MapId, x, y, name);
        MapToken saved = piece;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _mapNpcRepository.UpdateAsync(instance);
            saved = await _repository.UpdateAsync(piece);
        });

        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, origin.CampaignId, userId, origin.MapId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, target.CampaignId, userId, target.MapId));
        return new MapTokenMapResultInfo { MapToken = await MapToDtoAsync(saved), FromMapId = origin.MapId, Adjusted = adjusted };
    }
}
