namespace Roll6.Domain.Weapons;

/// <summary>
/// Where a token's 3D model carries a library weapon (083). The five sockets are fixed and found on the model's Mixamo
/// skeleton by the 3D view, each with a standardised frame, so the same socket means the same place on every model:
/// the hands hold the weapon by its grip point with the tip leaving the fist on the thumb side; the back carries it
/// behind the torso, diagonally, with the handle above the right shoulder; a holster hangs it beside the hips, tip down.
/// Mirrored by the frontend's <c>types/weapon.ts</c> (<c>SOCKET</c>).
/// </summary>
public enum WeaponSocket
{
    RightHand = 1,
    LeftHand = 2,
    Back = 3,
    RightHolster = 4,
    LeftHolster = 5
}

public static class WeaponSockets
{
    public static readonly IReadOnlyList<WeaponSocket> All = new[]
    {
        WeaponSocket.RightHand, WeaponSocket.LeftHand, WeaponSocket.Back, WeaponSocket.RightHolster, WeaponSocket.LeftHolster
    };

    public static bool IsKnown(int value) => value >= (int)WeaponSocket.RightHand && value <= (int)WeaponSocket.LeftHolster;
}
