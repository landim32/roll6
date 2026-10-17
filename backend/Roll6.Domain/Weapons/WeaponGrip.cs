using System.Text.Json;
using System.Text.Json.Serialization;
using Roll6.Domain.Exceptions;

namespace Roll6.Domain.Weapons;

/// <summary>
/// How a token holds a weapon in one hand (082), adjusted per token and per hand (Q1 = B: never stored on the weapon).
/// Position in fractions of the character's height and rotation in degrees (Euler XYZ), both in the hand bone's frame;
/// size in percent of the default size (the weapon's longest side = half the character's height). Mirrored by the
/// frontend's <c>lib/weaponGrip.ts</c> — change both together.
/// </summary>
public sealed record WeaponGrip
{
    public const double POSITION_LIMIT = 0.5;
    public const double ROTATION_LIMIT = 180;
    public const int SCALE_MIN = 10;
    public const int SCALE_MAX = 400;
    public const int SCALE_STEP = 5;
    public const int SCALE_DEFAULT = 100;

    private static readonly JsonSerializerOptions JSON = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        NumberHandling = JsonNumberHandling.Strict
    };

    public double X { get; init; }
    public double Y { get; init; }
    public double Z { get; init; }
    public double Rx { get; init; }
    public double Ry { get; init; }
    public double Rz { get; init; }
    public int Scale { get; init; } = SCALE_DEFAULT;

    public static WeaponGrip Default { get; } = new();

    /// <summary>Throws <see cref="DomainValidationException"/> keyed <c>{prefix}.grip.{field}</c> for the first value out of range.</summary>
    public WeaponGrip Validate(string prefix)
    {
        CheckPosition(X, prefix, "x");
        CheckPosition(Y, prefix, "y");
        CheckPosition(Z, prefix, "z");
        CheckRotation(Rx, prefix, "rx");
        CheckRotation(Ry, prefix, "ry");
        CheckRotation(Rz, prefix, "rz");
        if (Scale < SCALE_MIN || Scale > SCALE_MAX || Scale % SCALE_STEP != 0)
            throw new DomainValidationException($"{prefix}.grip.scale",
                "O tamanho da arma deve ser de 10% a 400%, em passos de 5%.");
        return this;
    }

    public string ToJson() => JsonSerializer.Serialize(this, JSON);

    /// <summary>The stored grip; null (or unreadable) = null, which reads as the default.</summary>
    public static WeaponGrip? FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;
        try
        {
            return JsonSerializer.Deserialize<WeaponGrip>(json, JSON);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static void CheckPosition(double value, string prefix, string field)
    {
        if (!double.IsFinite(value) || Math.Abs(value) > POSITION_LIMIT)
            throw new DomainValidationException($"{prefix}.grip.{field}",
                "A posição da arma deve ficar entre -0,5 e 0,5 da altura do personagem.");
    }

    private static void CheckRotation(double value, string prefix, string field)
    {
        if (!double.IsFinite(value) || Math.Abs(value) > ROTATION_LIMIT)
            throw new DomainValidationException($"{prefix}.grip.{field}",
                "O giro da arma deve ficar entre -180° e 180°.");
    }
}

/// <summary>One hand of a token (082): the library weapon it holds and how (null grip = default).</summary>
public sealed record TokenHand(long WeaponId, WeaponGrip? Grip);
