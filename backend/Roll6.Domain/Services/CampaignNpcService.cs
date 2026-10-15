using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.CampaignNpc;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// NPCs available in a campaign: only the master adds (his own NPCs) and removes them; the master and the
/// approved participants list them (players see the NPC cards read-only).
/// </summary>
public class CampaignNpcService : ICampaignNpcService
{
    private readonly ICampaignNpcRepository<CampaignNpc> _repository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly INpcRepository<Npc> _npcRepository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly IMapNpcRepository<MapNpc> _mapNpcRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITurnRepository<Turn> _turnRepository;
    private readonly IImageStorageAppService _imageStorage;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;

    private readonly IRealtimeNotifier _notifier;

    public CampaignNpcService(
        ICampaignNpcRepository<CampaignNpc> repository,
        ICampaignRepository<Campaign> campaignRepository,
        INpcRepository<Npc> npcRepository,
        ITokenRepository<Token> tokenRepository,
        IMapNpcRepository<MapNpc> mapNpcRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        IUnitOfWork unitOfWork,
        IImageStorageAppService imageStorage,
        ITurnRepository<Turn> turnRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IRealtimeNotifier notifier)
    {
        _notifier = notifier;
        _campaignCharacterRepository = campaignCharacterRepository;
        _turnRepository = turnRepository;
        _repository = repository;
        _campaignRepository = campaignRepository;
        _npcRepository = npcRepository;
        _tokenRepository = tokenRepository;
        _mapNpcRepository = mapNpcRepository;
        _mapTokenRepository = mapTokenRepository;
        _unitOfWork = unitOfWork;
        _imageStorage = imageStorage;
    }

