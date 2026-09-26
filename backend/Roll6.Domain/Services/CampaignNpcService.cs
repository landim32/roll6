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

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var mapNpcIds = await _mapNpcRepository.ListIdsByCampaignAndNpcAsync(campaignNpc.CampaignId, campaignNpc.NpcId);
            if (mapNpcIds.Count > 0)
            {
                await _mapTokenRepository.DeleteByMapNpcIdsAsync(mapNpcIds);
                await _turnRepository.DeleteByMapNpcIdsAsync(mapNpcIds);
                await _mapNpcRepository.DeleteRangeAsync(mapNpcIds);
            }
            await _repository.DeleteAsync(campaignNpc.CampaignNpcId);
        });
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_NPCS_CHANGED, campaignNpc.CampaignId, userId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaignNpc.CampaignId, userId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_CHANGED, campaignNpc.CampaignId, userId));
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

        return campaignNpcs.Select(c =>
        {
            var npc = npcs.GetValueOrDefault(c.NpcId);
            var token = npc != null ? tokens.GetValueOrDefault(npc.TokenId) : null;
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
                CreatedAt = c.CreatedAt
            };
        }).ToList();
    }
}
