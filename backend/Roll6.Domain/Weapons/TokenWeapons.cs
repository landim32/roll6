using Roll6.Domain.Models;
using Roll6.DTO.Weapon;

namespace Roll6.Domain.Weapons;

/// <summary>
/// The weapons in a token's sockets (083) between the DTOs and the rows: the token form and the MCP write
/// <c>{ socket, weaponId, grip? }</c> per socket (parsed by <see cref="TokenWeaponSet"/>); the token and its pieces read
/// the weapon's name, file URL, grip point and pose, plus the grip with the default filled in.
/// </summary>
public static class TokenWeapons
{
    public static WeaponGrip? ToGrip(WeaponGripInfo? info) => info == null ? null : new WeaponGrip
    {
        X = info.X,
        Y = info.Y,
        Z = info.Z,
        Rx = info.Rx,
        Ry = info.Ry,
        Rz = info.Rz,
        Scale = info.Scale
    };

    public static WeaponGripInfo ToInfo(WeaponGrip grip) => new()
    {
        X = grip.X,
        Y = grip.Y,
        Z = grip.Z,
        Rx = grip.Rx,
        Ry = grip.Ry,
        Rz = grip.Rz,
        Scale = grip.Scale
    };

    public static WeaponGripPoint ToGripPoint(WeaponGripPointInfo info) => new(info.X, info.Y, info.Z);

    public static WeaponGripPointInfo ToInfo(WeaponGripPoint point) => new() { X = point.X, Y = point.Y, Z = point.Z };

    public static WeaponPose ToPose(WeaponPoseInfo info) => new(info.Rx, info.Ry, info.Rz);

    public static WeaponPoseInfo ToInfo(WeaponPose pose) => new() { Rx = pose.Rx, Ry = pose.Ry, Rz = pose.Rz };

    /// <summary>The weapon ids a set of rows holds, each once.</summary>
    public static IEnumerable<long> IdsOf(IEnumerable<TokenWeapon> rows) => rows.Select(row => row.WeaponId).Distinct();

    /// <summary>
    /// The read DTOs of a token's rows, ordered by socket; a row whose weapon no longer exists is left out.
    /// </summary>
    public static List<TokenWeaponInfo> Read(IEnumerable<TokenWeapon> rows, IReadOnlyDictionary<long, Weapon> weapons,
        Func<string?, string?> urlOf)
    {
        var result = new List<TokenWeaponInfo>();
        foreach (var row in rows.OrderBy(row => row.Socket))
        {
            if (!weapons.TryGetValue(row.WeaponId, out var weapon))
                continue;
            result.Add(new TokenWeaponInfo
            {
                Socket = (int)row.Socket,
                WeaponId = weapon.WeaponId,
                Name = weapon.Name,
                ModelFile = weapon.ModelFile,
                ModelFileUrl = urlOf(weapon.ModelFile),
                GripPoint = ToInfo(weapon.GripPoint),
                Pose = ToInfo(weapon.Pose),
                Grip = ToInfo(WeaponGrip.FromJson(row.Grip) ?? WeaponGrip.Default)
            });
        }
        return result;
    }
}
