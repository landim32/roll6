using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.Domain.Validation;
using Roll6.DTO.Character;
using Roll6.DTO.Common;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

public class CharacterService : ICharacterService
{
    private readonly ICharacterRepository<Character> _repository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITurnRepository<Turn> _turnRepository;
    private readonly IUserRepository<User> _userRepository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly IImageStorageAppService _imageStorage;
    private readonly ICampaignRepository<Campaign> _campaignRepository;

    private readonly IRealtimeNotifier _notifier;

    public CharacterService(
        ICharacterRepository<Character> repository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IUnitOfWork unitOfWork,
        IUserRepository<User> userRepository,
        ITokenRepository<Token> tokenRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        IImageStorageAppService imageStorage,
        ITurnRepository<Turn> turnRepository,
        ICampaignRepository<Campaign> campaignRepository,
        IRealtimeNotifier notifier)
    {
        _campaignRepository = campaignRepository;
        _notifier = notifier;
        _turnRepository = turnRepository;
        _tokenRepository = tokenRepository;
        _mapTokenRepository = mapTokenRepository;
        _repository = repository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _unitOfWork = unitOfWork;
        _userRepository = userRepository;
        _imageStorage = imageStorage;
    }

    public async Task<List<CharacterInfo>> ListAsync(long userId)
    {
        var characters = await _repository.ListByUserAsync(userId);
        var tokenIds = characters.Where(c => c.TokenId.HasValue).Select(c => c.TokenId!.Value).Distinct().ToList();
        var tokens = tokenIds.Count == 0
            ? new Dictionary<long, Token>()
            : (await _tokenRepository.ListByIdsAsync(tokenIds)).ToDictionary(t => t.TokenId);
        return characters.Select(c => MapToDto(c, c.TokenId.HasValue ? tokens.GetValueOrDefault(c.TokenId.Value) : null)).ToList();
    }

    /// <summary>Characters of every user (public fields only), for the master's invite search.</summary>
    public async Task<PagedList<CharacterSearchInfo>> SearchAsync(PageQuery query)
    {
        var (items, total) = await _repository.ListPagedAsync(query.Search, query.Skip, query.PageSize);
        var owners = items.Count == 0
            ? new Dictionary<long, string>()
            : (await _userRepository.ListByIdsAsync(items.Select(c => c.UserId).Distinct()))
                .ToDictionary(u => u.UserId, u => u.Name);
        return new PagedList<CharacterSearchInfo>
        {
            Items = items.Select(c => new CharacterSearchInfo
            {
                CharacterId = c.CharacterId,
                Name = c.Name,
                ImageUrl = _imageStorage.GetUrl(c.Image),
                OwnerId = c.UserId,
                OwnerName = owners.GetValueOrDefault(c.UserId, string.Empty)
            }).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = total
        };
    }

    public async Task<CharacterInfo> GetByIdAsync(long userId, long characterId)
    {
        var character = await GetOwnedAsync(userId, characterId);
        return MapToDto(character, await GetTokenAsync(character.TokenId));
    }

    public async Task<CharacterInfo> CreateAsync(long userId, CharacterInsertInfo info)
    {
        var token = await GetTokenAsync(info.TokenId);
        var character = new Character { UserId = userId };
        character.Update(info.Name, info.Sheet, info.Life, info.Energy, info.Move, info.Image, info.TokenId);
        character.CreatedAt = character.UpdatedAt;
        return MapToDto(await _repository.InsertAsync(character), token);
    }

