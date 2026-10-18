using Roll6.Domain.Weapons;

namespace Roll6.Domain.Models;

/// <summary>
/// A library weapon in one socket of a token's 3D model (083, table <c>token_weapons</c>): at most one row per token and
/// socket, the same weapon allowed in several sockets. <see cref="Grip"/> is the <see cref="WeaponGrip"/> as JSON — the
/// size and the optional fine adjustment (position and rotation from the socket's own place), null = default. The rows
/// are replaced as a set whenever the token is saved and deleted before the token (FKs never cascade).
/// </summary>
public class TokenWeapon
{
    public long TokenWeaponId { get; set; }
    public long TokenId { get; set; }
    public WeaponSocket Socket { get; set; }
    public long WeaponId { get; set; }
    public string? Grip { get; set; }

    public static TokenWeapon Create(long tokenId, WeaponSocket socket, long weaponId, WeaponGrip? grip) => new()
    {
        TokenId = tokenId,
        Socket = socket,
        WeaponId = weaponId,
        Grip = grip?.ToJson()
    };
}
