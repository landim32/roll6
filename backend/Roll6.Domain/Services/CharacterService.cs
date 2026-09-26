using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.Character;
using Roll6.DTO.Common;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

public class CharacterService : ICharacterService
{
    private readonly ICharacterRepository<Character> _repository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IUserRepository<User> _userRepository;
    private readonly IImageStorageAppService _imageStorage;

    public CharacterService(
        ICharacterRepository<Character> repository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IUnitOfWork unitOfWork,
        IUserRepository<User> userRepository,
        IImageStorageAppService imageStorage)
    {
        _repository = repository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _unitOfWork = unitOfWork;
        _userRepository = userRepository;
        _imageStorage = imageStorage;
    }

    public async Task<List<CharacterInfo>> ListAsync(long userId)
    {
        return (await _repository.ListByUserAsync(userId)).Select(MapToDto).ToList();
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
        return MapToDto(await GetOwnedAsync(userId, characterId));
    }

    public async Task<CharacterInfo> CreateAsync(long userId, CharacterInsertInfo info)
    {
        var character = new Character { UserId = userId };
        character.Update(info.Name, info.Sheet, info.Life, info.Energy, info.Move, info.Image);
        character.CreatedAt = character.UpdatedAt;
        return MapToDto(await _repository.InsertAsync(character));
    }

    public async Task<CharacterInfo> UpdateAsync(long userId, long characterId, CharacterInsertInfo info)
    {
        var character = await GetOwnedAsync(userId, characterId);
        character.Update(info.Name, info.Sheet, info.Life, info.Energy, info.Move, info.Image);
        Character saved = character;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            saved = await _repository.UpdateAsync(character);
            // Lower totals also lower the current values in every campaign (FR-011).
            await _campaignCharacterRepository.ClampVitalsAsync(character.CharacterId, character.Life, character.Energy);
        });
        return MapToDto(saved);
    }

    public async Task DeleteAsync(long userId, long characterId)
    {
        await GetOwnedAsync(userId, characterId);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _campaignCharacterRepository.DeleteByCharacterAsync(characterId);
            await _repository.DeleteAsync(characterId);
        });
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

    private CharacterInfo MapToDto(Character character) => new()
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
        CreatedAt = character.CreatedAt,
        UpdatedAt = character.UpdatedAt
    };
}
