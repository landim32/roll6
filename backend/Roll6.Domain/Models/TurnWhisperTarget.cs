namespace Roll6.Domain.Models;

/// <summary>One recipient of a whisper (047): a character of the campaign, or the master (<c>CharacterId</c> null).</summary>
public class TurnWhisperTarget
{
    public long TurnWhisperTargetId { get; set; }
    public long TurnId { get; set; }
    /// <summary>The target character (seen by its current owner); null = the master.</summary>
    public long? CharacterId { get; set; }

    public static TurnWhisperTarget Create(long turnId, long? characterId) => new() { TurnId = turnId, CharacterId = characterId };
}
