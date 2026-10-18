using Roll6.Domain.Animations;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.Domain.Weapons;
using Roll6.DTO.Common;
using Roll6.DTO.Realtime;
using Roll6.DTO.Token;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

public class TokenLibraryService : ITokenLibraryService
{
    private readonly ITokenRepository<Token> _repository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly ICharacterRepository<Character> _characterRepository;
    private readonly INpcRepository<Npc> _npcRepository;
    private readonly IImageStorageAppService _imageStorage;
    private readonly IAnimationRepository<Animation> _animationRepository;
    private readonly ITokenWeaponRepository<TokenWeapon> _tokenWeaponRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IWeaponRepository<Weapon> _weaponRepository;
    private readonly IRealtimeNotifier _notifier;

    public TokenLibraryService(
        ITokenRepository<Token> repository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        ICharacterRepository<Character> characterRepository,
        INpcRepository<Npc> npcRepository,
        IImageStorageAppService imageStorage,
        IAnimationRepository<Animation> animationRepository,
        ITokenWeaponRepository<TokenWeapon> tokenWeaponRepository,
        IUnitOfWork unitOfWork,
        IWeaponRepository<Weapon> weaponRepository,
        IRealtimeNotifier notifier)
    {
        _tokenWeaponRepository = tokenWeaponRepository;
        _unitOfWork = unitOfWork;
        _weaponRepository = weaponRepository;
        _notifier = notifier;
        _animationRepository = animationRepository;
        _npcRepository = npcRepository;
        _characterRepository = characterRepository;
        _repository = repository;
        _mapTokenRepository = mapTokenRepository;
        _imageStorage = imageStorage;
    }

    public async Task<PagedList<TokenInfo>> ListAsync(PageQuery query, long? ownerUserId = null)
    {
        var (items, total) = await _repository.ListPagedAsync(query.Search, query.Skip, query.PageSize, ownerUserId);
        return new PagedList<TokenInfo>
        {
            Items = await MapToDtoAsync(items),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = total
        };
    }

    public async Task<TokenInfo> GetByIdAsync(long tokenId)
    {
        return await MapToDtoAsync(await GetTokenAsync(tokenId));
    }