    public async Task<List<CampaignNpcInfo>> ListByCampaignAsync(long userId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId && !await _campaignCharacterRepository.HasApprovedCharacterAsync(campaignId, userId))
            throw new UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver os NPCs da campanha.");
        return await MapToDtoAsync(await _repository.ListByCampaignAsync(campaignId));
    }

    public async Task<CampaignNpcInfo> AddAsync(long userId, CampaignNpcInsertInfo info)
    {
        var campaign = await GetMasteredAsync(userId, info.CampaignId);
        var npc = await _npcRepository.GetByIdAsync(info.NpcId)
            ?? throw new KeyNotFoundException("NPC não encontrado.");
        if (npc.UserId != userId)
            throw new UnauthorizedAccessException("Só NPCs da sua biblioteca podem entrar na campanha.");
        if (await _repository.GetAsync(campaign.CampaignId, npc.NpcId) != null)
            throw new ConflictException("O NPC já está nesta campanha.");

        var saved = await _repository.InsertAsync(CampaignNpc.Create(campaign.CampaignId, npc.NpcId));
        var result = (await MapToDtoAsync(new List<CampaignNpc> { saved })).Single();
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_NPCS_CHANGED, campaign.CampaignId, userId));
        return result;
    }

    /// <summary>Removes the NPC from the campaign together with its occurrences (and their pieces) on the campaign's maps.</summary>
    public async Task RemoveAsync(long userId, long campaignNpcId)
    {
        var campaignNpc = await _repository.GetByIdAsync(campaignNpcId)
            ?? throw new KeyNotFoundException("NPC da campanha não encontrado.");
        await GetMasteredAsync(userId, campaignNpc.CampaignId);

        // 051: the instances leave the maps but stay named in the turn entries (soft removal).
        var mapNpcIds = await _mapNpcRepository.ListIdsByCampaignAndNpcAsync(campaignNpc.CampaignId, campaignNpc.NpcId);
        var instances = mapNpcIds.Count == 0 ? new List<MapNpc>() : await _mapNpcRepository.ListByIdsAsync(mapNpcIds);
        var now = DateTime.UtcNow;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (mapNpcIds.Count > 0)
                await _mapTokenRepository.DeleteByMapNpcIdsAsync(mapNpcIds);
            foreach (var instance in instances)
            {
                if (instance.Remove(now))
                    await _mapNpcRepository.UpdateAsync(instance);
            }
            await _repository.DeleteAsync(campaignNpc.CampaignNpcId);
        });
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_NPCS_CHANGED, campaignNpc.CampaignId, userId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaignNpc.CampaignId, userId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_CHANGED, campaignNpc.CampaignId, userId));
    }

    /// <summary>
    /// Category and master of the NPC in the campaign (071): master only, in any campaign status. Only an ally may have a
    /// master, an approved participation of this campaign; any other category clears it.
    /// </summary>
    public async Task<CampaignNpcInfo> UpdateAsync(long userId, long campaignNpcId, CampaignNpcUpdateInfo info)
    {
        var campaignNpc = await _repository.GetByIdAsync(campaignNpcId)
            ?? throw new KeyNotFoundException("NPC da campanha não encontrado.");
        await GetMasteredAsync(userId, campaignNpc.CampaignId);
        CampaignCharacter? master = null;
        if (info.MasterCampaignCharacterId is long masterId)
        {
            master = await _campaignCharacterRepository.GetByIdAsync(masterId)
                ?? throw new DomainValidationException("masterCampaignCharacterId", "O personagem-mestre precisa estar aprovado nesta campanha.");
        }
        if (campaignNpc.Classify(info.Category, master))
        {
            campaignNpc = await _repository.UpdateAsync(campaignNpc);
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_NPCS_CHANGED, campaignNpc.CampaignId, userId));
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaignNpc.CampaignId, userId));
        }
        return (await MapToDtoAsync(new List<CampaignNpc> { campaignNpc })).Single();
    }

    private async Task<Campaign> GetMasteredAsync(long userId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o mestre da campanha pode gerenciar os NPCs dela.");
        return campaign;
    }

    /// <summary>Loads NPCs and tokens in batch.</summary>
    private async Task<List<CampaignNpcInfo>> MapToDtoAsync(List<CampaignNpc> campaignNpcs)
    {
        if (campaignNpcs.Count == 0)
            return new List<CampaignNpcInfo>();

        var npcs = (await _npcRepository.ListByIdsAsync(campaignNpcs.Select(c => c.NpcId))).ToDictionary(n => n.NpcId);
        var tokens = (await _tokenRepository.ListByIdsAsync(npcs.Values.Select(n => n.TokenId).Distinct())).ToDictionary(t => t.TokenId);
        // 051: how many pieces "Retirar da campanha" would remove (all the campaign NPCs are of one campaign).
        var counts = await _mapNpcRepository.CountByCampaignAsync(campaignNpcs[0].CampaignId);
        // 071: an ally's master shows only while its participation is approved.
        var masterIds = campaignNpcs.Where(c => c.MasterCampaignCharacterId != null).Select(c => c.MasterCampaignCharacterId!.Value).Distinct().ToList();
        var masters = masterIds.Count == 0
            ? new Dictionary<long, CampaignCharacter>()
            : (await _campaignCharacterRepository.ListByIdsAsync(masterIds) ?? new List<CampaignCharacter>())
                .Where(p => p.Status == CampaignCharacterStatus.Approved)
                .ToDictionary(p => p.CampaignCharacterId);

        return campaignNpcs.Select(c =>
        {
            var npc = npcs.GetValueOrDefault(c.NpcId);
            var token = npc != null ? tokens.GetValueOrDefault(npc.TokenId) : null;
            var master = c.Category == NpcCategory.Ally && c.MasterCampaignCharacterId is long masterId ? masters.GetValueOrDefault(masterId) : null;
            return new CampaignNpcInfo
            {
                CampaignNpcId = c.CampaignNpcId,
                CampaignId = c.CampaignId,
                NpcId = c.NpcId,
                Name = npc?.Name ?? string.Empty,
                TokenId = npc?.TokenId ?? 0,
                TokenImageUrl = _imageStorage.GetUrl(token?.UpImage),
                ImageUrl = _imageStorage.GetUrl(npc?.Image),
                Life = npc?.Life ?? 0,
                Energy = npc?.Energy ?? 0,
                Move = npc?.Move ?? 0,
                MapNpcCount = counts.GetValueOrDefault(c.NpcId),
                Category = (int)c.Category,
                MasterCampaignCharacterId = master?.CampaignCharacterId,
                MasterCharacterId = master?.CharacterId,
                CreatedAt = c.CreatedAt
            };
        }).ToList();
    }
}
