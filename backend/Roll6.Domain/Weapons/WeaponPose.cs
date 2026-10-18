using Roll6.Domain.Exceptions;

namespace Roll6.Domain.Weapons;

/// <summary>
/// The standard pose of a library weapon (083): the rotation, in whole degrees (Euler XYZ, as three.js applies it), that
/// stands the file's model up with its tip along +Y ("cima"), its edge or attack side along +X ("direita") and its outer
/// face along +Z ("frente"). The editor turns it by 90° buttons and 1° sliders. The 3D view maps those axes onto every
/// socket's frame, so a weapon posed once lands right in any hand, back or holster. Input accepts −360…360 and is stored
/// normalised in 0…359. Mirrored by the frontend's <c>lib/weaponPose.ts</c> — change both together.
/// </summary>
public sealed record WeaponPose(int Rx, int Ry, int Rz)
{
    public const int LIMIT = 360;
    public const string MESSAGE = "O giro da arma é em graus inteiros, de -360 a 360.";

    public static WeaponPose Default { get; } = new(0, 0, 0);

    /// <summary>Throws <see cref="DomainValidationException"/> keyed <c>{prefix}.{rx|ry|rz}</c> for the first angle out of range.</summary>
    public WeaponPose Validate(string prefix)
    {
        Check(Rx, prefix, "rx");
        Check(Ry, prefix, "ry");
        Check(Rz, prefix, "rz");
        return this;
    }

    /// <summary>The same rotation with every angle in 0…359.</summary>
    public WeaponPose Normalized() => new(Wrap(Rx), Wrap(Ry), Wrap(Rz));

    private static int Wrap(int degrees) => ((degrees % LIMIT) + LIMIT) % LIMIT;

    private static void Check(int value, string prefix, string field)
    {
        if (Math.Abs(value) > LIMIT)
            throw new DomainValidationException($"{prefix}.{field}", MESSAGE);
    }
}
