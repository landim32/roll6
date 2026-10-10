using System.Text.Json.Serialization;

namespace Roll6.DTO.Chat;

/// <summary>A page of the campaign chat (041), oldest first, with the reader's unread state.</summary>
public class ChatPageInfo
{
    [JsonPropertyName("items")]
    public List<ChatItemInfo> Items { get; set; } = new();

    /// <summary>There is more in the direction asked (older without cursor or with "before", newer with "after").</summary>
    [JsonPropertyName("hasMore")]
    public bool HasMore { get; set; }

    /// <summary>Entries by others not read yet (at most 100: "99+").</summary>
    [JsonPropertyName("unreadCount")]
    public int UnreadCount { get; set; }

    /// <summary>Cursor of the first unread entry, where the chat opens; null when everything was read.</summary>
    [JsonPropertyName("firstUnreadCursor")]
    public string? FirstUnreadCursor { get; set; }
}

/// <summary>What someone says (041): text, a photo or an audio, as a character or as the master.</summary>
public class ChatSendInfo
{
    /// <summary>One of the sender's characters approved in the campaign; null = speak as the master.</summary>
    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    /// <summary>The message (1–4000) or the caption of a photo/audio.</summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    /// <summary>fileName from POST /api/image.</summary>
    [JsonPropertyName("image")]
    public string? Image { get; set; }

    /// <summary>fileName from POST /api/chat/audio.</summary>
    [JsonPropertyName("audio")]
    public string? Audio { get; set; }

    /// <summary>Length of the audio (1–120).</summary>
    [JsonPropertyName("audioSeconds")]
    public int? AudioSeconds { get; set; }

    /// <summary>The entry this message answers (044).</summary>
    [JsonPropertyName("replyToTurnId")]
    public long? ReplyToTurnId { get; set; }

    /// <summary>Whisper (047): approved characters of the campaign that may see it (with <see cref="WhisperMaster"/>).</summary>
    [JsonPropertyName("whisperCharacterIds")]
    public List<long>? WhisperCharacterIds { get; set; }

    /// <summary>Whisper (047): the master is a recipient.</summary>
    [JsonPropertyName("whisperMaster")]
    public bool? WhisperMaster { get; set; }
}

/// <summary>A dice roll in the chat: 3d6 drawn by the server, as a character or as the master.</summary>
public class ChatRollInfo
{
    /// <summary>One of the roller's characters approved in the campaign; null = roll as the master.</summary>
    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    /// <summary>Optional reason (≤ 260): "Ataque com espada".</summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    /// <summary>The entry this roll answers (044).</summary>
    [JsonPropertyName("replyToTurnId")]
    public long? ReplyToTurnId { get; set; }

    /// <summary>A secret roll (047): see <see cref="ChatSendInfo.WhisperCharacterIds"/>.</summary>
    [JsonPropertyName("whisperCharacterIds")]
    public List<long>? WhisperCharacterIds { get; set; }

    [JsonPropertyName("whisperMaster")]
    public bool? WhisperMaster { get; set; }
}

/// <summary>Moves the reader's mark forward up to an entry (041).</summary>
public class ChatReadInfo
{
    [JsonPropertyName("until")]
    public string Until { get; set; } = string.Empty;
}

/// <summary>A recorded audio stored for the chat (041).</summary>
public class ChatAudioUploadInfo
{
    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("contentType")]
    public string ContentType { get; set; } = string.Empty;
}
