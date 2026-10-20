using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Roll6.Application.Auth;
using Roll6.Domain.Animations;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.MapGenerator;
using Roll6.Domain.Models;
using Roll6.DTO.Animation;
using Roll6.DTO.Realtime.Animation;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Application.Realtime;

/// <summary>
/// The channel of the animation editor (086, contracts/agent-protocol.md). Two kinds of clients of one account meet here:
/// the browser tabs with an animation open (JWT) and the <c>Roll6.Console</c> on the user's machine (API key), which runs
/// the local Claude Code. The server builds every request for the console (<see cref="AnimationRequestBuilder"/>), relays
/// the events of the Claude to the editors, validates the files the console reports and stores them as versions of the
/// animation, and keeps the conversation. The console half of the protocol is generic: nothing in it names an animation.
/// </summary>
[Authorize]
public class AnimationHub : Hub
{
    // Client methods of the console.
    public const string RUN_METHOD = "run";
    public const string STOP_METHOD = "stop";
    public const string WRITE_FILES_METHOD = "writeFiles";

    // Client methods of the editors.
    public const string AGENT_STATUS_METHOD = "agentStatus";
    public const string REQUEST_QUEUED_METHOD = "requestQueued";
    public const string REQUEST_STARTED_METHOD = "requestStarted";
    public const string REQUEST_PROGRESS_METHOD = "requestProgress";
    public const string REQUEST_FINISHED_METHOD = "requestFinished";
    public const string ANIMATION_VERSION_METHOD = "animationVersion";
    /// <summary>A valid working file of the Claude, relayed to the editor as an unsaved edit (091).</summary>
    public const string DRAFT_VERSION_METHOD = "draftVersion";
    public const string CONVERSATION_CLEARED_METHOD = "conversationCleared";
    /// <summary>094: the Claude asked for prints; only the tab that sent the request gets it.</summary>
    public const string PRINT_REQUESTED_METHOD = "printRequested";

    // 095: the map generator's tab.
    public const string GENERATOR_QUEUED_METHOD = "generatorQueued";
    public const string GENERATOR_STARTED_METHOD = "generatorStarted";
    public const string GENERATOR_PROGRESS_METHOD = "generatorProgress";
    public const string GENERATOR_IMAGE_METHOD = "generatorImage";
    public const string GENERATOR_FINISHED_METHOD = "generatorFinished";
    public const string IGNORED_FILE = "Arquivo ignorado: {0}";
    public const string INVALID_IMAGE = "A imagem {0} não é um PNG, JPEG ou WebP válido de até 10 MB.";

    /// <summary>094: the answer to a console's <c>ToolCall</c>.</summary>
    public const string TOOL_RESULT_METHOD = "toolResult";

    public const string AGENT_DROPPED = "O agente caiu.";
    public const string STOPPED = "Pedido parado.";
    public const string INVALID_FILE = "Arquivo inválido: {0}";
    public const string FILE_CREATED = "O Claude criou {0}";
    public const string OUTSIDE_FOLDER = "caminho fora da pasta de trabalho";

    private readonly IAnimationService _animations;
    private readonly IAnimationConversationService _conversations;
    private readonly AnimationConnections _connections;
    private readonly TimeProvider _time;
    private readonly AgentDispatcher _dispatcher;

    public AnimationHub(IAnimationService animations, IAnimationConversationService conversations, AnimationConnections connections,
        TimeProvider time, AgentDispatcher dispatcher)
    {
        _animations = animations;
        _conversations = conversations;
        _connections = connections;
        _time = time;
        _dispatcher = dispatcher;
    }

    private long UserId
    {
        get
        {
            var value = Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                        ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return long.TryParse(value, out var userId) ? userId : throw new HubException("unauthorized");
        }
    }

    private bool IsApiKey => Context.User?.FindFirstValue(AuthConstants.AUTH_METHOD_CLAIM) == AuthConstants.API_KEY_METHOD;

