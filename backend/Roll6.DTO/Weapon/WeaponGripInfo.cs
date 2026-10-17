using System.Text.Json.Serialization;

namespace Roll6.DTO.Weapon;

/// <summary>
/// How a token holds a weapon in one hand (082). Position (x, y, z) in fractions of the character's height, −0.5…0.5;
/// rotation (rx, ry, rz) in degrees, −180…180, Euler XYZ — both in the hand bone's frame; scale in percent of the default
/// size (the weapon's longest side = half the character's height), 10–400 in steps of 5.
/// </summary>
public class WeaponGripInfo
{
    [JsonPropertyName("x")]
    public double X { get; set; }

    [JsonPropertyName("y")]
    public double Y { get; set; }

    [JsonPropertyName("z")]
    public double Z { get; set; }

    [JsonPropertyName("rx")]
    public double Rx { get; set; }

    [JsonPropertyName("ry")]
    public double Ry { get; set; }

    [JsonPropertyName("rz")]
    public double Rz { get; set; }

    [JsonPropertyName("scale")]
    public int Scale { get; set; } = 100;
}
