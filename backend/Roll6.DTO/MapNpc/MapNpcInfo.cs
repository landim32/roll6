using System.Text.Json.Serialization;

namespace Roll6.DTO.MapNpc;

/// <summary>An NPC occurrence on a map with its piece (position and token).</summary>
public class MapNpcInfo
{
    [JsonPropertyName("mapNpcId")]
    public long MapNpcId { get; set; }

    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("npcId")]
    public long NpcId { get; set; }

    [JsonPropertyName("mapTokenId")]
    public long? MapTokenId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Current life of this occurrence (0 or below is allowed and does not change posture).</summary>
    [JsonPropertyName("currentLife")]
    public int CurrentLife { get; set; }

    /// <summary>Current energy of this occurrence.</summary>
    [JsonPropertyName("currentEnergy")]
    public int CurrentEnergy { get; set; }

    /// <summary>The NPC's life (maximum of the current life).</summary>
    [JsonPropertyName("totalLife")]
    public int TotalLife { get; set; }

    /// <summary>The NPC's energy (maximum of the current energy).</summary>
    [JsonPropertyName("totalEnergy")]
    public int TotalEnergy { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    /// <summary>1 standing ("Em pé"), 2 down ("Caído"), 3 out of combat ("Fora de combate") (031).</summary>
    [JsonPropertyName("posture")]
    public int Posture { get; set; } = 1;

    [JsonPropertyName("tokenId")]
    public long? TokenId { get; set; }

    [JsonPropertyName("tokenImageUrl")]
    public string? TokenImageUrl { get; set; }

    [JsonPropertyName("x")]
    public int? X { get; set; }

    [JsonPropertyName("y")]
    public int? Y { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
