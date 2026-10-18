using Roll6.Domain.Exceptions;

namespace Roll6.Domain.Weapons;

/// <summary>
/// Where the hand holds a library weapon (083): a point normalised inside the file's bounding box (0…1 per axis, in the
/// file's own frame — 0.5 everywhere is the middle). The 3D view puts this point on the socket's origin and turns and
/// scales the weapon about it. Normalised so that a replacement file of another scale keeps the same grip, and so that
/// the point can never leave the model. Mirrored by the frontend's <c>lib/weaponPose.ts</c>.
/// </summary>
public sealed record WeaponGripPoint(double X, double Y, double Z)
{
    public const double CENTER = 0.5;
    public const string MESSAGE = "A pega fica dentro do modelo (0 a 1).";

    public static WeaponGripPoint Default { get; } = new(CENTER, CENTER, CENTER);

    /// <summary>Throws <see cref="DomainValidationException"/> keyed <c>{prefix}.{x|y|z}</c> for the first value outside 0…1.</summary>
    public WeaponGripPoint Validate(string prefix)
    {
        Check(X, prefix, "x");
        Check(Y, prefix, "y");
        Check(Z, prefix, "z");
        return this;
    }

    private static void Check(double value, string prefix, string field)
    {
        if (!double.IsFinite(value) || value < 0 || value > 1)
            throw new DomainValidationException($"{prefix}.{field}", MESSAGE);
    }
}