    private DateTime Now => _time.GetUtcNow().UtcDateTime;

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        if (_connections.AgentUserOf(connectionId) is long agentUser)
        {
            var dropped = _connections.RemoveAgent(connectionId);
            if (dropped != null)
                await FinishAsync(dropped, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.FAILED, Message = AGENT_DROPPED });
            await SendAgentStatusAsync(agentUser);
            await _dispatcher.PublishAskChangedAsync(agentUser);
            await DispatchAsync(agentUser);
        }
        // 095: the generator sessions of this tab end; a running request is stopped on its console.
        foreach (var running in _connections.RemoveGeneratorsOf(connectionId))
            if (running.AgentConnectionId != null)
                await Clients.Client(running.AgentConnectionId).SendAsync(STOP_METHOD, running.RequestId);
        // 094: prints this tab was taking for the Claude can no longer come.
        foreach (var request in _connections.RequestsOfEditor(connectionId))
            request.FailPendingPrints(PrintRequest.NO_EDITOR);
        _connections.RemoveEditor(connectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // ---------- console ----------

    /// <summary>The connection becomes the agent of its user (API key connections only).</summary>
    public async Task<AgentRegisteredInfo> RegisterAgent(AgentRegisterInfo info)
    {
        if (!IsApiKey)
            throw new HubException("forbidden");
        var userId = UserId;
        _connections.AddAgent(Context.ConnectionId, userId, info?.Machine ?? string.Empty, info?.Folder ?? string.Empty);
        await SendAgentStatusAsync(userId);
        await _dispatcher.PublishAskChangedAsync(userId);
        await DispatchAsync(userId);
        // 096: a turn that got ready while the console was away is processed now.
        await _dispatcher.OnAgentConnectedAsync(userId);
        return new AgentRegisteredInfo { UserName = Context.User?.FindFirstValue("name") ?? string.Empty };
    }

    /// <summary>An event of the Claude on a request this console runs: relayed to the editors of the animation.</summary>
    public async Task Progress(long requestId, ClaudeEventInfo claudeEvent)
    {
        if (claudeEvent == null || !_connections.IsRunBy(requestId, Context.ConnectionId))
            return;
        var request = _connections.Get(requestId);
        if (request == null)
            return;
        if (claudeEvent.Kind == ClaudeEventInfo.TEXT && claudeEvent.Text is { Length: > 0 } text)
            request.Append(text);
        if (claudeEvent.Kind == ClaudeEventInfo.STARTED)
            request.Started = true;
        // 095: a generator request: the Codex thread is kept for the next request, the rest goes to its tab.
        if (request.Generator is { } job)
        {
            if (_connections.GeneratorOf(job.SessionId) is not { } session)
                return;
            if (claudeEvent.Kind == ClaudeEventInfo.STARTED)
            {
                if (!string.IsNullOrWhiteSpace(claudeEvent.Text))
                    session.ThreadId = claudeEvent.Text.Trim();
                claudeEvent = new ClaudeEventInfo { Kind = ClaudeEventInfo.STARTED };
            }
            await SendGeneratorProgressAsync(session, request, claudeEvent);
            return;
        }
        // 093: a question's answer is only gathered here; the chat shows it once finished. 096: a GM run's too.
        if (!request.IsAsk && !request.IsGm)
            await SendProgressAsync(request, claudeEvent);
    }

    /// <summary>
    /// A watched file changed on the machine. The working file of the animation becomes an unsaved edit of the editor (091)
    /// when it is a valid <c>roll6-animation</c> (else a notice says why); another <c>.json</c> in the folder is announced;
    /// the rest is ignored.
    /// </summary>
    public async Task FileChanged(long requestId, FileChangedInfo info)
    {
        if (info == null || !_connections.IsRunBy(requestId, Context.ConnectionId))
            return;
        var request = _connections.Get(requestId);
        // 093: a question's run is read-only; nothing it reports about files is taken.
        if (request == null || request.IsAsk)
            return;
        if (request.Generator is { } job)
        {
            await GeneratedFileAsync(request, job, info);
            return;
        }
        var animation = new Animation { AnimationId = request.AnimationId, Name = request.AnimationName };
        switch (AnimationRequestBuilder.Classify(animation, info.Path))
        {
            case FileChangeKind.Working:
                await RelayVersionAsync(request, info.Content);
                break;
            case FileChangeKind.OtherAnimation:
                await NoticeAsync(request, string.Format(FILE_CREATED, Path.GetFileName(info.Path.Replace('\\', '/'))));
                break;
        }
    }

    /// <summary>The edit version sent with a request (091), validated like an upload; an invalid one refuses the request.</summary>
    private static JsonElement? ValidContent(JsonElement? content)
    {
        if (content is not { ValueKind: not (JsonValueKind.Undefined or JsonValueKind.Null) } given)
            return null;
        try
        {
            AnimationFormat.Parse(given);
        }
        catch (DomainValidationException)
        {
            throw new HubException("invalid");
        }
        return given.Clone();
    }

    /// <summary>
    /// A valid working file becomes an unsaved edit of the editor that sent the request (091): relayed as
    /// <c>draftVersion</c>, never stored — only the user's "Salvar" writes the library. An invalid file is a notice.
    /// </summary>
    private async Task RelayVersionAsync(EditorRequest request, string content)
    {
        JsonElement json;
        try
        {
            using var document = JsonDocument.Parse(content);
            json = document.RootElement.Clone();
        }
        catch (JsonException ex)
        {
            request.SetLatestError("JSON malformado — " + ex.Message);
            await NoticeAsync(request, string.Format(INVALID_FILE, "JSON malformado — " + ex.Message));
            return;
        }
        try
        {
            // Validated here with the same rule as the upload, so an invalid file becomes a notice and never a version.
            AnimationFormat.Parse(json);
            // 094: what the Claude's prints show from now on.
            request.SetLatest(json);
            await Clients.Group(AnimationConnections.GroupName(request.AnimationId)).SendAsync(DRAFT_VERSION_METHOD, new DraftVersionInfo
            {
                AnimationId = request.AnimationId,
                RequestId = request.RequestId,
                Content = json,
            });
        }
        catch (DomainValidationException ex)
        {
            var (_, messages) = ex.Errors.First();
            request.SetLatestError(messages.FirstOrDefault() ?? ex.Message);
            await NoticeAsync(request, string.Format(INVALID_FILE, messages.FirstOrDefault() ?? ex.Message));
        }
    }

    /// <summary>
    /// A tool of the run called by the Claude (094), from the console running that request only. Answered later with
    /// <c>toolResult</c> by <see cref="AgentDispatcher.HandleToolCallAsync"/>: a print waits for the editor tab, and a hub
    /// method that waited would hold the console's other messages behind it.
    /// </summary>
    public Task ToolCall(long requestId, ToolCallInfo call)
    {
        if (call == null || !_connections.IsRunBy(requestId, Context.ConnectionId))
            return Task.CompletedTask;
        var agentConnectionId = Context.ConnectionId;
        _ = Task.Run(() => _dispatcher.HandleToolCallAsync(requestId, agentConnectionId, call));
        return Task.CompletedTask;
    }

    /// <summary>The editor tab's prints for a call of its own request (094); anything else is ignored.</summary>
    public Task PrintResult(PrintResultInfo result)
    {
        if (result == null || string.IsNullOrEmpty(result.CallId))
            return Task.CompletedTask;
        var clean = new PrintResultInfo
        {
            CallId = result.CallId,
            Error = string.IsNullOrWhiteSpace(result.Error) ? null : Truncate(result.Error.Trim(), 300),
            Shots = (result.Shots ?? new List<PrintedShotInfo>())
                .Where(s => !string.IsNullOrEmpty(s?.Png) && s.Png.Length <= PrintedShotInfo.MAX_PNG_BASE64)
                .Take(PrintRequest.MAX_SHOTS)
                .Select(s => new PrintedShotInfo { Png = s.Png, Caption = Truncate(s.Caption ?? string.Empty, 1000) })
                .ToList(),
        };
        foreach (var request in _connections.RequestsOfEditor(Context.ConnectionId))
            if (request.CompletePrint(clean))
                break;
        return Task.CompletedTask;
    }

    private static string Truncate(string text, int max) => text.Length <= max ? text : text[..max];

    /// <summary>The request ended: the Claude line is stored, the agent freed, the editors told, the queue advanced.</summary>
    public async Task Finished(long requestId, RequestOutcomeInfo outcome)
    {
        if (!_connections.IsRunBy(requestId, Context.ConnectionId))
            return;
        var request = _connections.Finish(requestId);
        if (request == null)
            return;
        await FinishAsync(request, outcome ?? new RequestOutcomeInfo());
        await SendAgentStatusAsync(request.UserId);
        await DispatchAsync(request.UserId);
    }

    // ---------- browser ----------

    /// <summary>Opens the editor of an animation (owner only): the state the page needs, and the group of its events.</summary>
    public async Task<EditorStateInfo> OpenEditor(long animationId)
    {
        var userId = UserId;
        var animation = await OwnedAsync(userId, animationId);
        var conversation = await _conversations.GetOrOpenAsync(userId, animationId);
        var messages = await _conversations.ListMessagesAsync(userId, animationId);
        var content = await _animations.ReadContentAsync(animationId);

        _connections.RemoveEditor(Context.ConnectionId);
        _connections.AddEditor(Context.ConnectionId, userId, animationId);
        await Groups.AddToGroupAsync(Context.ConnectionId, AnimationConnections.GroupName(animationId));

        var running = _connections.Running(animationId);
        return new EditorStateInfo
        {
            Animation = animation,
            Content = content,
            Conversation = new EditorConversationInfo
            {
                AnimationConversationId = conversation.AnimationConversationId,
                Messages = messages.Select(ToDto).ToList(),
            },
            Agent = _connections.AgentStatusOf(userId),
            Running = running == null ? null : new RunningRequestInfo
            {
                RequestId = running.RequestId,
                Text = running.Text,
                Machine = running.Machine,
                StartedAt = running.StartedAt,
                QueuePosition = _connections.QueuePosition(running.RequestId),
            },
        };
    }

    public async Task CloseEditor()
    {
        if (_connections.RemoveEditor(Context.ConnectionId) is long animationId)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, AnimationConnections.GroupName(animationId));
    }

    /// <summary>A request for the local Claude: stored in the conversation, queued for the account's agent.</summary>
    public async Task<long> SendRequest(RequestInfo info)
    {
        if (!IsValid(info))
            throw new HubException("invalid");
        var content = ValidContent(info.Content);
        var userId = UserId;
        var animation = await OwnedAsync(userId, info.AnimationId);
        if (!_connections.AgentStatusOf(userId).Connected)
            throw new HubException("no-agent");
        var conversation = await _conversations.GetOrOpenAsync(userId, info.AnimationId);
        var request = _connections.Enqueue(userId, info.AnimationId, animation.Name, conversation.AnimationConversationId,
            conversation.ClaudeSessionId, conversation.Started, info.Text.Trim(), info.Images, info.ModelName, Now, content,
            info.ModelWeapons?.Select(w => w.Trim()).Where(w => w.Length > 0).ToList(), Context.ConnectionId)
            ?? throw new HubException("busy");
        await _conversations.AddMessageAsync(conversation.AnimationConversationId, ConversationRole.User, info.Text.Trim(), info.Images.Count);
        var started = await DispatchAsync(userId);
        if (!started.Contains(request.RequestId))
        {
            await Clients.Group(AnimationConnections.GroupName(info.AnimationId)).SendAsync(REQUEST_QUEUED_METHOD, new RequestQueuedInfo
            {
                RequestId = request.RequestId,
                AnimationId = info.AnimationId,
                Position = _connections.QueuePosition(request.RequestId) ?? 1,
            });
        }
        return request.RequestId;
    }

    private static bool IsValid(RequestInfo? info)
    {
        if (info == null || info.Images == null)
            return false;
        var text = info.Text?.Trim() ?? string.Empty;
        if (text.Length > RequestInfo.MAX_TEXT || (text.Length == 0 && info.Images.Count == 0))
            return false;
        if (info.Images.Count > RequestInfo.MAX_IMAGES)
            return false;
        // 092: the weapons of the model shown, plain text for the context.
        if (info.ModelWeapons is { } weapons
            && (weapons.Count > RequestInfo.MAX_WEAPONS || weapons.Any(w => w == null || w.Length > RequestInfo.MAX_WEAPON_TEXT)))
            return false;
        return info.Images.All(image => image != null && !string.IsNullOrEmpty(image.Png) && image.Png.Length <= RequestInfo.MAX_IMAGE_BASE64);
    }

    /// <summary>Stops a request of the caller: a running one is killed by its console, a queued one is dropped here.</summary>
    public async Task StopRequest(long requestId)
    {
        var request = _connections.Get(requestId);
        if (request == null || request.UserId != UserId)
            throw new HubException("not-found");
        if (request.State == RequestState.Running && request.AgentConnectionId != null)
        {
            await Clients.Client(request.AgentConnectionId).SendAsync(STOP_METHOD, requestId);
            return;
        }
        var dropped = _connections.Finish(requestId);
        if (dropped != null)
            await FinishAsync(dropped, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.STOPPED, Message = STOPPED });
    }

    /// <summary>"Nova conversa": the open conversation closes; the next request starts another (refused while one runs).</summary>
    public async Task NewConversation(long animationId)
    {
        var userId = UserId;
        await OwnedAsync(userId, animationId);
        if (_connections.Running(animationId) != null)
            throw new HubException("busy");
        await _conversations.CloseAsync(userId, animationId);
        await Clients.Group(AnimationConnections.GroupName(animationId))
            .SendAsync(CONVERSATION_CLEARED_METHOD, new ConversationClearedInfo { AnimationId = animationId });
    }

    // ---------- shared ----------

    private async Task<AnimationInfo> OwnedAsync(long userId, long animationId)
    {
        AnimationInfo animation;
        try
        {
            animation = await _animations.GetByIdAsync(animationId);
        }
        catch (KeyNotFoundException)
        {
            throw new HubException("not-found");
        }
        if (animation.UserId != userId)
            throw new HubException("forbidden");
        return animation;
    }

    /// <summary>Hands queued requests of the user to its free agents (093: through the shared dispatcher).</summary>
    private Task<HashSet<long>> DispatchAsync(long userId) => _dispatcher.DispatchAsync(userId);

    /// <summary>Stores what the Claude said (or answers the question, 093), marks the session started, tells the editors.</summary>
    private Task FinishAsync(EditorRequest request, RequestOutcomeInfo outcome) => _dispatcher.FinishAsync(request, outcome);

    private async Task NoticeAsync(EditorRequest request, string text)
    {
        await _conversations.AddMessageAsync(request.ConversationId, ConversationRole.Notice, text);
        await SendProgressAsync(request, new ClaudeEventInfo { Kind = ClaudeEventInfo.NOTICE, Text = text });
    }

    private Task SendProgressAsync(EditorRequest request, ClaudeEventInfo claudeEvent) =>
        Clients.Group(AnimationConnections.GroupName(request.AnimationId)).SendAsync(REQUEST_PROGRESS_METHOD, new RequestProgressInfo
        {
            RequestId = request.RequestId,
            AnimationId = request.AnimationId,
            Event = claudeEvent,
        });

    private Task SendAgentStatusAsync(long userId) => _dispatcher.SendAgentStatusAsync(userId);

    // ---------- map generator (095) ----------

    /// <summary>Opens the map generator for this tab — for a new map, or to edit one of the user's own maps.</summary>
    public async Task<GeneratorOpenedInfo> OpenGenerator(long? mapModelId)
    {
        var userId = UserId;
        if (mapModelId is long id)
        {
            try
            {
                await _dispatcher.OwnMapModelAsync(userId, id);
            }
            catch (KeyNotFoundException)
            {
                throw new HubException("not-found");
            }
            catch (UnauthorizedAccessException)
            {
                throw new HubException("forbidden");
            }
        }
        var session = _connections.OpenGenerator(Context.ConnectionId, userId, mapModelId);
        return new GeneratorOpenedInfo { SessionId = session.SessionId, Agent = _connections.AgentStatusOf(userId), MapModelId = mapModelId };
    }

    /// <summary>A request of the generator tab: validated, queued for the user's console (one per session), dispatched.</summary>
    public async Task<long> SendGeneratorRequest(GeneratorRequestInfo info)
    {
        if (!IsValid(info))
            throw new HubException("invalid");
        var session = _connections.GeneratorOf(info.SessionId);
        if (session == null || session.ConnectionId != Context.ConnectionId)
            throw new HubException("not-found");
        if (!_connections.AgentStatusOf(session.UserId).Connected)
            throw new HubException("no-agent");
        var job = new GeneratorJob(session.SessionId, info.Text.Trim(), info.Images, string.IsNullOrEmpty(info.BaseImage) ? null : info.BaseImage);
        var request = _connections.EnqueueGenerator(session, job, Now) ?? throw new HubException("busy");
        var started = await DispatchAsync(session.UserId);
        if (!started.Contains(request.RequestId))
        {
            await Clients.Caller.SendAsync(GENERATOR_QUEUED_METHOD, new GeneratorQueuedInfo
            {
                SessionId = session.SessionId,
                RequestId = request.RequestId,
                Position = _connections.QueuePosition(request.RequestId),
            });
        }
        return request.RequestId;
    }

    /// <summary>"Nova conversa" of the generator: the next request starts a new Codex thread (refused while one runs).</summary>
    public Task NewGeneratorConversation(string sessionId)
    {
        var session = _connections.GeneratorOf(sessionId);
        if (session == null || session.ConnectionId != Context.ConnectionId)
            throw new HubException("not-found");
        if (_connections.GeneratorRequestOf(sessionId) != null)
            throw new HubException("busy");
        session.ThreadId = null;
        return Task.CompletedTask;
    }

    private static bool IsValid(GeneratorRequestInfo? info)
    {
        if (info == null || info.Text == null || info.Text.Length > GeneratorRequestInfo.MAX_TEXT)
            return false;
        var images = info.Images ?? new List<PromptImageInfo>();
        if (images.Count > GeneratorRequestInfo.MAX_IMAGES || (info.Text.Trim().Length == 0 && images.Count == 0))
            return false;
        if (images.Any(i => i == null || GeneratedImage.Decode(i.Png) == null))
            return false;
        return string.IsNullOrEmpty(info.BaseImage) || GeneratedImage.Decode(info.BaseImage) != null;
    }

    /// <summary>
    /// A file of a generator run: an image in the session's folder (not its inputs) becomes the next version for the
    /// tab, once its bytes are a valid PNG/JPEG/WebP of at most 10 MB; anything else is a notice.
    /// </summary>
    private async Task GeneratedFileAsync(EditorRequest request, GeneratorJob job, FileChangedInfo info)
    {
        if (_connections.GeneratorOf(job.SessionId) is not { } session)
            return;
        var path = (info.Path ?? string.Empty).Replace('\\', '/');
        var name = Path.GetFileName(path);
        if (!GeneratedImage.IsOutputOf(session.SessionId, path))
        {
            if (!path.Contains("/entrada/"))
                await SendGeneratorProgressAsync(session, request, new ClaudeEventInfo { Kind = ClaudeEventInfo.NOTICE, Text = string.Format(IGNORED_FILE, name) });
            return;
        }
        var image = info.IsBase64 ? GeneratedImage.Decode(info.Content) : null;
        if (image is not { } valid)
        {
            await SendGeneratorProgressAsync(session, request, new ClaudeEventInfo { Kind = ClaudeEventInfo.NOTICE, Text = string.Format(INVALID_IMAGE, name) });
            return;
        }
        await Clients.Client(session.ConnectionId).SendAsync(GENERATOR_IMAGE_METHOD, new GeneratorImageInfo
        {
            SessionId = session.SessionId,
            RequestId = request.RequestId,
            Version = session.TakeVersion(),
            MediaType = valid.MediaType,
            Data = info.Content,
        });
    }

    private Task SendGeneratorProgressAsync(GeneratorSession session, EditorRequest request, ClaudeEventInfo claudeEvent) =>
        Clients.Client(session.ConnectionId).SendAsync(GENERATOR_PROGRESS_METHOD, new GeneratorProgressInfo
        {
            SessionId = session.SessionId,
            RequestId = request.RequestId,
            Event = claudeEvent,
        });

    internal static EditorMessageInfo ToDto(AnimationMessage message) => new()
    {
        AnimationMessageId = message.AnimationMessageId,
        Role = (int)message.Role,
        Text = message.Text,
        ImageCount = message.ImageCount,
        CreatedAt = message.CreatedAt,
    };
}
