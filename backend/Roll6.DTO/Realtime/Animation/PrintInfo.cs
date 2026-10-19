using System.Text.Json;
using System.Text.Json.Serialization;

namespace Roll6.DTO.Realtime.Animation;

/// <summary>One print the Claude asked for (094): an instant (seconds, or "key" for the key pose), a camera view and the skeleton.</summary>
public class PrintShotInfo
{
    /// <summary>A number of seconds ≥ 0, or the string "key".</summary>
    [JsonPropertyName("time")]
    public JsonElement Time { get; set; }

    /// <summary>front · back · right · left · top · three-quarter.</summary>
    [JsonPropertyName("view")]
    public string View { get; set; } = string.Empty;

    [JsonPropertyName("skeleton")]
    public bool Skeleton { get; set; }
}

/// <summary>
/// Prints asked by the Claude (client method <c>printRequested</c>, server → the editor tab that sent the request): the
/// tab poses its model with <see cref="Content"/> — the latest valid file the Claude wrote — and answers with
/// <c>PrintResult</c>.
/// </summary>
public class PrintRequestInfo
{
    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("callId")]
    public string CallId { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public JsonElement Content { get; set; }

    [JsonPropertyName("shots")]
    public List<PrintShotInfo> Shots { get; set; } = new();
}

/// <summary>One print taken by the tab: a PNG (base64, no prefix) and its Portuguese caption.</summary>
public class PrintedShotInfo
{
    public const int MAX_PNG_BASE64 = 2_100_000;

    [JsonPropertyName("png")]
    public string Png { get; set; } = string.Empty;

    [JsonPropertyName("caption")]
    public string Caption { get; set; } = string.Empty;
}

/// <summary>The tab's answer to <see cref="PrintRequestInfo"/> (hub method <c>PrintResult</c>): the prints, or why there are none.</summary>
public class PrintResultInfo
{
    [JsonPropertyName("callId")]
    public string CallId { get; set; } = string.Empty;

    [JsonPropertyName("error")]
    public string? Error { get; set; }

    [JsonPropertyName("shots")]
    public List<PrintedShotInfo> Shots { get; set; } = new();
}
