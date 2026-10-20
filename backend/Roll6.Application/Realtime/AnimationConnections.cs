using System.Text;
using System.Text.Json;
using Roll6.Domain.Interfaces;
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
    /// <summary>The editor's edit version sent with the request (091); null = the library's content.</summary>
    public JsonElement? Content { get; init; }
    /// <summary>The weapons of the model shown (092), for the Claude's context.</summary>
    public IReadOnlyList<string> ModelWeapons { get; init; } = Array.Empty<string>();
    /// <summary>A question of the chat (093) instead of an animation request: a read-only run, answered into the chat.</summary>
    public AskJob? Ask { get; init; }
    public bool IsAsk => Ask != null;
    /// <summary>095: a request of the map generator (a Codex run), instead of an animation request.</summary>
    public GeneratorJob? Generator { get; init; }

    /// <summary>096: a GM run — the master's Claude closing a turn of the campaign.</summary>
    public GmJob? Gm { get; init; }
    public bool IsGm => Gm != null;

    /// <summary>096: the master turned the mode off while this run was queued or running.</summary>
    public bool StoppedByMaster { get; set; }
    /// <summary>An animation editor request (neither a question nor a generator request).</summary>
    public bool IsAnimation => Ask == null && Generator == null && Gm == null;
    /// <summary>095: the generator run went past its time and was stopped by the server.</summary>
    public bool TimedOut { get; set; }
    public DateTime QueuedAt { get; }
    public DateTime StartedAt { get; internal set; }
    public RequestState State { get; internal set; } = RequestState.Queued;
    /// <summary>The connection of the console running it; null while queued.</summary>
    public string? AgentConnectionId { get; internal set; }
    public string? Machine { get; internal set; }
    /// <summary>The console reported the Claude session started (the conversation becomes resumable).</summary>
    public bool Started { get; internal set; }

    // ---------- prints (094) ----------

    private readonly Dictionary<string, TaskCompletionSource<PrintResultInfo>> _pendingPrints = new();
    private JsonElement? _latestContent;
    private string? _latestError;
    private int _printCount;

    /// <summary>The editor tab that sent the request: the only one asked for prints.</summary>
    public string? EditorConnectionId { get; init; }

    /// <summary>The latest valid working file (the run's content, then each valid file the Claude wrote).</summary>
    public JsonElement? LatestContent
    {
        get { lock (_lock) return _latestContent; }
    }

    /// <summary>Why the last file the Claude wrote is not a valid animation; null once a valid one arrives.</summary>
    public string? LatestError
    {
        get { lock (_lock) return _latestError; }
    }

    public int PrintCount
    {
        get { lock (_lock) return _printCount; }
    }

    public void SetLatest(JsonElement content)
    {
        lock (_lock)
        {
            _latestContent = content.Clone();
            _latestError = null;
        }
    }

    public void SetLatestError(string message)
    {
        lock (_lock) _latestError = message;
    }

    /// <summary>Counts <paramref name="shots"/> more prints; false (nothing counted) when it would pass <paramref name="limit"/>.</summary>
    public bool TryReservePrints(int shots, int limit)
    {
        lock (_lock)
        {
            if (_printCount + shots > limit)
                return false;
            _printCount += shots;
            return true;
        }
    }

    /// <summary>Waits for the tab's answer to <paramref name="callId"/>.</summary>
    public Task<PrintResultInfo> AddPendingPrint(string callId)
    {
        var pending = new TaskCompletionSource<PrintResultInfo>(TaskCreationOptions.RunContinuationsAsynchronously);
        lock (_lock) _pendingPrints[callId] = pending;
        return pending.Task;
    }

    /// <summary>The tab answered; false when nobody waits for that call (late, or another request's).</summary>
    public bool CompletePrint(PrintResultInfo result)
    {
        TaskCompletionSource<PrintResultInfo>? pending;
        lock (_lock)
        {
            if (!_pendingPrints.Remove(result.CallId, out pending))
                return false;
        }
        return pending.TrySetResult(result);
    }

    /// <summary>Forgets a call (timed out).</summary>
    public void DropPrint(string callId)
    {
        lock (_lock) _pendingPrints.Remove(callId);
    }

    /// <summary>Every waiting print ends with <paramref name="message"/> (request ended, editor gone).</summary>
    public void FailPendingPrints(string message)
    {
        List<(string CallId, TaskCompletionSource<PrintResultInfo> Pending)> all;
        lock (_lock)
        {
            all = _pendingPrints.Select(p => (p.Key, p.Value)).ToList();
            _pendingPrints.Clear();
        }
        foreach (var (callId, pending) in all)
            pending.TrySetResult(new PrintResultInfo { CallId = callId, Error = message });
    }

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
    private readonly Dictionary<string, GeneratorSession> _generators = new();
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

    // ---------- map generator (095) ----------

    /// <summary>A generator session for the tab on that connection (lives until the tab leaves).</summary>
    public GeneratorSession OpenGenerator(string connectionId, long userId, long? mapModelId)
    {
        lock (_lock)
        {
            var session = new GeneratorSession(Roll6.Domain.MapGenerator.GeneratedImage.NewSessionId(), userId, connectionId, mapModelId);
            _generators[session.SessionId] = session;
            return session;
        }
    }

    /// <summary>The tabs of the user with a generator open (they follow the agent's state too).</summary>
    public List<string> GeneratorConnectionsOfUser(long userId)
    {
        lock (_lock) return _generators.Values.Where(g => g.UserId == userId).Select(g => g.ConnectionId).Distinct().ToList();
    }

    public GeneratorSession? GeneratorOf(string? sessionId)
    {
        if (string.IsNullOrEmpty(sessionId))
            return null;
        lock (_lock) return _generators.GetValueOrDefault(sessionId);
    }

    /// <summary>The request queued or running for the session, or null.</summary>
    public EditorRequest? GeneratorRequestOf(string sessionId)
    {
        lock (_lock) return _requests.Values.FirstOrDefault(r => r.Generator?.SessionId == sessionId);
    }

    /// <summary>
    /// Forgets the generator sessions of a tab that left: queued requests are dropped; the running ones are returned
    /// (the caller stops them on their consoles).
    /// </summary>
    public List<EditorRequest> RemoveGeneratorsOf(string connectionId)
    {
        lock (_lock)
        {
            var ids = _generators.Where(g => g.Value.ConnectionId == connectionId).Select(g => g.Key).ToHashSet();
            foreach (var id in ids)
                _generators.Remove(id);
            var running = new List<EditorRequest>();
            foreach (var request in _requests.Values.Where(r => r.Generator != null && ids.Contains(r.Generator.SessionId)).ToList())
            {
                if (request.State == RequestState.Running)
                {
                    running.Add(request);
                    continue;
                }
                _requests.Remove(request.RequestId);
                if (_queues.TryGetValue(request.UserId, out var queue))
                    queue.Remove(request.RequestId);
            }
            return running;
        }
    }

    /// <summary>Queues a generator request in the user's FIFO; null when the session already has one.</summary>
    public EditorRequest? EnqueueGenerator(GeneratorSession session, GeneratorJob job, DateTime now)
    {
        lock (_lock)
        {
            if (_requests.Values.Any(r => r.Generator?.SessionId == session.SessionId))
                return null;
            var request = new EditorRequest(++_nextRequestId, session.UserId, 0, string.Empty, 0, Guid.NewGuid(), false,
                job.Text, job.Marks, null, now) { Generator = job };
            _requests[request.RequestId] = request;
            if (!_queues.TryGetValue(session.UserId, out var queue))
                _queues[session.UserId] = queue = new List<long>();
            queue.Add(request.RequestId);
            return request;
        }
    }

    // ---------- requests ----------

    /// <summary>
    /// Queues a request; null when the animation already has one queued or running (one at a time per animation).
    /// </summary>
    public EditorRequest? Enqueue(long userId, long animationId, string animationName, long conversationId, Guid sessionId,
        bool sessionStarted, string prompt, IReadOnlyList<PromptImageInfo> images, string? modelName, DateTime now,
        JsonElement? content = null, IReadOnlyList<string>? modelWeapons = null, string? editorConnectionId = null)
    {
        lock (_lock)
        {
            if (_requests.Values.Any(r => r.IsAnimation && r.AnimationId == animationId))
                return null;
            var request = new EditorRequest(++_nextRequestId, userId, animationId, animationName, conversationId, sessionId,
                sessionStarted, prompt, images, modelName, now)
            {
                Content = content,
                ModelWeapons = modelWeapons ?? Array.Empty<string>(),
                EditorConnectionId = editorConnectionId,
            };
            _requests[request.RequestId] = request;
            if (!_queues.TryGetValue(userId, out var queue))
                _queues[userId] = queue = new List<long>();
            queue.Add(request.RequestId);
            return request;
        }
    }

    /// <summary>
    /// Queues a question of the chat (093) for the master's agents, in the same FIFO as his animation requests; null when
    /// that question is already queued or running.
    /// </summary>
    public EditorRequest? EnqueueAsk(AskJob job, DateTime now)
    {
        lock (_lock)
        {
            if (_requests.Values.Any(r => r.Ask?.TurnId == job.TurnId))
                return null;
            var request = new EditorRequest(++_nextRequestId, job.MasterUserId, 0, string.Empty, 0, Guid.NewGuid(), false,
                job.Text, Array.Empty<PromptImageInfo>(), null, now) { Ask = job };
            _requests[request.RequestId] = request;
            if (!_queues.TryGetValue(job.MasterUserId, out var queue))
                _queues[job.MasterUserId] = queue = new List<long>();
            queue.Add(request.RequestId);
            return request;
        }
    }

    /// <summary>
    /// Queues a GM run (096) on the master's FIFO; null while a run of the same campaign is already queued or running
    /// (one run per campaign at a time).
    /// </summary>
    public EditorRequest? EnqueueGm(GmJob job, DateTime now)
    {
        lock (_lock)
        {
            if (_requests.Values.Any(r => r.Gm?.CampaignId == job.CampaignId))
                return null;
            var request = new EditorRequest(++_nextRequestId, job.MasterUserId, 0, string.Empty, 0, Guid.NewGuid(), false,
                string.Empty, Array.Empty<PromptImageInfo>(), null, now) { Gm = job };
            _requests[request.RequestId] = request;
            if (!_queues.TryGetValue(job.MasterUserId, out var queue))
                _queues[job.MasterUserId] = queue = new List<long>();
            queue.Add(request.RequestId);
            return request;
        }
    }

    /// <summary>The queued or running GM run of a campaign (096), if any.</summary>
    public EditorRequest? GmRequestOf(long campaignId)
    {
        lock (_lock)
            return _requests.Values.FirstOrDefault(r => r.Gm?.CampaignId == campaignId);
    }

    /// <summary>The queued or running job of a question (093), if any.</summary>
    public EditorRequest? FindByTurn(long turnId)
    {
        lock (_lock)
            return _requests.Values.FirstOrDefault(r => r.Ask?.TurnId == turnId);
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
        lock (_lock) return _requests.Values.FirstOrDefault(r => r.IsAnimation && r.AnimationId == animationId);
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

    /// <summary>The requests that editor tab sent and are still queued or running (094: its prints fail when it leaves).</summary>
    public List<EditorRequest> RequestsOfEditor(string connectionId)
    {
        lock (_lock) return _requests.Values.Where(r => r.EditorConnectionId == connectionId).ToList();
    }

    /// <summary>The request belongs to the agent on that connection (its events are accepted).</summary>
    public bool IsRunBy(long requestId, string connectionId)
    {
        lock (_lock) return _requests.TryGetValue(requestId, out var request) && request.AgentConnectionId == connectionId;
    }
}

