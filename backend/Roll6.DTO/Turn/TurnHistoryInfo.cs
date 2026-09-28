using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>A page of finished turns, newest first (028: turn console).</summary>
public class TurnHistoryPageInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    /// <summary>Turn in progress (not listed).</summary>
    [JsonPropertyName("currentTurn")]
    public int CurrentTurn { get; set; }

    [JsonPropertyName("items")]
    public List<TurnHistoryItemInfo> Items { get; set; } = new();

    /// <summary>Pass as `before` to load older turns; null when the page reached turn 1.</summary>
    [JsonPropertyName("nextBefore")]
    public int? NextBefore { get; set; }
}

/// <summary>One finished turn: its number and the "## Ações" text of its summary.</summary>
public class TurnHistoryItemInfo
{
    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    /// <summary>Same text as the "## Ações" section of the turn summary.</summary>
    [JsonPropertyName("actions")]
    public string Actions { get; set; } = string.Empty;

    /// <summary>Time of the turn's last entry (UTC), null when the turn has none.</summary>
    [JsonPropertyName("finishedAt")]
    public DateTime? FinishedAt { get; set; }
}
