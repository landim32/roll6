using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Roll6.Domain.Animations;
using Roll6.Domain.Asks;
using Roll6.Domain.Enums;
using Roll6.Domain.Gm;
using Roll6.Domain.Interfaces;
using Roll6.Domain.MapGenerator;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.MapModel;
using Roll6.DTO.Realtime;
using Roll6.DTO.Realtime.Animation;
using Roll6.DTO.Realtime.Console;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Application.Realtime;

/// <summary>
/// Hands queued work to the users' Roll6.Console agents (086), from the animation hub and — since 093 — from REST calls
/// (a chat question must reach the master's console although the asker is someone else). Animation requests become the
/// usual run; a question becomes a <b>read-only</b> run built from <see cref="AskPrompt"/>: no files, no watch, a fresh
/// session, the console allowed to read only. Scoped services (the animation content, the conversation, the chat) are
/// reached through a scope, because this is a singleton.
/// </summary>
public sealed class AgentDispatcher : IAskDispatcher, IGmDispatcher
{
    private readonly IHubContext<AnimationHub> _hub;
    private readonly AnimationConnections _connections;
    private readonly IServiceScopeFactory _scopes;
    private readonly IRealtimeNotifier _notifier;
    private readonly TimeProvider _time;

    public AgentDispatcher(IHubContext<AnimationHub> hub, AnimationConnections connections, IServiceScopeFactory scopes,
        IRealtimeNotifier notifier, TimeProvider time)
    {
        _hub = hub;
        _connections = connections;
        _scopes = scopes;
        _notifier = notifier;
        _time = time;
    }

    private DateTime Now => _time.GetUtcNow().UtcDateTime;

    /// <summary>How long a print waits for the editor tab (094; shortened by the tests).</summary>
    public TimeSpan PrintTimeout { get; set; } = PrintRequest.TIMEOUT;

    public bool IsAgentConnected(long userId) => _connections.AgentStatusOf(userId).Connected;

    public async Task EnqueueAsync(AskJob job)
    {
        if (_connections.EnqueueAsk(job, Now) == null)
            return;
        await DispatchAsync(job.MasterUserId);
    }

    // ---------- GM mode (096) ----------

    /// <summary>How long a GM run may take before the server stops it (096; shortened by the tests).</summary>
    public TimeSpan GmTimeout { get; set; } = TimeSpan.FromMinutes(10);

    async Task<bool> IGmDispatcher.EnqueueAsync(GmJob job)
    {
        if (_connections.EnqueueGm(job, Now) == null)
            return false;
        await DispatchAsync(job.MasterUserId);
        return true;
    }

    int? IGmDispatcher.RunningTurnOf(long campaignId) => _connections.GmRequestOf(campaignId)?.Gm?.TurnNo;

