using System.Text.Json.Serialization;

namespace Roll6.DTO.MapToken;

public class MapTokenInfo
{
    [JsonPropertyName("mapTokenId")]
    public long MapTokenId { get; set; }

    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("tokenId")]
    public long TokenId { get; set; }

    [JsonPropertyName("tokenName")]
    public string TokenName { get; set; } = string.Empty;

    [JsonPropertyName("upImageUrl")]
    public string? UpImageUrl { get; set; }

    [JsonPropertyName("downImageUrl")]
    public string? DownImageUrl { get; set; }

    /// <summary>"2.5D front" image of the piece's token (034), standing figure of the 3D view; null when it has none.</summary>
    [JsonPropertyName("frontImageUrl")]
    public string? FrontImageUrl { get; set; }

    /// <summary>Participation of a Character token (its name/vitals/status/sheet are shown).</summary>
    [JsonPropertyName("campaignCharacterId")]
    public long? CampaignCharacterId { get; set; }

    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    /// <summary>NPC occurrence of an Npc piece (its name/vitals/status are shown).</summary>
    [JsonPropertyName("mapNpcId")]
    public long? MapNpcId { get; set; }

    [JsonPropertyName("npcId")]
    public long? NpcId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("tokenType")]
    public int TokenType { get; set; }

    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    [JsonPropertyName("life")]
    public int Life { get; set; }

    [JsonPropertyName("energy")]
    public int Energy { get; set; }

    /// <summary>Maximum life: the character's or the NPC's total (the piece's own life for objects, 026).</summary>
    [JsonPropertyName("totalLife")]
    public int TotalLife { get; set; }

    /// <summary>Maximum energy: the character's or the NPC's total (the piece's own energy for objects).</summary>
    [JsonPropertyName("totalEnergy")]
    public int TotalEnergy { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("move")]
    public int Move { get; set; }

    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("look")]
    public int Look { get; set; }

    /// <summary>Posture of the character/NPC occurrence: 1 standing, 2 down, 3 out of combat; null for objects (031).</summary>
    [JsonPropertyName("posture")]
    public int? Posture { get; set; }

    /// <summary>Hexes the piece takes now (1, 2, 3, 7 or 10): the token's standing or down size, by the posture.</summary>
    [JsonPropertyName("space")]
    public int Space { get; set; } = 1;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
