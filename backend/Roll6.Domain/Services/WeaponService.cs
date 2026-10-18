using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.Domain.Weapons;
using Roll6.DTO.Common;
using Roll6.DTO.Realtime;
using Roll6.DTO.Weapon;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// The weapon library (082). A weapon is a .glb uploaded through <c>POST /api/model</c> plus a name, and since 083 its
/// grip point and standard pose; tokens carry it in their sockets (<c>token_weapons</c>). Replacing the file, the grip
/// point or the pose keeps the weapon's id, so every token carrying it shows the change, and the campaigns with such a
/// piece are told to reload their pieces. A weapon carried by any token cannot be deleted. Stored files are write-once
/// and never deleted (the same name may be referenced elsewhere, as with token models).
/// </summary>
public class WeaponService : IWeaponService
{
    public const string IN_USE = "Esta arma está em uso por um ou mais tokens.";
    public const string NOT_FOUND = "Arma não encontrada.";

    private readonly IWeaponRepository<Weapon> _repository;
    private readonly ITokenWeaponRepository<TokenWeapon> _tokenWeaponRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly IUserRepository<User> _userRepository;
    private readonly IImageStorageAppService _imageStorage;
    private readonly IRealtimeNotifier _notifier;

    public WeaponService(
        IWeaponRepository<Weapon> repository,
        ITokenWeaponRepository<TokenWeapon> tokenWeaponRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        IUserRepository<User> userRepository,
        IImageStorageAppService imageStorage,
        IRealtimeNotifier notifier)
    {
        _repository = repository;
        _tokenWeaponRepository = tokenWeaponRepository;
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
        var saved = await _repository.InsertAsync(Weapon.Create(userId, info.Name, info.ModelFile,
            info.GripPoint == null ? null : TokenWeapons.ToGripPoint(info.GripPoint),
            info.Pose == null ? null : TokenWeapons.ToPose(info.Pose)));
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
        // 083: the grip point and the pose are drawn by every token carrying the weapon, like the file.
        var placed = false;
        if (info.GripPoint is not null && TokenWeapons.ToGripPoint(info.GripPoint) != weapon.GripPoint)
        {
            weapon.SetGripPoint(TokenWeapons.ToGripPoint(info.GripPoint));
            placed = true;
        }
        if (info.Pose is not null && TokenWeapons.ToPose(info.Pose).Validate("pose").Normalized() != weapon.Pose)
        {
            weapon.SetPose(TokenWeapons.ToPose(info.Pose));
            placed = true;
        }
        var saved = await _repository.UpdateAsync(weapon);
        if (newFile || placed)
        {
            foreach (var campaignId in await _mapTokenRepository.ListCampaignIdsByWeaponAsync(weaponId))
                await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaignId, userId));
        }
        return MapToDto(saved, await OwnerNamesAsync(new[] { saved.UserId }));
    }

    public async Task DeleteAsync(long userId, long weaponId)
    {
        await GetOwnedAsync(userId, weaponId);
        if (await _tokenWeaponRepository.AnyByWeaponAsync(weaponId))
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
        GripPoint = TokenWeapons.ToInfo(weapon.GripPoint),
        Pose = TokenWeapons.ToInfo(weapon.Pose),
        CreatedAt = weapon.CreatedAt,
        UpdatedAt = weapon.UpdatedAt
    };
}
