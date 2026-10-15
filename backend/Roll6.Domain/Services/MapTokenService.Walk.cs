using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Models;
using Roll6.DTO.MapToken;

namespace Roll6.Domain.Services;

/// <summary>
/// The shared free-mode walk (069): a player walks his own standing character in the 3D view and the piece follows hex by
/// hex for everyone. Other pieces never stop it — overlapping is allowed while free mode is on — and leaving free mode is
/// refused while pieces share a hex (<see cref="ListOverlapsAsync"/>).
/// </summary>
public partial class MapTokenService
{
    /// <summary>
    /// Whether the user may walk the piece now: on the campaign's current map, in free mode, a Character piece of his own
    /// approved and standing character. The hub asks it before relaying a walk sample; never throws.
    /// </summary>
    public async Task<bool> CanWalkAsync(long userId, long mapTokenId, long campaignId)
    {
        var mapToken = await _repository.GetByIdAsync(mapTokenId);
        if (mapToken?.CampaignCharacterId is not long participationId)
            return false;
        var map = await _mapRepository.GetByIdAsync(mapToken.MapId);
        if (map == null || map.Status == MapStatus.Deleted || map.CampaignId != campaignId)
            return false;
        var campaign = await _campaignRepository.GetByIdAsync(campaignId);
        if (campaign == null || !campaign.FreeMode || campaign.CurrentMapId != map.MapId)
            return false;
        var participation = await _campaignCharacterRepository.GetByIdAsync(participationId);
        if (participation == null || participation.Status != CampaignCharacterStatus.Approved || participation.Posture != Posture.Standing)
            return false;
        var character = await _characterRepository.GetByIdAsync(participation.CharacterId);
        return character?.UserId == userId;
    }

    /// <summary>
    /// A walk position (069, <c>walk: true</c>): only in free mode, on the current map, for the caller's own standing
    /// character — the master too must own it. The shape must be inside the grid; other pieces are ignored. No turn entry
    /// and no Deslocamento, like every free-mode move.
    /// </summary>
    private async Task<MapTokenInfo> WalkAsync(long userId, MapToken mapToken, MapTokenPositionInfo info)
    {
        var map = await _mapRepository.GetByIdAsync(mapToken.MapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        var campaign = await EnsureMapEditableAsync(map, userId);
        if (!campaign.FreeMode)
            throw new ConflictException("Só é possível andar no modo livre.");
        if (campaign.CurrentMapId != map.MapId)
            throw new ConflictException("Só é possível andar no mapa atual da campanha.");

        var participation = mapToken.CampaignCharacterId is long participationId
            ? await _campaignCharacterRepository.GetByIdAsync(participationId)
            : null;
        var character = participation != null ? await _characterRepository.GetByIdAsync(participation.CharacterId) : null;
        if (participation == null || participation.Status != CampaignCharacterStatus.Approved || character?.UserId != userId)
            throw new UnauthorizedAccessException("Você só pode andar com os seus personagens.");
        if (participation.Posture != Posture.Standing)
            throw new ConflictException("Um personagem caído não anda.");

        var look = info.Look ?? mapToken.Look;
        var layout = await _occupancy.LoadAsync(map);
        layout.EnsureInside(info.X, info.Y, look, layout.SpaceOf(mapToken));

        mapToken.MoveTo(info.X, info.Y);
        mapToken.Face(look);
        // The exact point inside the hex, so the 3D view never pulls the figure to the middle of it.
        if (info.WalkX is double walkX && info.WalkY is double walkY && info.WalkYaw is double walkYaw)
            mapToken.WalkTo(walkX, walkY, walkYaw);
        return await PublishPieceAsync(map, userId, await MapToDtoAsync(await _repository.UpdateAsync(mapToken)));
    }

    /// <summary>
    /// The groups of pieces sharing a hex on each map of the campaign that is not deleted, by their display names (the
    /// same names the pieces show): what keeps free mode on (069).
    /// </summary>
    public async Task<IReadOnlyList<IReadOnlyList<string>>> ListOverlapsAsync(long campaignId)
    {
        var (maps, _) = await _mapRepository.ListByCampaignPagedAsync(campaignId, 0, int.MaxValue);
        var result = new List<IReadOnlyList<string>>();
        foreach (var map in maps.OrderBy(m => m.MapId))
        {
            var pieces = await _repository.ListByMapAsync(map.MapId) ?? new List<MapToken>();
            if (pieces.Count < 2)
                continue;
            var layout = await _occupancy.LoadAsync(map);
            var groups = layout.Occupancy.Overlaps();
            if (groups.Count == 0)
                continue;
            var names = (await MapToDtoAsync(pieces)).ToDictionary(p => p.MapTokenId, p => p.Name);
            result.AddRange(groups.Select(group => (IReadOnlyList<string>)group.Select(id => names.GetValueOrDefault(id, "?")).ToList()));
        }
        return result;
    }
}