    public async Task<CharacterInfo> UpdateAsync(long userId, long characterId, CharacterInsertInfo info)
    {
        var character = await GetOwnedAsync(userId, characterId);
        var token = await GetTokenAsync(info.TokenId);
        character.Update(info.Name, info.Sheet, info.Life, info.Energy, info.Move, info.Image, info.TokenId);
        Character saved = character;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            saved = await _repository.UpdateAsync(character);
            // Lower totals also lower the current values in every campaign (FR-011).
            await _campaignCharacterRepository.ClampVitalsAsync(character.CharacterId, character.Life, character.Energy);
        });
        await PublishToCampaignsAsync(await _campaignCharacterRepository.ListCampaignIdsByCharacterAsync(characterId), userId);
        return MapToDto(saved, token);
    }

    public async Task DeleteAsync(long userId, long characterId)
    {
        await GetOwnedAsync(userId, characterId);
        var campaignIds = await _campaignCharacterRepository.ListCampaignIdsByCharacterAsync(characterId);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _mapTokenRepository.DeleteByCharacterAsync(characterId);
            await _turnRepository.DeleteByCharacterAsync(characterId);
            await _campaignCharacterRepository.DeleteByCharacterAsync(characterId);
            await _repository.DeleteAsync(characterId);
        });
        await PublishToCampaignsAsync(campaignIds, userId);
    }

    /// <summary>
    /// Hands the character to the user with the given e-mail (021). Participations, pieces and turn entries point to
    /// the character, and player permissions are checked against its current owner, so only the owner changes.
    /// </summary>
    public async Task TransferAsync(long userId, long characterId, CharacterTransferInfo info)
    {
        await GetOwnedAsync(userId, characterId);
        var email = Guard.Email(info.Email, "email");
        var receiver = await _userRepository.GetByEmailAsync(email)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");
        if (receiver.UserId == userId)
            throw new DomainValidationException("email", "O personagem já é seu.");

        // Conditional update: a concurrent transfer that got there first makes this one fail.
        if (!await _repository.TransferAsync(characterId, userId, receiver.UserId))
            throw new ConflictException("O personagem já não pertence a você.");

        var campaignIds = await _campaignCharacterRepository.ListCampaignIdsByCharacterAsync(characterId);
        await PublishToCampaignsAsync(campaignIds, userId);
        foreach (var campaignId in campaignIds)
            await RemoveFormerOwnerIfNoAccessAsync(userId, campaignId);
    }

    /// <summary>The former owner stops receiving the events of campaigns they can no longer read (017).</summary>
    private async Task RemoveFormerOwnerIfNoAccessAsync(long userId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId);
        if (campaign == null || campaign.UserId == userId)
            return;
        if (!await _campaignCharacterRepository.HasApprovedCharacterAsync(campaignId, userId))
            await _notifier.RemoveUserFromCampaignAsync(userId, campaignId);
    }

    /// <summary>The character's name, picture, token and totals show in parties and pieces (017).</summary>
    private async Task PublishToCampaignsAsync(IEnumerable<long> campaignIds, long userId)
    {
        foreach (var campaignId in campaignIds)
        {
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.PARTY_CHANGED, campaignId, userId));
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaignId, userId));
        }
    }

    /// <summary>Only the owner reads and changes the character; the master changes only the participation (010 FR-006).</summary>
    private async Task<Character> GetOwnedAsync(long userId, long characterId)
    {
        var character = await _repository.GetByIdAsync(characterId)
            ?? throw new KeyNotFoundException("Personagem não encontrado.");
        if (character.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono pode acessar este personagem.");
        return character;
    }

    /// <summary>The character's token (404 when the informed one does not exist).</summary>
    private async Task<Token?> GetTokenAsync(long? tokenId)
    {
        if (tokenId is not long id)
            return null;
        return await _tokenRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Token não encontrado.");
    }

    private CharacterInfo MapToDto(Character character, Token? token) => new()
    {
        CharacterId = character.CharacterId,
        UserId = character.UserId,
        Name = character.Name,
        Sheet = character.Sheet,
        Life = character.Life,
        Energy = character.Energy,
        Move = character.Move,
        Image = character.Image,
        ImageUrl = _imageStorage.GetUrl(character.Image),
        TokenId = character.TokenId,
        TokenName = token?.Name,
        TokenImageUrl = _imageStorage.GetUrl(token?.UpImage),
        CreatedAt = character.CreatedAt,
        UpdatedAt = character.UpdatedAt
    };
}
