using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.Common;
using Roll6.DTO.Npc;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>NPC library: every NPC is read and changed only by its owner.</summary>
public class NpcService : INpcService
{
    private readonly INpcRepository<Npc> _repository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly ICampaignNpcRepository<CampaignNpc> _campaignNpcRepository;
    private readonly IImageStorageAppService _imageStorage;

    public NpcService(
        INpcRepository<Npc> repository,
        ITokenRepository<Token> tokenRepository,
        ICampaignNpcRepository<CampaignNpc> campaignNpcRepository,
        IImageStorageAppService imageStorage)
    {
        _repository = repository;
        _tokenRepository = tokenRepository;
        _campaignNpcRepository = campaignNpcRepository;
        _imageStorage = imageStorage;
    }

    public async Task<PagedList<NpcInfo>> ListAsync(long userId, PageQuery query)
    {
        var (items, total) = await _repository.ListPagedAsync(query.Search, query.Skip, query.PageSize, userId);
        var tokens = items.Count == 0
            ? new Dictionary<long, Token>()
            : (await _tokenRepository.ListByIdsAsync(items.Select(n => n.TokenId).Distinct())).ToDictionary(t => t.TokenId);
        return new PagedList<NpcInfo>
        {
            Items = items.Select(n => MapToDto(n, tokens.GetValueOrDefault(n.TokenId))).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = total
        };
    }

    public async Task<NpcInfo> GetByIdAsync(long userId, long npcId)
    {
        var npc = await GetOwnedAsync(userId, npcId);
        return MapToDto(npc, await _tokenRepository.GetByIdAsync(npc.TokenId));
    }

    public async Task<NpcInfo> CreateAsync(long userId, NpcInsertInfo info)
    {
        var npc = new Npc { UserId = userId };
        npc.Update(info.TokenId, info.Name, info.Life, info.Energy, info.Move, info.Sheet, info.Image);
        var token = await GetTokenAsync(npc.TokenId);
        npc.CreatedAt = npc.UpdatedAt;
        return MapToDto(await _repository.InsertAsync(npc), token);
    }

    public async Task<NpcInfo> UpdateAsync(long userId, long npcId, NpcInsertInfo info)
    {
        var npc = await GetOwnedAsync(userId, npcId);
        npc.Update(info.TokenId, info.Name, info.Life, info.Energy, info.Move, info.Sheet, info.Image);
        var token = await GetTokenAsync(npc.TokenId);
        return MapToDto(await _repository.UpdateAsync(npc), token);
    }

    public async Task DeleteAsync(long userId, long npcId)
    {
        await GetOwnedAsync(userId, npcId);
        if (await _campaignNpcRepository.ExistsByNpcAsync(npcId))
            throw new ConflictException("O NPC está em uso em campanhas e não pode ser excluído.");
        await _repository.DeleteAsync(npcId);
    }

    private async Task<Npc> GetOwnedAsync(long userId, long npcId)
    {
        var npc = await _repository.GetByIdAsync(npcId)
            ?? throw new KeyNotFoundException("NPC não encontrado.");
        if (npc.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono pode acessar este NPC.");
        return npc;
    }

    private async Task<Token> GetTokenAsync(long tokenId)
    {
        return await _tokenRepository.GetByIdAsync(tokenId)
            ?? throw new KeyNotFoundException("Token não encontrado.");
    }

    private NpcInfo MapToDto(Npc npc, Token? token) => new()
    {
        NpcId = npc.NpcId,
        UserId = npc.UserId,
        TokenId = npc.TokenId,
        TokenName = token?.Name ?? string.Empty,
        TokenImageUrl = _imageStorage.GetUrl(token?.UpImage),
        Name = npc.Name,
        Life = npc.Life,
        Energy = npc.Energy,
        Move = npc.Move,
        Sheet = npc.Sheet,
        Image = npc.Image,
        ImageUrl = _imageStorage.GetUrl(npc.Image),
        CreatedAt = npc.CreatedAt,
        UpdatedAt = npc.UpdatedAt
    };
}
