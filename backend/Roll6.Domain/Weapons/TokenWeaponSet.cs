using Roll6.Domain.Exceptions;
using Roll6.DTO.Weapon;

namespace Roll6.Domain.Weapons;

/// <summary>One validated entry of a token's weapon set (083): the socket, the weapon and the grip (null = default).</summary>
public sealed record TokenWeaponEntry(WeaponSocket Socket, long WeaponId, WeaponGrip? Grip);

/// <summary>
/// The weapons a token form or the MCP sends for a token's sockets (083), checked as a whole before anything is saved.
/// Errors are keyed by the entry's position: <c>weapons[i].socket</c>, <c>weapons[i].grip.{field}</c>. Whether each
/// weapon exists is the service's job (<c>weapons[i].weaponId</c>).
/// </summary>
public static class TokenWeaponSet
{
    public const string UNKNOWN_SOCKET = "Encaixe desconhecido.";
    public const string REPEATED_SOCKET = "Cada encaixe recebe uma arma só.";

    /// <summary>
    /// The entries ordered by socket. Without a model the set is empty whatever was sent (the 082 rule: weapons only
    /// mean something on a 3D model), as it is for a null or empty list.
    /// </summary>
    public static IReadOnlyList<TokenWeaponEntry> Parse(IReadOnlyList<TokenWeaponInfo>? items, bool hasModel)
    {
        if (!hasModel || items == null || items.Count == 0)
            return Array.Empty<TokenWeaponEntry>();
        var entries = new List<TokenWeaponEntry>(items.Count);
        var seen = new HashSet<WeaponSocket>();
        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            if (!WeaponSockets.IsKnown(item.Socket))
                throw new DomainValidationException($"weapons[{i}].socket", UNKNOWN_SOCKET);
            var socket = (WeaponSocket)item.Socket;
            if (!seen.Add(socket))
                throw new DomainValidationException($"weapons[{i}].socket", REPEATED_SOCKET);
            var grip = TokenWeapons.ToGrip(item.Grip)?.Validate($"weapons[{i}]");
            entries.Add(new TokenWeaponEntry(socket, item.WeaponId, grip));
        }
        return entries.OrderBy(entry => entry.Socket).ToList();
    }

    /// <summary>The weapons the set refers to, each once.</summary>
    public static IReadOnlyList<long> WeaponIds(IEnumerable<TokenWeaponEntry> entries) =>
        entries.Select(entry => entry.WeaponId).Distinct().ToList();
}
