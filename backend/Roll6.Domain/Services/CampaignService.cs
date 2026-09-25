using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.Campaign;
using Roll6.DTO.Common;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

public class CampaignService : ICampaignService
{
    private readonly ICampaignRepository<Campaign> _repository;
    private readonly IMapRepository<Map> _mapRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IUserRepository<User> _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CampaignService(
        ICampaignRepository<Campaign> repository,
        IMapRepository<Map> mapRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IUserRepository<User> userRepository,
        IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _mapRepository = mapRepository;
        _mapTokenRepository = mapTokenRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<PagedList<CampaignInfo>> ListAsync(PageQuery query, long? ownerUserId = null)
    {
        var (items, total) = await _repository.ListPagedAsync(query.Search, query.Skip, query.PageSize, ownerUserId);
        var owners = await GetOwnerNamesAsync(items);
        return new PagedList<CampaignInfo>
        {
            Items = items.Select(c => MapToDto(c, owners)).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = total
        };
    }

    public async Task<CampaignInfo> GetByIdAsync(long campaignId)
    {
        return await MapToDtoAsync(await GetCampaignAsync(campaignId));
    }

    public async Task<CampaignInfo> CreateAsync(long userId, CampaignInsertInfo info)
    {
        var campaign = new Campaign { UserId = userId };
        campaign.Rename(info.Name);
        campaign.SetOpen(info.Open ?? false);
        campaign.CreatedAt = campaign.UpdatedAt;
        return await MapToDtoAsync(await _repository.InsertAsync(campaign));
    }

    public async Task<CampaignInfo> RenameAsync(long userId, long campaignId, CampaignInsertInfo info)
    {
        var campaign = await GetOwnedAsync(userId, campaignId);
        campaign.Rename(info.Name);
        return await MapToDtoAsync(await _repository.UpdateAsync(campaign));
    }

    public async Task<CampaignInfo> SetOpenAsync(long userId, long campaignId, CampaignOpenInfo info)
    {
        var campaign = await GetOwnedAsync(userId, campaignId);
        campaign.SetOpen(info.Open);
        return await MapToDtoAsync(await _repository.UpdateAsync(campaign));
    }

    public async Task DeleteAsync(long userId, long campaignId)
    {
        await GetOwnedAsync(userId, campaignId);
        if (await _mapRepository.CountNotDeletedByCampaignAsync(campaignId) > 0)
            throw new ConflictException("A campanha possui mapas ativos ou arquivados e não pode ser excluída.");

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            var deletedMapIds = await _mapRepository.ListDeletedIdsByCampaignAsync(campaignId);
            if (deletedMapIds.Count > 0)
            {
                await _mapTokenRepository.DeleteByMapIdsAsync(deletedMapIds);
                await _mapRepository.DeleteRangeAsync(deletedMapIds);
            }
            await _campaignCharacterRepository.DeleteByCampaignAsync(campaignId);
            await _repository.DeleteAsync(campaignId);
        });
    }

    private async Task<Campaign> GetCampaignAsync(long campaignId)
    {
        return await _repository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
    }

    private async Task<Campaign> GetOwnedAsync(long userId, long campaignId)
    {
        var campaign = await GetCampaignAsync(campaignId);
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o mestre pode alterar ou excluir esta campanha.");
        return campaign;
    }

    private async Task<Dictionary<long, string>> GetOwnerNamesAsync(IEnumerable<Campaign> campaigns)
    {
        return (await _userRepository.ListByIdsAsync(campaigns.Select(c => c.UserId)))
            .ToDictionary(u => u.UserId, u => u.Name);
    }

    private async Task<CampaignInfo> MapToDtoAsync(Campaign campaign)
    {
        return MapToDto(campaign, await GetOwnerNamesAsync(new[] { campaign }));
    }

    private static CampaignInfo MapToDto(Campaign campaign, IReadOnlyDictionary<long, string> ownerNames) => new()
    {
        CampaignId = campaign.CampaignId,
        UserId = campaign.UserId,
        OwnerName = ownerNames.GetValueOrDefault(campaign.UserId, string.Empty),
        Name = campaign.Name,
        Open = campaign.Open,
        CreatedAt = campaign.CreatedAt,
        UpdatedAt = campaign.UpdatedAt
    };
}