/// <summary>
/// One map generator session (095): the tab that opened it, the map it edits (or none), the Codex thread it continues
/// and the number of the next image. In memory only (Q3 = B).
/// </summary>
public sealed class GeneratorSession
{
    private readonly object _lock = new();
    private int _nextVersion = 1;
    private string? _threadId;

    public GeneratorSession(string sessionId, long userId, string connectionId, long? mapModelId)
    {
        SessionId = sessionId;
        UserId = userId;
        ConnectionId = connectionId;
        MapModelId = mapModelId;
    }

    public string SessionId { get; }
    public long UserId { get; }
    public string ConnectionId { get; }
    public long? MapModelId { get; }

    /// <summary>The Codex thread to resume; null before the first request reached the Codex (or after "Nova conversa").</summary>
    public string? ThreadId
    {
        get { lock (_lock) return _threadId; }
        set { lock (_lock) _threadId = value; }
    }

    /// <summary>The number the next image will get (the output path of the next request).</summary>
    public int NextVersion
    {
        get { lock (_lock) return _nextVersion; }
    }

    /// <summary>A new image arrived: its number, and the next one moves on.</summary>
    public int TakeVersion()
    {
        lock (_lock) return _nextVersion++;
    }
}

/// <summary>What a generator request carries (095): the user's text, the marked prints and the image it starts from.</summary>
public sealed record GeneratorJob(string SessionId, string Text, IReadOnlyList<PromptImageInfo> Marks, string? BaseImage);
