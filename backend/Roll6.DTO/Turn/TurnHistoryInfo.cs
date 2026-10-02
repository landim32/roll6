using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>A page of narrations, newest first (028: turn console).</summary>
public class TurnHistoryPageInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    /// <summary>Turn in progress — its narrations are listed too, the story is told while the turn is open.</summary>
    [JsonPropertyName("currentTurn")]
    public int CurrentTurn { get; set; }

    /// <summary>One item per narration entry: a turn can hold any number of them.</summary>
    [JsonPropertyName("items")]
    public List<TurnHistoryItemInfo> Items { get; set; } = new();

    /// <summary>Pass as `before` to load older turns; null when the page reached turn 1.</summary>
    [JsonPropertyName("nextBefore")]
    public int? NextBefore { get; set; }
}

/// <summary>One narration of the master: the entry, the turn it was written in and its markdown.</summary>
public class TurnHistoryItemInfo
{
    /// <summary>Id of the narration entry — unique, because a turn may hold several items.</summary>
    [JsonPropertyName("turnId")]
    public long TurnId { get; set; }

    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    /// <summary>The narration as the summary renders it: "GM (name):" and the text, without the "## Ações" heading.</summary>
    [JsonPropertyName("actions")]
    public string Actions { get; set; } = string.Empty;

    /// <summary>When the narration was written (UTC).</summary>
    [JsonPropertyName("finishedAt")]
    public DateTime? FinishedAt { get; set; }
}
