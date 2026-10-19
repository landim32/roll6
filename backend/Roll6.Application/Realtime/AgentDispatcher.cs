using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Roll6.Domain.Animations;
using Roll6.Domain.Asks;
using Roll6.Domain.Enums;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
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
public sealed class AgentDispatcher : IAskDispatcher
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

    public bool IsAgentConnected(long userId) => _connections.AgentStatusOf(userId).Connected;

    public async Task EnqueueAsync(AskJob job)
    {
        if (_connections.EnqueueAsk(job, Now) == null)
            return;
        await DispatchAsync(job.MasterUserId);
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
                run = request.Ask is { } ask ? AskRun(request, ask) : await AnimationRunAsync(request);
            }
            catch (Exception ex)
            {
                var failed = _connections.Finish(request.RequestId);
                if (failed != null)
                    await FinishAsync(failed, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.FAILED, Message = ex.Message });
                continue;
            }
            await _hub.Clients.Client(agentConnectionId).SendAsync(AnimationHub.RUN_METHOD, run);
            if (!request.IsAsk)
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

    private async Task<RunInfo> AnimationRunAsync(EditorRequest request)
    {
        using var scope = _scopes.CreateScope();
        var animations = scope.ServiceProvider.GetRequiredService<IAnimationService>();
        // 091: the editor's edit version when it sent one, else the library's content.
        var content = request.Content ?? await animations.ReadContentAsync(request.AnimationId);
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

    public async Task SendAgentStatusAsync(long userId)
    {
        var editors = _connections.EditorsOfUser(userId);
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
