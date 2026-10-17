using Roll6.Domain.Models;
using Roll6.DTO.Weapon;

namespace Roll6.Domain.Weapons;

/// <summary>
/// The weapons in a token's hands (082) between the DTOs and the model: the token form and the MCP write
/// <c>{ weaponId, grip? }</c> per hand; the token and its pieces read the weapon's name, file URL and the grip (the
/// default filled in).
/// </summary>
public static class TokenWeapons
{
    public static TokenHand? ToHand(TokenWeaponInfo? info) =>
        info == null ? null : new TokenHand(info.WeaponId, ToGrip(info.Grip));

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

    /// <summary>The weapon ids a set of tokens holds (both hands), each once.</summary>
    public static IEnumerable<long> IdsOf(IEnumerable<Token?> tokens) => tokens
        .SelectMany(token => new[] { token?.RightWeaponId, token?.LeftWeaponId })
        .Where(id => id.HasValue)
        .Select(id => id!.Value)
        .Distinct();

    /// <summary>The read DTO of one hand; null when the hand is empty or its weapon no longer exists.</summary>
    public static TokenWeaponInfo? Read(long? weaponId, string? gripJson, IReadOnlyDictionary<long, Weapon> weapons,
        Func<string?, string?> urlOf)
    {
        if (weaponId is not { } id || !weapons.TryGetValue(id, out var weapon))
            return null;
        return new TokenWeaponInfo
        {
            WeaponId = weapon.WeaponId,
            Name = weapon.Name,
            ModelFile = weapon.ModelFile,
            ModelFileUrl = urlOf(weapon.ModelFile),
            Grip = ToInfo(WeaponGrip.FromJson(gripJson) ?? WeaponGrip.Default)
        };
    }
}
