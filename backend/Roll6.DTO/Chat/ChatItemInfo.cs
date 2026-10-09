using System.Text.Json.Serialization;

namespace Roll6.DTO.Chat;

/// <summary>
/// One entry of the campaign chat (041). The chat is the campaign's whole timeline: what people say
/// (<c>text</c>, <c>image</c>, <c>audio</c>), every turn record (<c>movement</c>, <c>action</c>, <c>actionResult</c>,
/// <c>characterUpdate</c>, <c>narration</c>) and the <c>turnFinished</c> dividers. Turn records carry their
/// structured fields so each kind can be drawn its own way, plus <c>text</c> — the same line as the turn summary.
/// </summary>
public class ChatItemInfo
{
    /// <summary>Stable key: "t{turnId}".</summary>
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    /// <summary>Position in the timeline, for paging: "{createdAt ticks}_{turnId}".</summary>
    [JsonPropertyName("cursor")]
    public string Cursor { get; set; } = string.Empty;

    /// <summary>text | image | audio | movement | action | actionResult | characterUpdate | narration | turnFinished.</summary>
    [JsonPropertyName("kind")]
    public string Kind { get; set; } = string.Empty;

    [JsonPropertyName("turnId")]
    public long TurnId { get; set; }

    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    /// <summary>Who made it.</summary>
    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("mapId")]
    public long? MapId { get; set; }

    /// <summary>The character who spoke or acted (null: the master, an NPC, a narration or a divider).</summary>
    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    [JsonPropertyName("npcId")]
    public long? NpcId { get; set; }

    [JsonPropertyName("mapNpcId")]
    public long? MapNpcId { get; set; }

    /// <summary>Who it is about: the speaker as it was when sent, or the character/NPC of a turn record.</summary>
    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("displayImageUrl")]
    public string? DisplayImageUrl { get; set; }

    /// <summary>Who made a turn record when it isn't the one it is about (e.g. "GM (Rodrigo)").</summary>
    [JsonPropertyName("authorLabel")]
    public string? AuthorLabel { get; set; }

    /// <summary>The message or caption; a narration's markdown; the turn summary's line for other turn records.</summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    /// <summary>Action and action result: their own text (the line above is the full summary line).</summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("before")]
    public ChatPointInfo? Before { get; set; }

    [JsonPropertyName("after")]
    public ChatPointInfo? After { get; set; }

    /// <summary>Movement points spent by this move.</summary>
    [JsonPropertyName("moved")]
    public int? Moved { get; set; }

    /// <summary>Movement points spent by the actor in the turn up to this move.</summary>
    [JsonPropertyName("movedTotal")]
    public int? MovedTotal { get; set; }

    [JsonPropertyName("changes")]
    public List<ChatChangeInfo>? Changes { get; set; }

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("audioUrl")]
    public string? AudioUrl { get; set; }

    [JsonPropertyName("audioSeconds")]
    public int? AudioSeconds { get; set; }

    /// <summary>MIME type of the audio, for the player (audio/webm, audio/mp4, audio/ogg).</summary>
    [JsonPropertyName("audioType")]
    public string? AudioType { get; set; }

    /// <summary>The faces of a roll (kind "roll"), drawn by the server: three values 1–6.</summary>
    [JsonPropertyName("dice")]
    public List<int>? Dice { get; set; }

    /// <summary>Deleted from the chat: no text and no media.</summary>
    [JsonPropertyName("deleted")]
    public bool Deleted { get; set; }

    /// <summary>The reader may delete it (author of a message, or the master for messages and narrations).</summary>
    [JsonPropertyName("canDelete")]
    public bool CanDelete { get; set; }

    /// <summary>An action replaced, reset or deleted (044): shown as "Ação cancelada".</summary>
    [JsonPropertyName("cancelled")]
    public bool Cancelled { get; set; }

    /// <summary>The entry this one answers (044).</summary>
    [JsonPropertyName("replyTo")]
    public ChatReplyInfo? ReplyTo { get; set; }

    /// <summary>Curtir / Amei of each user (044).</summary>
    [JsonPropertyName("reactions")]
    public List<ChatReactionInfo> Reactions { get; set; } = new();

    [JsonPropertyName("canReply")]
    public bool CanReply { get; set; }

    [JsonPropertyName("canReact")]
    public bool CanReact { get; set; }

    /// <summary>"action" (a text of a character can become its action), "message" (an action can become text) or null.</summary>
    [JsonPropertyName("canConvert")]
    public string? CanConvert { get; set; }
}

/// <summary>What a reply shows of the entry it answers (044).</summary>
public class ChatReplyInfo
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("turnId")]
    public long TurnId { get; set; }

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = string.Empty;

    [JsonPropertyName("excerpt")]
    public string Excerpt { get; set; } = string.Empty;

    [JsonPropertyName("deleted")]
    public bool Deleted { get; set; }

    [JsonPropertyName("cancelled")]
    public bool Cancelled { get; set; }
}

/// <summary>A user's reaction (044): kind "like" (Curtir) or "love" (Amei).</summary>
public class ChatReactionInfo
{
    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = string.Empty;
}

/// <summary>Sets (like/love) or removes (null) the caller's reaction.</summary>
public class ChatReactInfo
{
    [JsonPropertyName("kind")]
    public string? Kind { get; set; }
}

/// <summary>Turns a text into the character's action ("action") or an action into text ("message").</summary>
public class ChatConvertInfo
{
    [JsonPropertyName("to")]
    public string To { get; set; } = string.Empty;
}

public class ChatPointInfo
{
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("look")]
    public int Look { get; set; }

    [JsonPropertyName("lookName")]
    public string LookName { get; set; } = string.Empty;
}

public class ChatChangeInfo
{
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    /// <summary>Readable name of the field ("Vida", "Postura"…).</summary>
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("before")]
    public string? Before { get; set; }

    [JsonPropertyName("after")]
    public string? After { get; set; }
}
