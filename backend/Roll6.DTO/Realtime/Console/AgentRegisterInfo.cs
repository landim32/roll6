using System.Text.Json.Serialization;

namespace Roll6.DTO.Realtime.Console;

/// <summary>
/// How a <c>Roll6.Console</c> presents itself when it connects (086, hub method <c>RegisterAgent</c>): the machine it runs
/// on and the working directory it writes and watches. Generic: nothing here is about animations.
/// </summary>
public class AgentRegisterInfo
{
    [JsonPropertyName("machine")]
    public string Machine { get; set; } = string.Empty;

    /// <summary>The working directory on that machine, shown to the user only.</summary>
    [JsonPropertyName("folder")]
    public string Folder { get; set; } = string.Empty;
}

/// <summary>The answer to <c>RegisterAgent</c>: whose agent the connection became.</summary>
public class AgentRegisteredInfo
{
    [JsonPropertyName("userName")]
    public string UserName { get; set; } = string.Empty;
}

/// <summary>What the editors see of the account's agents (client method <c>agentStatus</c>).</summary>
public class AgentStatusInfo
{
    /// <summary>At least one agent of the account is connected.</summary>
    [JsonPropertyName("connected")]
    public bool Connected { get; set; }

    /// <summary>Every connected agent is running a request.</summary>
    [JsonPropertyName("busy")]
    public bool Busy { get; set; }

    /// <summary>The machine of the first connected agent, or null.</summary>
    [JsonPropertyName("machine")]
    public string? Machine { get; set; }
}
