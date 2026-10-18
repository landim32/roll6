using System.Text;
using Roll6.DTO.Realtime.Animation;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Application.Realtime;

/// <summary>Where a request of the animation editor is (086).</summary>
public enum RequestState
{
    Queued,
    Running,
}

/// <summary>
/// One request of the animation editor, from the moment the page sends it until the console reports its end (086). What
/// the console needs (text, prints, model name, conversation) is kept here until an agent takes it; the Claude text grows
/// while it runs, so an editor opened late sees it.
/// </summary>
public sealed class EditorRequest
{
    private readonly StringBuilder _text = new();
    private readonly object _lock = new();

    public EditorRequest(long requestId, long userId, long animationId, string animationName, long conversationId,
        Guid sessionId, bool sessionStarted, string prompt, IReadOnlyList<PromptImageInfo> images, string? modelName, DateTime queuedAt)
    {
        RequestId = requestId;
        UserId = userId;
        AnimationId = animationId;
        AnimationName = animationName;
        ConversationId = conversationId;
        SessionId = sessionId;
        SessionStarted = sessionStarted;
        Prompt = prompt;
        Images = images;
        ModelName = modelName;
        QueuedAt = queuedAt;
        StartedAt = queuedAt;
    }

    public long RequestId { get; }
    public long UserId { get; }
    public long AnimationId { get; }
    public string AnimationName { get; }
    public long ConversationId { get; }
    public Guid SessionId { get; }
    /// <summary>The conversation had already reached the Claude when the request was queued (resume the session).</summary>
    public bool SessionStarted { get; }
    public string Prompt { get; }
    public IReadOnlyList<PromptImageInfo> Images { get; }
    public string? ModelName { get; }
    public DateTime QueuedAt { get; }
    public DateTime StartedAt { get; internal set; }
    public RequestState State { get; internal set; } = RequestState.Queued;
    /// <summary>The connection of the console running it; null while queued.</summary>
    public string? AgentConnectionId { get; internal set; }
    public string? Machine { get; internal set; }
    /// <summary>The console reported the Claude session started (the conversation becomes resumable).</summary>
    public bool Started { get; internal set; }

    public void Append(string text)
    {
        lock (_lock) _text.Append(text);
    }

    public string Text
    {
        get { lock (_lock) return _text.ToString(); }
    }
}

/// <summary>
/// The connections of the animation editor hub (086), in memory like <see cref="TableConnections"/>: the consoles
/// (agents) of each user, the editors (a browser tab on one animation), the requests and a FIFO queue per user. Rules:
/// one request per animation at a time, one running request per agent, the first free agent of the user takes the
/// oldest queued request. Pure (no I/O), so the tests drive it directly.
/// </summary>
public class AnimationConnections
{
    private sealed record Agent(long UserId, string Machine, string Folder)
    {
        public long? BusyWith { get; set; }
    }

    private sealed record Editor(long UserId, long AnimationId);

    private readonly object _lock = new();
    private readonly Dictionary<string, Agent> _agents = new();
    private readonly Dictionary<string, Editor> _editors = new();
    private readonly Dictionary<long, EditorRequest> _requests = new();
    private readonly Dictionary<long, List<long>> _queues = new();
    private long _nextRequestId;

    public static string GroupName(long animationId) => $"animation:{animationId}";

    // ---------- agents ----------

    public void AddAgent(string connectionId, long userId, string machine, string folder)
    {
        lock (_lock) _agents[connectionId] = new Agent(userId, machine, folder);
    }

    /// <summary>Forgets the agent; returns the request it was running (to be failed), or null.</summary>
    public EditorRequest? RemoveAgent(string connectionId)
    {
        lock (_lock)
        {
            if (!_agents.Remove(connectionId, out var agent))
                return null;
            if (agent.BusyWith is not long requestId || !_requests.Remove(requestId, out var request))
                return null;
            return request;
        }
    }

    /// <summary>The user of an agent connection, or null when the connection is not a registered agent.</summary>
    public long? AgentUserOf(string connectionId)
    {
        lock (_lock) return _agents.TryGetValue(connectionId, out var agent) ? agent.UserId : null;
    }

    public List<string> AgentsOf(long userId)
    {
        lock (_lock) return _agents.Where(a => a.Value.UserId == userId).Select(a => a.Key).ToList();
    }

