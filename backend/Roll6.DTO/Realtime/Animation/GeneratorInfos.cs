using System.Text.Json.Serialization;
using Roll6.DTO.Realtime.Console;

namespace Roll6.DTO.Realtime.Animation;

/// <summary>The map generator of the tab (095, hub method <c>OpenGenerator</c>): its session and the agent's state.</summary>
public class GeneratorOpenedInfo
{
    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("agent")]
    public AgentStatusInfo Agent { get; set; } = new();

    /// <summary>The map being edited (own map), or null for a new one.</summary>
    [JsonPropertyName("mapModelId")]
    public long? MapModelId { get; set; }
}

/// <summary>A request typed in the map generator (095, hub method <c>SendGeneratorRequest</c>).</summary>
public class GeneratorRequestInfo
{
    public const int MAX_TEXT = 4000;
    public const int MAX_IMAGES = 5;
    /// <summary>10 MB of image in base64.</summary>
    public const int MAX_IMAGE_BASE64 = 14_000_000;

    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>The marked prints of a version (PNG base64 + caption), at most five.</summary>
    [JsonPropertyName("images")]
    public List<PromptImageInfo> Images { get; set; } = new();

    /// <summary>The version the request starts from (the edited map, or the version on screen), base64; null on a new map.</summary>
    [JsonPropertyName("baseImage")]
    public string? BaseImage { get; set; }
}

public class GeneratorQueuedInfo
{
    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("position")]
    public int? Position { get; set; }
}

public class GeneratorStartedInfo
{
    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("machine")]
    public string? Machine { get; set; }
}

public class GeneratorProgressInfo
{
    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("event")]
    public ClaudeEventInfo Event { get; set; } = new();
}

/// <summary>A generated image (095, client method <c>generatorImage</c>), validated, for the session's tab only.</summary>
public class GeneratorImageInfo
{
    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("version")]
    public int Version { get; set; }

    [JsonPropertyName("mediaType")]
    public string MediaType { get; set; } = "image/png";

    [JsonPropertyName("data")]
    public string Data { get; set; } = string.Empty;
}

public class GeneratorFinishedInfo
{
    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("outcome")]
    public RequestOutcomeInfo Outcome { get; set; } = new();

    /// <summary>What the Codex answered (its final message).</summary>
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}
