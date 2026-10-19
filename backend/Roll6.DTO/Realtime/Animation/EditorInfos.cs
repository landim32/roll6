using System.Text.Json;
using System.Text.Json.Serialization;
using Roll6.DTO.Realtime.Console;

namespace Roll6.DTO.Realtime.Animation;

/// <summary>A request typed in the animation editor (086, hub method <c>SendRequest</c>).</summary>
public class RequestInfo
{
    public const int MAX_TEXT = 4000;
    public const int MAX_IMAGES = 5;
    /// <summary>Each PNG as base64, about 1.5 MB.</summary>
    public const int MAX_IMAGE_BASE64 = 2_100_000;

    [JsonPropertyName("animationId")]
    public long AnimationId { get; set; }

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("images")]
    public List<PromptImageInfo> Images { get; set; } = new();

    /// <summary>The name of the token shown on the stage, for the context of the Claude only.</summary>
    [JsonPropertyName("modelName")]
    public string? ModelName { get; set; }

    /// <summary>
    /// The editor's edit version (091): the content the tab shows, unsaved changes included. The run's working file is
    /// written from it, so the Claude works on what the user sees; without it, the library's content.
    /// </summary>
    [JsonPropertyName("content")]
    public JsonElement? Content { get; set; }
}

/// <summary>
/// A valid version of the working file the Claude wrote (091, client method <c>draftVersion</c>): it goes to the editor
/// that sent the request as an unsaved edit and never reaches the library until the user saves.
/// </summary>
public class DraftVersionInfo
{
    [JsonPropertyName("animationId")]
    public long AnimationId { get; set; }

    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("content")]
    public JsonElement Content { get; set; }
}

/// <summary>One line of a stored conversation.</summary>
public class EditorMessageInfo
{
    [JsonPropertyName("animationMessageId")]
    public long AnimationMessageId { get; set; }

    /// <summary>1 user, 2 Claude, 3 notice.</summary>
    [JsonPropertyName("role")]
    public int Role { get; set; }

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>How many prints went with a user line (the pictures themselves are not stored).</summary>
    [JsonPropertyName("imageCount")]
    public int ImageCount { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

public class EditorConversationInfo
{
    [JsonPropertyName("animationConversationId")]
    public long AnimationConversationId { get; set; }

    [JsonPropertyName("messages")]
    public List<EditorMessageInfo> Messages { get; set; } = new();
}

/// <summary>A request of this animation still queued or running when the editor opened: the Claude text so far.</summary>
public class RunningRequestInfo
{
    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("machine")]
    public string? Machine { get; set; }

    [JsonPropertyName("startedAt")]
    public DateTime StartedAt { get; set; }

    /// <summary>Still waiting for an agent (1-based position in the queue of the user), or null while running.</summary>
    [JsonPropertyName("queuePosition")]
    public int? QueuePosition { get; set; }
}

/// <summary>What <c>OpenEditor</c> returns: everything the page needs to draw itself.</summary>
public class EditorStateInfo
{
    [JsonPropertyName("animation")]
    public Roll6.DTO.Animation.AnimationInfo Animation { get; set; } = new();

    /// <summary>The current <c>roll6-animation</c> content of the library.</summary>
    [JsonPropertyName("content")]
    public JsonElement Content { get; set; }

    [JsonPropertyName("conversation")]
    public EditorConversationInfo Conversation { get; set; } = new();

    [JsonPropertyName("agent")]
    public AgentStatusInfo Agent { get; set; } = new();

    [JsonPropertyName("running")]
    public RunningRequestInfo? Running { get; set; }
}

/// <summary>The content of the animation changed (client method <c>animationVersion</c>).</summary>
public class AnimationVersionInfo
{
    public const string ORIGIN_AGENT = "agent";
    public const string ORIGIN_USER = "user";
    public const string ORIGIN_OTHER = "other";

    [JsonPropertyName("animationId")]
    public long AnimationId { get; set; }

    /// <summary>The name of the animation (the working file is named after it).</summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public JsonElement Content { get; set; }

    /// <summary>"agent" (a file the console reported), "user" (the page or the REST API), "other".</summary>
    [JsonPropertyName("origin")]
    public string Origin { get; set; } = ORIGIN_USER;

    [JsonPropertyName("userId")]
    public long UserId { get; set; }
}

public class RequestQueuedInfo
{
    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("animationId")]
    public long AnimationId { get; set; }

    /// <summary>1-based position in the queue of the user.</summary>
    [JsonPropertyName("position")]
    public int Position { get; set; }
}

public class RequestStartedInfo
{
    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("animationId")]
    public long AnimationId { get; set; }

    [JsonPropertyName("machine")]
    public string? Machine { get; set; }
}

public class RequestProgressInfo
{
    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("animationId")]
    public long AnimationId { get; set; }

    [JsonPropertyName("event")]
    public ClaudeEventInfo Event { get; set; } = new();
}

public class RequestFinishedInfo
{
    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    [JsonPropertyName("animationId")]
    public long AnimationId { get; set; }

    [JsonPropertyName("outcome")]
    public RequestOutcomeInfo Outcome { get; set; } = new();

    /// <summary>The Claude line as stored (null when nothing was said).</summary>
    [JsonPropertyName("message")]
    public EditorMessageInfo? Message { get; set; }
}

public class ConversationClearedInfo
{
    [JsonPropertyName("animationId")]
    public long AnimationId { get; set; }
}
