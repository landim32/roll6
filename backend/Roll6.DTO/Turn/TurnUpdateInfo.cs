using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>
/// Changes to a turn entry made by the master (030). Every field is optional: null keeps the current value. Type,
/// actor, author and creation date never change; a field that doesn't apply to the entry's type is refused.
/// </summary>
public class TurnUpdateInfo
{
    /// <summary>Moves the entry to another turn (1 up to the current turn).</summary>
    [JsonPropertyName("turnNo")]
    public int? TurnNo { get; set; }

    [JsonPropertyName("mapId")]
    public long? MapId { get; set; }

    /// <summary>Text of an Action, ActionResult or Narration.</summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("beforeX")]
    public int? BeforeX { get; set; }

    [JsonPropertyName("beforeY")]
    public int? BeforeY { get; set; }

    [JsonPropertyName("beforeLook")]
    public int? BeforeLook { get; set; }

    [JsonPropertyName("x")]
    public int? X { get; set; }

    [JsonPropertyName("y")]
    public int? Y { get; set; }

    [JsonPropertyName("look")]
    public int? Look { get; set; }

    [JsonPropertyName("moved")]
    public int? Moved { get; set; }

    /// <summary>CharacterUpdate only: replaces the whole list of changed fields.</summary>
    [JsonPropertyName("changes")]
    public List<TurnChangeInfo>? Changes { get; set; }
}