    /// <summary>The master turned the mode off: a running run is stopped on its console, a queued one dropped at once.</summary>
    async Task IGmDispatcher.StopAsync(long campaignId)
    {
        var request = _connections.GmRequestOf(campaignId);
        if (request == null)
            return;
        request.StoppedByMaster = true;
        if (request.State == RequestState.Running && request.AgentConnectionId != null)
        {
            await _hub.Clients.Client(request.AgentConnectionId).SendAsync(AnimationHub.STOP_METHOD, request.RequestId);
            return;
        }
        var dropped = _connections.Finish(request.RequestId);
        if (dropped != null)
            await FinishAsync(dropped, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.STOPPED, Message = GmTurn.Stopped() });
    }

    /// <summary>
    /// A GM run (096, contracts/console-gm-run.md): a fresh session, not read-only (the skill writes the repository and
    /// runs its scripts), nothing written, watched or offered, and a prompt made only of server-owned data.
    /// </summary>
    public static RunInfo GmRun(EditorRequest request, GmJob job) => new()
    {
        RequestId = request.RequestId,
        SessionId = Guid.NewGuid(),
        Started = false,
        SystemPrompt = GmPrompt.SystemPrompt(),
        Prompt = GmPrompt.UserPrompt(job.CampaignId, job.CampaignName, job.TurnNo),
        Images = new List<PromptImageInfo>(),
        Files = new List<FileWriteInfo>(),
        Watch = new List<string>(),
        ReadOnly = false,
    };

    /// <summary>The master's console connected (096): every campaign he masters with the mode on is checked. Never throws.</summary>
    public async Task OnAgentConnectedAsync(long userId)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            await scope.ServiceProvider.GetRequiredService<IGmService>().CheckOwnerAsync(userId);
        }
        catch
        {
            // Best effort: the next action checks again.
        }
    }

    /// <summary>The console took a GM run: the chat line and the running state (096). Never fails the dispatch.</summary>
    private async Task GmStartedAsync(GmJob job)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            await scope.ServiceProvider.GetRequiredService<IGmService>().StartedAsync(job);
        }
        catch
        {
            // The run goes on; the end of it tells the table what happened.
        }
    }

    public async Task StopAsync(long turnId)
    {
        var request = _connections.FindByTurn(turnId);
        if (request == null)
            return;
        if (request.State == RequestState.Running && request.AgentConnectionId != null)
        {
            await _hub.Clients.Client(request.AgentConnectionId).SendAsync(AnimationHub.STOP_METHOD, request.RequestId);
            return;
        }
        _connections.Finish(request.RequestId);
    }

    /// <summary>Hands queued requests of the user to its free agents; returns the ids that started.</summary>
    public async Task<HashSet<long>> DispatchAsync(long userId)
    {
        var started = new HashSet<long>();
        while (_connections.NextRunnable(userId, Now) is var (request, agentConnectionId))
        {
            started.Add(request.RequestId);
            RunInfo run;
            try
            {
                run = request.Ask is { } ask
                    ? AskRun(request, ask)
                    : request.Gm is { } gm
                    ? GmRun(request, gm)
                    : request.Generator is { } job
                        ? GeneratorRun(request, job, _connections.GeneratorOf(job.SessionId) ?? throw new InvalidOperationException("O gerador foi fechado."))
                        : await AnimationRunAsync(request);
            }
            catch (Exception ex)
            {
                var failed = _connections.Finish(request.RequestId);
                if (failed != null)
                    await FinishAsync(failed, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.FAILED, Message = ex.Message });
                continue;
            }
            await _hub.Clients.Client(agentConnectionId).SendAsync(AnimationHub.RUN_METHOD, run);
            if (request.Generator is { } startedJob && _connections.GeneratorOf(startedJob.SessionId) is { } session)
            {
                await _hub.Clients.Client(session.ConnectionId).SendAsync(AnimationHub.GENERATOR_STARTED_METHOD,
                    new GeneratorStartedInfo { SessionId = session.SessionId, RequestId = request.RequestId, Machine = request.Machine });
                _ = TimeOutAsync(request.RequestId, GeneratorTimeout);
            }
            else if (request.Gm is { } startedGm)
            {
                await GmStartedAsync(startedGm);
                _ = TimeOutAsync(request.RequestId, GmTimeout);
            }
            else if (request.IsAnimation)
            {
                await _hub.Clients.Group(AnimationConnections.GroupName(request.AnimationId)).SendAsync(AnimationHub.REQUEST_STARTED_METHOD,
                    new RequestStartedInfo { RequestId = request.RequestId, AnimationId = request.AnimationId, Machine = request.Machine });
            }
        }
        if (started.Count > 0)
            await SendAgentStatusAsync(userId);
        return started;
    }

    /// <summary>
    /// A question's run (093): read-only, a fresh session, nothing written or watched, the question only inside the
    /// escaped delimiters of <see cref="AskPrompt"/>.
    /// </summary>
    public static RunInfo AskRun(EditorRequest request, AskJob ask) => new()
    {
        RequestId = request.RequestId,
        SessionId = Guid.NewGuid(),
        Started = false,
        SystemPrompt = AskPrompt.SystemPrompt(),
        Prompt = AskPrompt.UserPrompt(ask.CampaignName, ask.SpeakerName, ask.Text),
        Images = new List<PromptImageInfo>(),
        Files = new List<FileWriteInfo>(),
        Watch = new List<string>(),
        ReadOnly = true,
    };

    /// <summary>How long a generator run may take before the server stops it (095; shortened by the tests).</summary>
    public TimeSpan GeneratorTimeout { get; set; } = TimeSpan.FromMinutes(5);

    public const string GENERATOR_TIMED_OUT = "O Codex demorou demais (mais de 5 minutos) e o pedido foi parado.";

    /// <summary>
    /// A generator request's run (095, contracts/console-engine.md): the Codex, the session's thread, the fixed top-down
    /// rules and the user's text (<see cref="MapGeneratorPrompt"/>), the base image and the marked prints written as
    /// files under the session's "entrada/" (the console attaches every base64 file with -i), and the session folder
    /// watched for the new image.
    /// </summary>
    public static RunInfo GeneratorRun(EditorRequest request, GeneratorJob job, GeneratorSession session)
    {
        var files = new List<FileWriteInfo>();
        string? basePath = null;
        if (!string.IsNullOrEmpty(job.BaseImage))
        {
            basePath = GeneratedImage.InputPath(session.SessionId, $"base-{request.RequestId}.png");
            files.Add(new FileWriteInfo { Path = basePath, Content = job.BaseImage, Encoding = FileEncodings.BASE64 });
        }
        var marks = new List<string>();
        for (var i = 0; i < job.Marks.Count; i++)
        {
            var path = GeneratedImage.InputPath(session.SessionId, $"marcacao-{request.RequestId}-{i + 1}.png");
            marks.Add(path);
            files.Add(new FileWriteInfo { Path = path, Content = job.Marks[i].Png, Encoding = FileEncodings.BASE64 });
        }
        return new RunInfo
        {
            RequestId = request.RequestId,
            SessionId = request.SessionId,
            Engine = RunInfo.ENGINE_CODEX,
            Resume = session.ThreadId,
            SystemPrompt = string.Empty,
            Prompt = MapGeneratorPrompt.Build(job.Text, GeneratedImage.OutputPath(session.SessionId, session.NextVersion), basePath, marks),
            Images = new List<PromptImageInfo>(),
            Files = files,
            Watch = new List<string> { GeneratedImage.Folder(session.SessionId) },
        };
    }

    /// <summary>A run still going after <paramref name="timeout"/> (the generator's, the GM's) is stopped on its console.</summary>
    private async Task TimeOutAsync(long requestId, TimeSpan timeout)
    {
        try
        {
            await Task.Delay(timeout, _time);
            var request = _connections.Get(requestId);
            if (request is not { State: RequestState.Running, AgentConnectionId: { } agent })
                return;
            request.TimedOut = true;
            await _hub.Clients.Client(agent).SendAsync(AnimationHub.STOP_METHOD, requestId);
        }
        catch
        {
            // Best effort.
        }
    }

    /// <summary>The map the generator edits must be the user's own (095); returns it, or throws like the services.</summary>
    public async Task<MapModelInfo> OwnMapModelAsync(long userId, long mapModelId)
    {
        using var scope = _scopes.CreateScope();
        var models = scope.ServiceProvider.GetRequiredService<IMapModelService>();
        var model = await models.GetByIdAsync(mapModelId);
        if (model.UserId != userId)
            throw new UnauthorizedAccessException();
        return model;
    }

    private async Task<RunInfo> AnimationRunAsync(EditorRequest request)
    {
        using var scope = _scopes.CreateScope();
        var animations = scope.ServiceProvider.GetRequiredService<IAnimationService>();
        // 091: the editor's edit version when it sent one, else the library's content.
        var content = request.Content ?? await animations.ReadContentAsync(request.AnimationId);
        // 094: the prints show this until the Claude writes a new valid file.
        request.SetLatest(content);
        var animation = new Animation { AnimationId = request.AnimationId, Name = request.AnimationName };
        var conversation = new AnimationConversation { ClaudeSessionId = request.SessionId, Started = request.SessionStarted };
        return AnimationRequestBuilder.Build(animation, content, conversation, request.RequestId, request.Prompt, request.Images,
            request.ModelName, request.ModelWeapons);
    }

    /// <summary>
    /// A request ended: a question becomes its answer in the chat (or fails); an animation request stores what the Claude
    /// said and tells the editors.
    /// </summary>
    public async Task FinishAsync(EditorRequest request, RequestOutcomeInfo outcome)
    {
        // 094: a print still on its way answers the Claude that the request is over.
        request.FailPendingPrints(PrintRequest.ENDED);
        // 096: a GM run tells the turn service how it ended; the chat lines and the notice are its business.
        if (request.Gm is { } gmJob)
        {
            using var gmScope = _scopes.CreateScope();
            await gmScope.ServiceProvider.GetRequiredService<IGmService>().CompleteAsync(gmJob, new GmOutcome(outcome.Kind, outcome.Message,
                outcome.PermissionDenials, request.TimedOut, request.StoppedByMaster, request.Text.Trim()));
            return;
        }
        // 095: a generator request only tells its tab; nothing is stored (Q3 = B).
        if (request.Generator is { } job)
        {
            if (_connections.GeneratorOf(job.SessionId) is { } session)
            {
                var ended = request.TimedOut
                    ? new RequestOutcomeInfo { Kind = RequestOutcomeInfo.FAILED, Message = GENERATOR_TIMED_OUT }
                    : outcome;
                await _hub.Clients.Client(session.ConnectionId).SendAsync(AnimationHub.GENERATOR_FINISHED_METHOD, new GeneratorFinishedInfo
                {
                    SessionId = session.SessionId,
                    RequestId = request.RequestId,
                    Outcome = ended,
                    Text = request.Text.Trim(),
                });
            }
            return;
        }
        using var scope = _scopes.CreateScope();
        if (request.Ask is { } ask)
        {
            var asks = scope.ServiceProvider.GetRequiredService<IAskService>();
            var text = request.Text.Trim();
            if (outcome.Kind == RequestOutcomeInfo.DONE && text.Length > 0)
                await asks.CompleteAsync(ask.TurnId, text);
            else
                await asks.FailAsync(ask.TurnId);
            return;
        }

        var conversations = scope.ServiceProvider.GetRequiredService<IAnimationConversationService>();
        EditorMessageInfo? message = null;
        var said = request.Text;
        if (said.Length > 0)
            message = AnimationHub.ToDto(await conversations.AddMessageAsync(request.ConversationId, ConversationRole.Claude, said));
        if (outcome.Kind != RequestOutcomeInfo.DONE)
        {
            var reason = string.IsNullOrWhiteSpace(outcome.Message)
                ? (outcome.Kind == RequestOutcomeInfo.STOPPED ? AnimationHub.STOPPED : "O pedido falhou.")
                : outcome.Message;
            await conversations.AddMessageAsync(request.ConversationId, ConversationRole.Notice, reason);
        }
        if (request.Started)
            await conversations.MarkStartedAsync(request.ConversationId);
        await _hub.Clients.Group(AnimationConnections.GroupName(request.AnimationId)).SendAsync(AnimationHub.REQUEST_FINISHED_METHOD, new RequestFinishedInfo
        {
            RequestId = request.RequestId,
            AnimationId = request.AnimationId,
            Outcome = outcome,
            Message = message,
        });
    }

    /// <summary>A tool call of a running request (094): answered to the console that made it, whatever happens.</summary>
    public async Task HandleToolCallAsync(long requestId, string agentConnectionId, ToolCallInfo call)
    {
        ToolResultInfo result;
        try
        {
            result = await ToolResultAsync(requestId, call);
        }
        catch (Exception ex)
        {
            result = ToolResultInfo.Error(call.CallId, ex.Message);
        }
        try
        {
            await _hub.Clients.Client(agentConnectionId).SendAsync(AnimationHub.TOOL_RESULT_METHOD, result);
        }
        catch
        {
            // The console left; its own wait ends with a timeout.
        }
    }

    /// <summary>
    /// <c>print_stage</c> (094, contracts/editor-prints.md): the arguments parsed, the last file valid, the limit kept,
    /// then the editor tab that sent the request draws the shots of the latest version and answers within 20 s.
    /// </summary>
    public async Task<ToolResultInfo> ToolResultAsync(long requestId, ToolCallInfo call)
    {
        var request = _connections.Get(requestId);
        if (request == null || request.State != RequestState.Running)
            return ToolResultInfo.Error(call.CallId, PrintRequest.ENDED);
        if (request.IsAsk || call.Name != PrintRequest.TOOL_NAME)
            return ToolResultInfo.Error(call.CallId, string.Format(PrintRequest.UNKNOWN_TOOL, call.Name));
        var parse = PrintRequest.Parse(call.Arguments);
        if (!parse.IsValid)
            return ToolResultInfo.Error(call.CallId, parse.Error!);
        if (request.LatestError is { } invalid)
            return ToolResultInfo.Error(call.CallId, string.Format(PrintRequest.INVALID_FILE, invalid));
        if (request.LatestContent is not { } content)
            return ToolResultInfo.Error(call.CallId, PrintRequest.ENDED);
        var editor = request.EditorConnectionId;
        if (editor == null || !_connections.EditorsOf(request.AnimationId).Contains(editor))
            return ToolResultInfo.Error(call.CallId, PrintRequest.NO_EDITOR);
        if (!request.TryReservePrints(parse.Shots.Count, PrintRequest.MAX_PER_REQUEST))
            return ToolResultInfo.Error(call.CallId, PrintRequest.LIMIT);

        var waiting = request.AddPendingPrint(call.CallId);
        await _hub.Clients.Client(editor).SendAsync(AnimationHub.PRINT_REQUESTED_METHOD, new PrintRequestInfo
        {
            RequestId = request.RequestId,
            CallId = call.CallId,
            Content = content,
            Shots = parse.Shots.ToList(),
        });
        var finished = await Task.WhenAny(waiting, Task.Delay(PrintTimeout, _time));
        if (finished != waiting)
        {
            request.DropPrint(call.CallId);
            return ToolResultInfo.Error(call.CallId, PrintRequest.TIMED_OUT);
        }
        var printed = await waiting;
        if (printed.Error != null)
            return ToolResultInfo.Error(call.CallId, printed.Error);
        if (printed.Shots.Count == 0)
            return ToolResultInfo.Error(call.CallId, PrintRequest.NO_SHOTS);
        return new ToolResultInfo
        {
            CallId = call.CallId,
            Text = PrintRequest.ResultText(printed.Shots.Select(s => s.Caption).ToList()),
            Images = printed.Shots.Select(s => new ToolImageInfo { MediaType = "image/png", Data = s.Png }).ToList(),
        };
    }

    public async Task SendAgentStatusAsync(long userId)
    {
        // 095: generator tabs follow the agent too.
        var editors = _connections.EditorsOfUser(userId).Concat(_connections.GeneratorConnectionsOfUser(userId)).Distinct().ToList();
        if (editors.Count > 0)
            await _hub.Clients.Clients(editors).SendAsync(AnimationHub.AGENT_STATUS_METHOD, _connections.AgentStatusOf(userId));
    }

    /// <summary>
    /// The user's console connected or dropped (093): every campaign they master learns whether "Perguntar" is available.
    /// Never throws — the agent itself must not fail because a table event could not go out.
    /// </summary>
    public async Task PublishAskChangedAsync(long userId)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            var campaigns = scope.ServiceProvider.GetRequiredService<ICampaignRepository<Campaign>>();
            var available = IsAgentConnected(userId);
            foreach (var campaignId in await campaigns.ListIdsByOwnerAsync(userId))
                await _notifier.PublishAsync(TableEvents.Create(TableEventType.ASK_CHANGED, campaignId, userId, data: new { available }));
        }
        catch
        {
            // Best effort: the chat also reads the status when it opens.
        }
    }
}
