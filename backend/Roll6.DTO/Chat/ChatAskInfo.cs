using System.Text.Json.Serialization;

namespace Roll6.DTO.Chat;

/// <summary>
/// A question to the master's Claude (093, "Perguntar"): who speaks (one of the caller's own approved characters, or
/// null for the master), the question (1–1000 characters) and whether only the author and the master see it.
/// </summary>
public class ChatAskInfo
{
    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("private")]
    public bool Private { get; set; }
}

/// <summary>Whether a participant can ask now (093): the master's console connected, and their own waiting question.</summary>
public class AskStatusInfo
{
    [JsonPropertyName("available")]
    public bool Available { get; set; }

    [JsonPropertyName("waitingTurnId")]
    public long? WaitingTurnId { get; set; }

    /// <summary>096: the turn a GM run is queued or running for in this campaign, else null.</summary>
    [JsonPropertyName("gmRunningTurn")]
    public int? GmRunningTurn { get; set; }

    /// <summary>101: the turn the master said he is processing (only the current turn, before it expires), else null.</summary>
    [JsonPropertyName("processingTurn")]
    public int? ProcessingTurn { get; set; }

    /// <summary>101: UTC instant that notice expires.</summary>
    [JsonPropertyName("processingUntil")]
    public DateTime? ProcessingUntil { get; set; }
}

/// <summary>The master's correction of an answer (093): the new text, 1–4000 characters.</summary>
public class ChatAnswerEditInfo
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }
}
