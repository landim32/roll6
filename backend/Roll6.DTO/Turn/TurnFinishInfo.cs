using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

public class TurnFinishInfo
{
    /// <summary>Finish even with characters that haven't acted ("Finalizar mesmo assim").</summary>
    [JsonPropertyName("force")]
    public bool Force { get; set; }
}