    public AgentStatusInfo AgentStatusOf(long userId)
    {
        lock (_lock)
        {
            var agents = _agents.Values.Where(a => a.UserId == userId).ToList();
            return new AgentStatusInfo
            {
                Connected = agents.Count > 0,
                Busy = agents.Count > 0 && agents.All(a => a.BusyWith != null),
                Machine = agents.FirstOrDefault(a => a.BusyWith == null)?.Machine ?? agents.FirstOrDefault()?.Machine,
            };
        }
    }

    // ---------- editors ----------

    public void AddEditor(string connectionId, long userId, long animationId)
    {
        lock (_lock) _editors[connectionId] = new Editor(userId, animationId);
    }

    /// <summary>Forgets the editor; returns the animation it was on, or null.</summary>
    public long? RemoveEditor(string connectionId)
    {
        lock (_lock) return _editors.Remove(connectionId, out var editor) ? editor.AnimationId : null;
    }

    public List<string> EditorsOf(long animationId)
    {
        lock (_lock) return _editors.Where(e => e.Value.AnimationId == animationId).Select(e => e.Key).ToList();
    }

    public List<string> EditorsOfUser(long userId)
    {
        lock (_lock) return _editors.Where(e => e.Value.UserId == userId).Select(e => e.Key).ToList();
    }

    // ---------- requests ----------

    /// <summary>
    /// Queues a request; null when the animation already has one queued or running (one at a time per animation).
    /// </summary>
    public EditorRequest? Enqueue(long userId, long animationId, string animationName, long conversationId, Guid sessionId,
        bool sessionStarted, string prompt, IReadOnlyList<PromptImageInfo> images, string? modelName, DateTime now)
    {
        lock (_lock)
        {
            if (_requests.Values.Any(r => r.AnimationId == animationId))
                return null;
            var request = new EditorRequest(++_nextRequestId, userId, animationId, animationName, conversationId, sessionId,
                sessionStarted, prompt, images, modelName, now);
            _requests[request.RequestId] = request;
            if (!_queues.TryGetValue(userId, out var queue))
                _queues[userId] = queue = new List<long>();
            queue.Add(request.RequestId);
            return request;
        }
    }

    /// <summary>
    /// The oldest queued request of the user and a free agent to run it, both marked (the request Running, the agent
    /// busy); null when there is no queued request or no free agent.
    /// </summary>
    public (EditorRequest Request, string AgentConnectionId)? NextRunnable(long userId, DateTime now)
    {
        lock (_lock)
        {
            if (!_queues.TryGetValue(userId, out var queue) || queue.Count == 0)
                return null;
            var free = _agents.FirstOrDefault(a => a.Value.UserId == userId && a.Value.BusyWith == null);
            if (free.Key == null)
                return null;
            var requestId = queue[0];
            queue.RemoveAt(0);
            if (!_requests.TryGetValue(requestId, out var request))
                return null;
            request.State = RequestState.Running;
            request.AgentConnectionId = free.Key;
            request.Machine = free.Value.Machine;
            request.StartedAt = now;
            free.Value.BusyWith = requestId;
            return (request, free.Key);
        }
    }

    /// <summary>Ends a request (done, stopped, failed or dropped while queued): frees its agent. Null when unknown.</summary>
    public EditorRequest? Finish(long requestId)
    {
        lock (_lock)
        {
            if (!_requests.Remove(requestId, out var request))
                return null;
            if (_queues.TryGetValue(request.UserId, out var queue))
                queue.Remove(requestId);
            if (request.AgentConnectionId != null && _agents.TryGetValue(request.AgentConnectionId, out var agent)
                && agent.BusyWith == requestId)
                agent.BusyWith = null;
            return request;
        }
    }

    public EditorRequest? Get(long requestId)
    {
        lock (_lock) return _requests.GetValueOrDefault(requestId);
    }

    /// <summary>The request queued or running for the animation, or null.</summary>
    public EditorRequest? Running(long animationId)
    {
        lock (_lock) return _requests.Values.FirstOrDefault(r => r.AnimationId == animationId);
    }

    /// <summary>1-based position of a queued request in the queue of its user; null when running or unknown.</summary>
    public int? QueuePosition(long requestId)
    {
        lock (_lock)
        {
            if (!_requests.TryGetValue(requestId, out var request) || !_queues.TryGetValue(request.UserId, out var queue))
                return null;
            var index = queue.IndexOf(requestId);
            return index < 0 ? null : index + 1;
        }
    }

    /// <summary>The request belongs to the agent on that connection (its events are accepted).</summary>
    public bool IsRunBy(long requestId, string connectionId)
    {
        lock (_lock) return _requests.TryGetValue(requestId, out var request) && request.AgentConnectionId == connectionId;
    }
}
