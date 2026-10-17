using Roll6.DTO.Common;
using Roll6.DTO.Weapon;

namespace Roll6.Domain.Interfaces;

/// <summary>The weapon library (082): shared like tokens; only the owner renames, replaces the file or deletes.</summary>
public interface IWeaponService
{
    /// <summary>Every weapon (the viewer's own first), or only the viewer's (<paramref name="mine"/>).</summary>
    Task<PagedList<WeaponInfo>> ListAsync(long viewerUserId, PageQuery query, bool mine);
    Task<WeaponInfo> GetByIdAsync(long weaponId);
    Task<WeaponInfo> CreateAsync(long userId, WeaponInsertInfo info);
    /// <summary>Changes name and/or file (owner only); a new file reaches every campaign with a piece holding the weapon.</summary>
    Task<WeaponInfo> UpdateAsync(long userId, long weaponId, WeaponUpdateInfo info);
    /// <summary>Deletes the weapon (owner only), refused while any token holds it. The stored file is kept.</summary>
    Task DeleteAsync(long userId, long weaponId);
}
