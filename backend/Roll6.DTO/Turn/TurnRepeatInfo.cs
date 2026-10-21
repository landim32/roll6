using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>
/// "Ação repetida" (099): sets, replaces or removes the standing order of an actor. Name the actor like "Agir": its piece
/// (<see cref="MapTokenId"/>) or the campaign and the character (<see cref="CampaignId"/> + <see cref="CharacterId"/>).
/// </summary>
public class TurnRepeatInfo
{
    [JsonPropertyName("mapTokenId")]
    public long? MapTokenId { get; set; }

    [JsonPropertyName("campaignId")]
    public long? CampaignId { get; set; }

    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    /// <summary>The order (≤ 2000 characters); null or empty removes it.</summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

/// <summary>The repeated action after the change (099).</summary>
public class TurnRepeatResultInfo
{
    [JsonPropertyName("active")]
    public bool Active { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>The action recorded right away because the actor had not acted in the turn (Q2 = A); null otherwise.</summary>
    [JsonPropertyName("applied")]
    public TurnInfo? Applied { get; set; }
}
