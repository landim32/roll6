using System.Text.Json.Serialization;

namespace Roll6.DTO.MapToken;

/// <summary>New cell (column/row, odd-q) of a map token.</summary>
public class MapTokenPositionInfo
{
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    /// <summary>New facing (0–5); null keeps the current one.</summary>
    [JsonPropertyName("look")]
    public int? Look { get; set; }

    /// <summary>
    /// A free-mode walk position (069): the hex the owner's standing character reached walking in the 3D view. Only in
    /// free mode, on the campaign's current map and for the caller's own character; other pieces are ignored (they may
    /// overlap), nothing is written to the turn and no Deslocamento is spent. Null or false = the "Mover" of before.
    /// </summary>
    [JsonPropertyName("walk")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Walk { get; set; }

    /// <summary>
    /// With <c>walk</c>: the exact point the figure stopped at, in map pixels (it must lie in the hex x/y), and the
    /// direction it faces in radians. The 3D view draws the piece there; the 2D map still draws it at the middle of the
    /// hex. Omitted = the middle of the hex.
    /// </summary>
    [JsonPropertyName("walkX")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? WalkX { get; set; }

    [JsonPropertyName("walkY")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? WalkY { get; set; }

    [JsonPropertyName("walkYaw")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public double? WalkYaw { get; set; }
}