    public async Task<TokenInfo> CreateAsync(long userId, TokenInsertInfo info)
    {
        var token = new Token { UserId = userId };
        token.Update(info.Name, info.Description, info.UpSpace, info.DownSpace, info.UpImage, info.DownImage);
        token.UpdateSprites(info.FrontImage, info.RightImage, info.LeftImage, info.BackImage);
        token.UpdateModel(info.ModelFile, info.ModelIdleClip, info.ModelWalkClip, info.ModelDownClip, info.ModelScale);
        var weapons = TokenWeaponSet.Parse(info.Weapons, token.ModelFile != null);
        await CheckLibraryAnimationsAsync(token);
        await CheckWeaponsAsync(weapons);
        token.CreatedAt = token.UpdatedAt;
        Token saved = token;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            saved = await _repository.InsertAsync(token);
            if (weapons.Count > 0)
                await _tokenWeaponRepository.ReplaceAsync(saved.TokenId, Rows(saved.TokenId, weapons));
        });
        return await MapToDtoAsync(saved);
    }

    /// <summary>
    /// Saves the token and tells every campaign with a piece of it to reload its pieces (063: the model's size, its file,
    /// animations and images reach the table without a reload).
    /// </summary>
    public async Task<TokenInfo> UpdateAsync(long userId, long tokenId, TokenInsertInfo info)
    {
        var token = await GetOwnedAsync(userId, tokenId);
        token.Update(info.Name, info.Description, info.UpSpace, info.DownSpace, info.UpImage, info.DownImage);
        token.UpdateSprites(info.FrontImage, info.RightImage, info.LeftImage, info.BackImage);
        token.UpdateModel(info.ModelFile, info.ModelIdleClip, info.ModelWalkClip, info.ModelDownClip, info.ModelScale);
        var weapons = TokenWeaponSet.Parse(info.Weapons, token.ModelFile != null);
        await CheckLibraryAnimationsAsync(token);
        await CheckWeaponsAsync(weapons);
        Token updated = token;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            updated = await _repository.UpdateAsync(token);
            await _tokenWeaponRepository.ReplaceAsync(tokenId, Rows(tokenId, weapons));
        });
        var saved = await MapToDtoAsync(updated);
        foreach (var campaignId in await _mapTokenRepository.ListCampaignIdsByTokenAsync(tokenId))
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaignId, userId));
        return saved;
    }

    public async Task DeleteAsync(long userId, long tokenId)
    {
        await GetOwnedAsync(userId, tokenId);
        if (await _mapTokenRepository.ExistsByTokenAsync(tokenId))
            throw new ConflictException("O token está em uso em mapas e não pode ser excluído.");
        if (await _characterRepository.ExistsByTokenAsync(tokenId))
            throw new ConflictException("O token está em uso por personagens e não pode ser excluído.");
        if (await _npcRepository.ExistsByTokenAsync(tokenId))
            throw new ConflictException("O token está em uso por NPCs e não pode ser excluído.");
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _tokenWeaponRepository.DeleteByTokenAsync(tokenId);
            await _repository.DeleteAsync(tokenId);
        });
    }

    /// <summary>
    /// Library animations chosen for the states (059, "animation:{id}") must exist and be of the state's type (Q2):
    /// Parado ← Parado, Caminhando ← Andando, Caído ← Derrotado.
    /// </summary>
    private async Task CheckLibraryAnimationsAsync(Token token)
    {
        var chosen = new[]
            {
                (Field: AnimationStates.IDLE_FIELD, Choice: token.ModelIdleClip),
                (Field: AnimationStates.WALK_FIELD, Choice: token.ModelWalkClip),
                (Field: AnimationStates.DOWN_FIELD, Choice: token.ModelDownClip),
            }
            .Select(state => (state.Field, Id: AnimationStates.ParseChoice(state.Choice)))
            .Where(state => state.Id != null)
            .ToList();
        if (chosen.Count == 0)
            return;
        var animations = (await _animationRepository.ListByIdsAsync(chosen.Select(state => state.Id!.Value)))
            .ToDictionary(animation => animation.AnimationId);
        foreach (var (field, id) in chosen)
        {
            if (!animations.TryGetValue(id!.Value, out var animation))
                throw new DomainValidationException(field, AnimationService.NOT_FOUND);
            var expected = AnimationStates.TypeFor(field);
            if (animation.AnimationType != expected)
                throw new DomainValidationException(field,
                    $"Esta animação é do tipo {AnimationStates.TypeLabel(animation.AnimationType)}; o estado "
                    + $"{AnimationStates.StateLabel(field)} aceita só animações do tipo {AnimationStates.TypeLabel(expected)}.");
        }
    }

    /// <summary>The weapons chosen for the sockets (083) must exist; the same weapon may be in several sockets.</summary>
    private async Task CheckWeaponsAsync(IReadOnlyList<TokenWeaponEntry> weapons)
    {
        var ids = TokenWeaponSet.WeaponIds(weapons);
        if (ids.Count == 0)
            return;
        var found = (await _weaponRepository.ListByIdsAsync(ids)).Select(weapon => weapon.WeaponId).ToHashSet();
        for (var i = 0; i < weapons.Count; i++)
        {
            if (!found.Contains(weapons[i].WeaponId))
                throw new DomainValidationException($"weapons[{i}].weaponId", WeaponService.NOT_FOUND);
        }
    }

    private static IEnumerable<TokenWeapon> Rows(long tokenId, IEnumerable<TokenWeaponEntry> weapons) =>
        weapons.Select(entry => TokenWeapon.Create(tokenId, entry.Socket, entry.WeaponId, entry.Grip));

    private async Task<Token> GetTokenAsync(long tokenId)
    {
        return await _repository.GetByIdAsync(tokenId)
            ?? throw new KeyNotFoundException("Token não encontrado.");
    }

    private async Task<Token> GetOwnedAsync(long userId, long tokenId)
    {
        var token = await GetTokenAsync(tokenId);
        if (token.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono pode alterar ou excluir este token.");
        return token;
    }

    private async Task<TokenInfo> MapToDtoAsync(Token token) => (await MapToDtoAsync(new List<Token> { token })).Single();

    /// <summary>The tokens with the weapons of their sockets (083), loaded in two queries.</summary>
    private async Task<List<TokenInfo>> MapToDtoAsync(List<Token> tokens)
    {
        var rows = tokens.Count == 0
            ? new List<TokenWeapon>()
            : await _tokenWeaponRepository.ListByTokenIdsAsync(tokens.Select(token => token.TokenId));
        var ids = TokenWeapons.IdsOf(rows).ToList();
        var weapons = ids.Count == 0
            ? new Dictionary<long, Weapon>()
            : (await _weaponRepository.ListByIdsAsync(ids)).ToDictionary(weapon => weapon.WeaponId);
        var byToken = rows.ToLookup(row => row.TokenId);
        return tokens.Select(token => MapToDto(token, byToken[token.TokenId], weapons)).ToList();
    }

    private TokenInfo MapToDto(Token token, IEnumerable<TokenWeapon> rows, IReadOnlyDictionary<long, Weapon> weapons) => new()
    {
        TokenId = token.TokenId,
        UserId = token.UserId,
        Name = token.Name,
        Description = token.Description,
        UpSpace = token.UpSpace,
        DownSpace = token.DownSpace,
        UpImage = token.UpImage,
        UpImageUrl = _imageStorage.GetUrl(token.UpImage),
        DownImage = token.DownImage,
        DownImageUrl = _imageStorage.GetUrl(token.DownImage),
        FrontImage = token.FrontImage,
        FrontImageUrl = _imageStorage.GetUrl(token.FrontImage),
        RightImage = token.RightImage,
        RightImageUrl = _imageStorage.GetUrl(token.RightImage),
        LeftImage = token.LeftImage,
        LeftImageUrl = _imageStorage.GetUrl(token.LeftImage),
        BackImage = token.BackImage,
        BackImageUrl = _imageStorage.GetUrl(token.BackImage),
        ModelFile = token.ModelFile,
        ModelFileUrl = _imageStorage.GetUrl(token.ModelFile),
        ModelIdleClip = token.ModelIdleClip,
        ModelWalkClip = token.ModelWalkClip,
        ModelDownClip = token.ModelDownClip,
        ModelScale = token.ModelScale,
        Weapons = TokenWeapons.Read(rows, weapons, _imageStorage.GetUrl),
        CreatedAt = token.CreatedAt,
        UpdatedAt = token.UpdatedAt
    };
}
