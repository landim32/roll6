using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.Common;
using Roll6.DTO.Realtime;
using Roll6.DTO.Weapon;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// The weapon library (082). A weapon is a .glb uploaded through <c>POST /api/model</c> plus a name; tokens hold it in a
/// hand (<c>tokens.right_weapon_id</c>/<c>left_weapon_id</c>). Replacing the file keeps the weapon's id, so every token
/// holding it shows the new file, and the campaigns with such a piece are told to reload their pieces. A weapon held by
/// any token cannot be deleted. Stored files are write-once and never deleted (the same name may be referenced elsewhere,
/// as with token models).
/// </summary>
public class WeaponService : IWeaponService
{
    public const string IN_USE = "Esta arma está em uso por um ou mais tokens.";
    public const string NOT_FOUND = "Arma não encontrada.";

    private readonly IWeaponRepository<Weapon> _repository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly IUserRepository<User> _userRepository;
    private readonly IImageStorageAppService _imageStorage;
    private readonly IRealtimeNotifier _notifier;

    public WeaponService(
        IWeaponRepository<Weapon> repository,
        ITokenRepository<Token> tokenRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        IUserRepository<User> userRepository,
        IImageStorageAppService imageStorage,
        IRealtimeNotifier notifier)
    {
        _repository = repository;
        _tokenRepository = tokenRepository;
        _mapTokenRepository = mapTokenRepository;
        _userRepository = userRepository;
        _imageStorage = imageStorage;
        _notifier = notifier;
    }

    public async Task<PagedList<WeaponInfo>> ListAsync(long viewerUserId, PageQuery query, bool mine)
    {
        var (items, total) = await _repository.ListPagedAsync(
            query.Search, query.Skip, query.PageSize, mine ? viewerUserId : null, viewerUserId);
        var owners = await OwnerNamesAsync(items.Select(item => item.UserId));
        return new PagedList<WeaponInfo>
        {
            Items = items.Select(item => MapToDto(item, owners)).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = total
        };
    }

    public async Task<WeaponInfo> GetByIdAsync(long weaponId)
    {
        var weapon = await GetWeaponAsync(weaponId);
        return MapToDto(weapon, await OwnerNamesAsync(new[] { weapon.UserId }));
    }

    public async Task<WeaponInfo> CreateAsync(long userId, WeaponInsertInfo info)
    {
        var saved = await _repository.InsertAsync(Weapon.Create(userId, info.Name, info.ModelFile));
        return MapToDto(saved, await OwnerNamesAsync(new[] { userId }));
    }

    public async Task<WeaponInfo> UpdateAsync(long userId, long weaponId, WeaponUpdateInfo info)
    {
        var weapon = await GetOwnedAsync(userId, weaponId);
        if (info.Name is not null)
            weapon.Rename(info.Name);
        var newFile = info.ModelFile is not null && info.ModelFile != weapon.ModelFile;
        if (newFile)
            weapon.ReplaceFile(info.ModelFile);
        var saved = await _repository.UpdateAsync(weapon);
        if (newFile)
        {
            foreach (var campaignId in await _mapTokenRepository.ListCampaignIdsByWeaponAsync(weaponId))
                await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaignId, userId));
        }
        return MapToDto(saved, await OwnerNamesAsync(new[] { saved.UserId }));
    }

    public async Task DeleteAsync(long userId, long weaponId)
    {
        await GetOwnedAsync(userId, weaponId);
        if (await _tokenRepository.AnyUsesWeaponAsync(weaponId))
            throw new ConflictException(IN_USE);
        await _repository.DeleteAsync(weaponId);
    }

    private async Task<Weapon> GetWeaponAsync(long weaponId) =>
        await _repository.GetByIdAsync(weaponId) ?? throw new KeyNotFoundException(NOT_FOUND);

    private async Task<Weapon> GetOwnedAsync(long userId, long weaponId)
    {
        var weapon = await GetWeaponAsync(weaponId);
        if (!weapon.IsOwnedBy(userId))
            throw new UnauthorizedAccessException("Apenas o dono pode alterar ou excluir esta arma.");
        return weapon;
    }

    private async Task<Dictionary<long, string>> OwnerNamesAsync(IEnumerable<long> userIds)
    {
        var users = await _userRepository.ListByIdsAsync(userIds.Distinct());
        return users.ToDictionary(user => user.UserId, user => user.Name);
    }

    private WeaponInfo MapToDto(Weapon weapon, IReadOnlyDictionary<long, string> owners) => new()
    {
        WeaponId = weapon.WeaponId,
        UserId = weapon.UserId,
        OwnerName = owners.GetValueOrDefault(weapon.UserId),
        Name = weapon.Name,
        ModelFile = weapon.ModelFile,
        ModelFileUrl = _imageStorage.GetUrl(weapon.ModelFile),
        CreatedAt = weapon.CreatedAt,
        UpdatedAt = weapon.UpdatedAt
    };
}
