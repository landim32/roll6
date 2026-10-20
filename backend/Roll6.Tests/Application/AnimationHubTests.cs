using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using Roll6.Domain.Gm;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Roll6.Application.Auth;
using Roll6.Application.Realtime;
using Roll6.Domain.Enums;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.Animation;
using Roll6.DTO.Realtime.Animation;
using Roll6.DTO.Realtime;
using Roll6.DTO.Realtime.Console;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Application;

/// <summary>
/// The animation editor hub (086, contracts/agent-protocol.md) with faked clients: who may register, who may open, how a
/// request reaches the console as a generic <c>run</c>, how its files come back as versions or notices, and the queue.
/// </summary>
public class AnimationHubTests
{
    private static readonly DateTime NOW = new(2026, 10, 18, 12, 0, 0, DateTimeKind.Utc);
    private static readonly JsonElement CONTENT = JsonDocument.Parse("""{"duration":1,"loop":true,"tracks":[]}""").RootElement;

    private readonly Mock<IAnimationService> _animations = new();
    private readonly Mock<IAnimationConversationService> _conversations = new();
    private readonly AnimationConnections _connections = new();
    private readonly Mock<IHubCallerClients> _clients = new();
    private readonly Mock<IGroupManager> _groups = new();
    /// <summary>Every message sent, by target ("group:animation:7", "client:a1", "clients:e1,e2") then method.</summary>
    private readonly List<(string Target, string Method, object?[] Args)> _sent = new();
    private readonly List<AnimationMessage> _stored = new();

    public AnimationHubTests()
    {
        _animations.Setup(s => s.GetByIdAsync(7)).ReturnsAsync(new AnimationInfo { AnimationId = 7, UserId = 1, Name = "Aceno" });
        _animations.Setup(s => s.GetByIdAsync(99)).ThrowsAsync(new KeyNotFoundException());
        _animations.Setup(s => s.ReadContentAsync(7)).ReturnsAsync(CONTENT);
        _conversations.Setup(s => s.GetOrOpenAsync(1, 7))
            .ReturnsAsync(new AnimationConversation { AnimationConversationId = 100, AnimationId = 7, UserId = 1, ClaudeSessionId = Guid.Parse("11111111-2222-4333-8444-555555555555") });
        _conversations.Setup(s => s.ListMessagesAsync(1, 7)).ReturnsAsync(new List<AnimationMessage>());
        _conversations.Setup(s => s.AddMessageAsync(It.IsAny<long>(), It.IsAny<ConversationRole>(), It.IsAny<string?>(), It.IsAny<int>()))
            .ReturnsAsync((long c, ConversationRole role, string? text, int images) =>
            {
                var message = AnimationMessage.Create(c, role, text, images);
                message.AnimationMessageId = _stored.Count + 1;
                _stored.Add(message);
                return message;
            });

        _clients.Setup(c => c.Group(It.IsAny<string>())).Returns((string name) => Proxy("group:" + name));
        _clients.Setup(c => c.Client(It.IsAny<string>())).Returns((string id) => Proxy("client:" + id));
        _clients.Setup(c => c.Clients(It.IsAny<IReadOnlyList<string>>())).Returns((IReadOnlyList<string> ids) => Proxy("clients:" + string.Join(",", ids)));
    }

    private ISingleClientProxy Proxy(string target)
    {
        var proxy = new Mock<ISingleClientProxy>();
        proxy.Setup(p => p.SendCoreAsync(It.IsAny<string>(), It.IsAny<object?[]>(), It.IsAny<CancellationToken>()))
            .Callback((string method, object?[] args, CancellationToken _) => _sent.Add((target, method, args)))
            .Returns(Task.CompletedTask);
        return proxy.Object;
    }

    private AnimationHub Hub(string connectionId, long userId, bool apiKey)
    {
        var claims = new List<Claim> { new(JwtRegisteredClaimNames.Sub, userId.ToString()), new("name", "Rodrigo") };
        if (apiKey)
            claims.Add(new Claim(AuthConstants.AUTH_METHOD_CLAIM, AuthConstants.API_KEY_METHOD));
        var context = new Mock<HubCallerContext>();
        context.SetupGet(c => c.ConnectionId).Returns(connectionId);
        context.SetupGet(c => c.User).Returns(new ClaimsPrincipal(new ClaimsIdentity(claims, "test")));
        return new AnimationHub(_animations.Object, _conversations.Object, _connections, new TestClock(NOW), Dispatcher)
        {
            Clients = _clients.Object,
            Groups = _groups.Object,
            Context = context.Object,
        };
    }

    // 093: the dispatcher the hub and the chat share, over the same faked clients and scoped services.
    private readonly Mock<IAskService> _asks = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaigns = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly Mock<IMapModelService> _mapModels = new();
    // 096: the GM mode's checks and lines, reached through a scope like the chat.
    private readonly Mock<IGmService> _gm = new();
    private AgentDispatcher? _dispatcher;

    private AgentDispatcher Dispatcher => _dispatcher ??= CreateDispatcher();

    private AgentDispatcher CreateDispatcher()
    {
        var services = new ServiceCollection();
        services.AddSingleton(_animations.Object);
        services.AddSingleton(_conversations.Object);
        services.AddSingleton(_asks.Object);
        services.AddSingleton(_campaigns.Object);
        services.AddSingleton(_mapModels.Object);
        services.AddSingleton(_gm.Object);
        var hubClients = new Mock<IHubClients>();
        hubClients.Setup(c => c.Group(It.IsAny<string>())).Returns((string name) => Proxy("group:" + name));
        hubClients.Setup(c => c.Client(It.IsAny<string>())).Returns((string id) => Proxy("client:" + id));
        hubClients.Setup(c => c.Clients(It.IsAny<IReadOnlyList<string>>())).Returns((IReadOnlyList<string> ids) => Proxy("clients:" + string.Join(",", ids)));
        var hubContext = new Mock<IHubContext<AnimationHub>>();
        hubContext.SetupGet(h => h.Clients).Returns(hubClients.Object);
        return new AgentDispatcher(hubContext.Object, _connections, services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>(),
            _notifier.Object, new TestClock(NOW));
    }

    private T? Sent<T>(string target, string method) where T : class =>
        _sent.Where(s => s.Target == target && s.Method == method).Select(s => s.Args[0] as T).LastOrDefault();

    [Fact]
    public async Task OnlyAnApiKeyConnectionRegistersAnAgent()
    {
        var browser = Hub("b1", 1, apiKey: false);
        var act = () => browser.RegisterAgent(new AgentRegisterInfo { Machine = "PC" });
        await act.Should().ThrowAsync<HubException>().WithMessage("forbidden");

        var console = Hub("a1", 1, apiKey: true);
        var registered = await console.RegisterAgent(new AgentRegisterInfo { Machine = "PC-A", Folder = @"C:\mesa" });

        registered.UserName.Should().Be("Rodrigo");
        _connections.AgentStatusOf(1).Should().BeEquivalentTo(new AgentStatusInfo { Connected = true, Busy = false, Machine = "PC-A" });
    }

    [Fact]
    public async Task OpenEditorIsForTheOwnerOnly()
    {
        var other = Hub("b2", 2, apiKey: false);
        var forbidden = () => other.OpenEditor(7);
        await forbidden.Should().ThrowAsync<HubException>().WithMessage("forbidden");
        var missing = () => other.OpenEditor(99);
        await missing.Should().ThrowAsync<HubException>().WithMessage("not-found");

        var state = await Hub("b1", 1, apiKey: false).OpenEditor(7);

        state.Animation.Name.Should().Be("Aceno");
        state.Content.GetProperty("duration").GetDouble().Should().Be(1);
        state.Conversation.AnimationConversationId.Should().Be(100);
        state.Agent.Connected.Should().BeFalse();
        state.Running.Should().BeNull();
        _groups.Verify(g => g.AddToGroupAsync("b1", "animation:7", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SendRequestNeedsAnAgentAndAValidPayload()
    {
        var browser = Hub("b1", 1, apiKey: false);
        var noAgent = () => browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "oi" });
        await noAgent.Should().ThrowAsync<HubException>().WithMessage("no-agent");

        var invalid = () => browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "" });
        await invalid.Should().ThrowAsync<HubException>().WithMessage("invalid");
        var tooLong = () => browser.SendRequest(new RequestInfo { AnimationId = 7, Text = new string('x', RequestInfo.MAX_TEXT + 1) });
        await tooLong.Should().ThrowAsync<HubException>().WithMessage("invalid");
    }

    [Fact]
    public async Task AQueuedRequestReachesTheAgentAsAGenericRun()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var browser = Hub("b1", 1, apiKey: false);
        await browser.OpenEditor(7);

        var requestId = await browser.SendRequest(new RequestInfo
        {
            AnimationId = 7, Text = " levante o braço ", ModelName = "Orc",
            Images = new List<PromptImageInfo> { new() { Png = "AAAA", Caption = "print" } },
        });

        var run = Sent<RunInfo>("client:a1", "run");
        run.Should().NotBeNull();
        run!.RequestId.Should().Be(requestId);
        run.SessionId.Should().Be(Guid.Parse("11111111-2222-4333-8444-555555555555"));
        run.Started.Should().BeFalse();
        run.Prompt.Should().Be("levante o braço");
        run.Images.Should().ContainSingle().Which.Caption.Should().Be("print");
        run.Files.Should().ContainSingle().Which.Path.Should().Be("animacoes/7-aceno.json");
        run.Watch.Should().Equal("animacoes/");
        run.SystemPrompt.Should().Contain("Modelo mostrado na tela: Orc");
        Sent<RequestStartedInfo>("group:animation:7", "requestStarted")!.Machine.Should().Be("PC-A");
        _stored.Should().ContainSingle().Which.Role.Should().Be(ConversationRole.User);
        _stored[0].ImageCount.Should().Be(1);
        _sent.Should().NotContain(s => s.Method == "requestQueued");

        var busy = () => browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "de novo" });
        await busy.Should().ThrowAsync<HubException>().WithMessage("busy");
    }

    [Fact]
    public async Task ARequestWithoutAFreeAgentIsQueuedWithItsPosition()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        _animations.Setup(s => s.GetByIdAsync(8)).ReturnsAsync(new AnimationInfo { AnimationId = 8, UserId = 1, Name = "Pulo" });
        _animations.Setup(s => s.ReadContentAsync(8)).ReturnsAsync(CONTENT);
        _conversations.Setup(s => s.GetOrOpenAsync(1, 8)).ReturnsAsync(new AnimationConversation { AnimationConversationId = 101, AnimationId = 8, UserId = 1 });
        var browser = Hub("b1", 1, apiKey: false);
        await browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "um" });

        var second = await browser.SendRequest(new RequestInfo { AnimationId = 8, Text = "dois" });

        var queued = Sent<RequestQueuedInfo>("group:animation:8", "requestQueued");
        queued!.RequestId.Should().Be(second);
        queued.Position.Should().Be(1);
        _sent.Count(s => s.Method == "run").Should().Be(1);
    }

    [Fact]
    public async Task TheWorkingFileBecomesADraftAndABadOneANotice()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var browser = Hub("b1", 1, apiKey: false);
        await browser.OpenEditor(7);
        var requestId = await browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "oi" });
        var console = Hub("a1", 1, apiKey: true);

        await console.FileChanged(requestId, new FileChangedInfo
        {
            Path = "animacoes/7-aceno.json",
            Content = """{"format":"roll6-animation","version":1,"duration":1,"loop":true,"tracks":[{"bone":"LeftArm","times":[0,1],"degrees":[[0,0,-150],[0,0,-120]]}]}""",
        });
        await console.FileChanged(requestId, new FileChangedInfo { Path = "animacoes/7-aceno.json", Content = "{ broken" });
        await console.FileChanged(requestId, new FileChangedInfo { Path = "animacoes/7-aceno.json", Content = """{"duration":-1}""" });
        await console.FileChanged(requestId, new FileChangedInfo { Path = "animacoes/novo.json", Content = "{}" });
        await console.FileChanged(requestId, new FileChangedInfo { Path = "outra/x.json", Content = "{}" });
        await Hub("a2", 1, apiKey: true).FileChanged(requestId, new FileChangedInfo { Path = "animacoes/7-aceno.json", Content = "{}" });

        // 091: a valid working file is relayed to the editor as an unsaved edit and never stored.
        _animations.Verify(s => s.ReplaceContentAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<AnimationContentInfo>(), It.IsAny<string>()), Times.Never);
        var drafts = _sent.Where(s => s.Method == "draftVersion").ToList();
        drafts.Should().ContainSingle();
        drafts[0].Target.Should().Be("group:animation:7");
        var draft = (DraftVersionInfo)drafts[0].Args[0]!;
        draft.RequestId.Should().Be(requestId);
        draft.AnimationId.Should().Be(7);
        draft.Content.GetProperty("tracks")[0].GetProperty("bone").GetString().Should().Be("LeftArm");
        var notices = _sent.Where(s => s.Method == "requestProgress").Select(s => ((RequestProgressInfo)s.Args[0]!).Event).Where(e => e.Kind == "notice").ToList();
        notices.Should().HaveCount(3);
        notices[0].Text.Should().StartWith("Arquivo inválido: JSON malformado");
        notices[1].Text.Should().StartWith("Arquivo inválido: ");
        notices[2].Text.Should().Be("O Claude criou novo.json");
        _stored.Count(m => m.Role == ConversationRole.Notice).Should().Be(3);
    }

    [Fact]
    public async Task ARequestCarriesTheEditVersionToTheRun()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var browser = Hub("b1", 1, apiKey: false);
        var edit = JsonDocument.Parse("""{"format":"roll6-animation","version":1,"duration":1,"loop":true,"tracks":[{"bone":"LeftArm","times":[0,1],"degrees":[[0,0,-150],[0,0,-120]]}]}""").RootElement;

        await browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "oi", Content = edit });

        var file = Sent<RunInfo>("client:a1", "run")!.Files.Should().ContainSingle().Subject;
        file.Content.Should().Contain("LeftArm");
        _animations.Verify(s => s.ReadContentAsync(7), Times.Never);
    }

    [Fact]
    public async Task TheWeaponsOfTheModelReachTheContextAndAreBounded()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var browser = Hub("b1", 1, apiKey: false);

        var tooMany = () => browser.SendRequest(new RequestInfo
        {
            AnimationId = 7, Text = "oi", ModelWeapons = Enumerable.Range(1, RequestInfo.MAX_WEAPONS + 1).Select(i => $"Arma {i}").ToList(),
        });
        await tooMany.Should().ThrowAsync<HubException>().WithMessage("invalid");
        var tooLong = () => browser.SendRequest(new RequestInfo
        {
            AnimationId = 7, Text = "oi", ModelWeapons = new List<string> { new('x', RequestInfo.MAX_WEAPON_TEXT + 1) },
        });
        await tooLong.Should().ThrowAsync<HubException>().WithMessage("invalid");

        await browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "oi", ModelWeapons = new List<string> { "Espada (mão direita)" } });

        Sent<RunInfo>("client:a1", "run")!.SystemPrompt.Should().Contain("Armas do modelo: Espada (mão direita)");
    }

    [Fact]
    public async Task ARequestWithAnInvalidEditVersionIsRefused()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var browser = Hub("b1", 1, apiKey: false);
        var broken = JsonDocument.Parse("""{"duration":-1}""").RootElement;

        var act = () => browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "oi", Content = broken });

        await act.Should().ThrowAsync<HubException>().WithMessage("invalid");
        _sent.Should().NotContain(s => s.Method == "run");
    }

    [Fact]
    public async Task ProgressAndFinishedStoreTheAnswerAndAdvanceTheQueue()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        _animations.Setup(s => s.GetByIdAsync(8)).ReturnsAsync(new AnimationInfo { AnimationId = 8, UserId = 1, Name = "Pulo" });
        _animations.Setup(s => s.ReadContentAsync(8)).ReturnsAsync(CONTENT);
        _conversations.Setup(s => s.GetOrOpenAsync(1, 8)).ReturnsAsync(new AnimationConversation { AnimationConversationId = 101, AnimationId = 8, UserId = 1 });
        var browser = Hub("b1", 1, apiKey: false);
        await browser.OpenEditor(7);
        var first = await browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "um" });
        var second = await browser.SendRequest(new RequestInfo { AnimationId = 8, Text = "dois" });
        var console = Hub("a1", 1, apiKey: true);

        await console.Progress(first, new ClaudeEventInfo { Kind = "started" });
        await console.Progress(first, new ClaudeEventInfo { Kind = "text", Text = "Pron" });
        await console.Progress(first, new ClaudeEventInfo { Kind = "text", Text = "to." });
        await Hub("a9", 1, apiKey: true).Progress(first, new ClaudeEventInfo { Kind = "text", Text = "intruso" });
        (await browser.OpenEditor(7)).Running!.Text.Should().Be("Pronto.");
        await console.Finished(first, new RequestOutcomeInfo { Kind = "done" });

        var finished = Sent<RequestFinishedInfo>("group:animation:7", "requestFinished")!;
        finished.Outcome.Kind.Should().Be("done");
        finished.Message!.Text.Should().Be("Pronto.");
        _stored.Where(m => m.Role == ConversationRole.Claude).Should().ContainSingle().Which.Text.Should().Be("Pronto.");
        _conversations.Verify(s => s.MarkStartedAsync(100), Times.Once);
        _connections.Running(7).Should().BeNull();
        Sent<RunInfo>("client:a1", "run")!.RequestId.Should().Be(second, "the next queued request started");
        _sent.Count(s => s.Method == "run").Should().Be(2);
    }

    [Fact]
    public async Task StopKillsARunningRequestAndDropsAQueuedOne()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        _animations.Setup(s => s.GetByIdAsync(8)).ReturnsAsync(new AnimationInfo { AnimationId = 8, UserId = 1, Name = "Pulo" });
        _conversations.Setup(s => s.GetOrOpenAsync(1, 8)).ReturnsAsync(new AnimationConversation { AnimationConversationId = 101, AnimationId = 8, UserId = 1 });
        var browser = Hub("b1", 1, apiKey: false);
        var running = await browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "um" });
        var queued = await browser.SendRequest(new RequestInfo { AnimationId = 8, Text = "dois" });

        await browser.StopRequest(running);
        await browser.StopRequest(queued);
        var other = () => Hub("b2", 2, apiKey: false).StopRequest(running);

        _sent.Should().Contain(s => s.Target == "client:a1" && s.Method == "stop" && (long)s.Args[0]! == running);
        Sent<RequestFinishedInfo>("group:animation:8", "requestFinished")!.Outcome.Kind.Should().Be("stopped");
        _connections.Running(8).Should().BeNull();
        _connections.Running(7).Should().NotBeNull("the console answers with Finished(stopped)");
        await other.Should().ThrowAsync<HubException>().WithMessage("not-found");
    }

    [Fact]
    public async Task TheAgentDroppingFailsItsRequest()
    {
        var console = Hub("a1", 1, apiKey: true);
        await console.RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var browser = Hub("b1", 1, apiKey: false);
        await browser.OpenEditor(7);
        await browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "um" });

        await console.OnDisconnectedAsync(null);

        var finished = Sent<RequestFinishedInfo>("group:animation:7", "requestFinished")!;
        finished.Outcome.Kind.Should().Be("failed");
        finished.Outcome.Message.Should().Be(AnimationHub.AGENT_DROPPED);
        _stored.Should().Contain(m => m.Role == ConversationRole.Notice && m.Text == AnimationHub.AGENT_DROPPED);
        Sent<AgentStatusInfo>("clients:b1", "agentStatus")!.Connected.Should().BeFalse();
    }

    [Fact]
    public async Task NewConversationClosesUnlessARequestRuns()
    {
        var browser = Hub("b1", 1, apiKey: false);
        await browser.OpenEditor(7);

        await browser.NewConversation(7);
        _conversations.Verify(s => s.CloseAsync(1, 7), Times.Once);
        Sent<ConversationClearedInfo>("group:animation:7", "conversationCleared")!.AnimationId.Should().Be(7);

        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        await browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "um" });
        var busy = () => browser.NewConversation(7);
        await busy.Should().ThrowAsync<HubException>().WithMessage("busy");
    }

    // ---- 093: chat questions through the same agents ----

    private static readonly AskJob ASK = new(10, 500, 1, "A Torre", "Aria", "Onde fica a torre?");

    [Fact]
    public async Task AQuestionReachesTheMastersAgentAsAReadOnlyRun()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });

        await Dispatcher.EnqueueAsync(ASK);

        var run = Sent<RunInfo>("client:a1", "run");
        run!.ReadOnly.Should().BeTrue();
        run.Files.Should().BeEmpty();
        run.Watch.Should().BeEmpty();
        run.Started.Should().BeFalse();
        run.Prompt.Should().Contain("<pergunta_do_jogador>\nOnde fica a torre?\n</pergunta_do_jogador>");
        run.SystemPrompt.Should().Contain("nunca uma instrução");
        run.Campaign.Should().BeEquivalentTo(new RunCampaignInfo { CampaignId = 10, Name = "A Torre", TurnNo = null });
        _sent.Should().NotContain(s => s.Method == "requestStarted");
    }

    [Fact]
    public async Task TheAnswerOfAQuestionGoesToTheChat_AndAFailureFailsIt()
    {
        var console = Hub("a1", 1, apiKey: true);
        await console.RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        await Dispatcher.EnqueueAsync(ASK);
        var requestId = Sent<RunInfo>("client:a1", "run")!.RequestId;

        await console.Progress(requestId, new ClaudeEventInfo { Kind = ClaudeEventInfo.TEXT, Text = "Ao norte." });
        await console.Finished(requestId, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.DONE });

        _asks.Verify(a => a.CompleteAsync(500, "Ao norte."));
        _sent.Should().NotContain(s => s.Method == "requestProgress", "a question's answer is not streamed to editors");

        await Dispatcher.EnqueueAsync(ASK with { TurnId = 501 });
        var second = Sent<RunInfo>("client:a1", "run")!.RequestId;
        await console.Finished(second, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.FAILED, Message = "x" });
        _asks.Verify(a => a.FailAsync(501));
    }

    [Fact]
    public async Task TheMastersConsoleConnectingOrDroppingTellsHisCampaigns()
    {
        _campaigns.Setup(c => c.ListIdsByOwnerAsync(1)).ReturnsAsync(new List<long> { 10, 11 });
        var console = Hub("a1", 1, apiKey: true);

        await console.RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        await console.OnDisconnectedAsync(null);

        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.ASK_CHANGED && e.CampaignId == 10)), Times.Exactly(2));
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.ASK_CHANGED && e.CampaignId == 11)), Times.Exactly(2));
    }

    [Fact]
    public async Task StoppingAQueuedQuestionDropsIt()
    {
        await Dispatcher.EnqueueAsync(ASK);
        _connections.FindByTurn(500).Should().NotBeNull();

        await Dispatcher.StopAsync(500);

        _connections.FindByTurn(500).Should().BeNull();
    }

    // ---- 096: GM runs through the same agents ----

    private static readonly GmJob GM = new(10, 7, 1, "A Torre");

    private IGmDispatcher GmDispatcher => Dispatcher;

    [Fact]
    public async Task AGmRunReachesTheMastersAgentAsAFreshWritableRun()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        _gm.Verify(g => g.CheckOwnerAsync(1), "the console connecting checks the master's campaigns");

        (await GmDispatcher.EnqueueAsync(GM)).Should().BeTrue();

        var run = Sent<RunInfo>("client:a1", "run");
        run!.ReadOnly.Should().BeFalse("the skill writes the repository and runs its scripts");
        run.Started.Should().BeFalse("a fresh session per run");
        run.Files.Should().BeEmpty();
        run.Watch.Should().BeEmpty();
        run.Tools.Should().BeEmpty();
        run.IsCodex.Should().BeFalse();
        run.Prompt.Should().Contain("campaignId 10").And.Contain("Turno a processar: 7");
        run.SystemPrompt.Should().Contain("skill gm");
        run.Campaign.Should().BeEquivalentTo(new RunCampaignInfo { CampaignId = 10, Name = "A Torre", TurnNo = 7 });
        _gm.Verify(g => g.StartedAsync(GM));
        GmDispatcher.RunningTurnOf(10).Should().Be(7);
        (await GmDispatcher.EnqueueAsync(GM)).Should().BeFalse("one run per campaign at a time");
        _sent.Should().NotContain(s => s.Method == "requestStarted", "no editor tab follows a GM run");
    }

    [Fact]
    public async Task TheEndOfAGmRunReachesTheTurnService()
    {
        var console = Hub("a1", 1, apiKey: true);
        await console.RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        await GmDispatcher.EnqueueAsync(GM);
        var requestId = Sent<RunInfo>("client:a1", "run")!.RequestId;

        await console.Progress(requestId, new ClaudeEventInfo { Kind = ClaudeEventInfo.TEXT, Text = "Turno fechado." });
        await console.Finished(requestId, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.DONE });

        _gm.Verify(g => g.CompleteAsync(GM, It.Is<GmOutcome>(o => o.Kind == RequestOutcomeInfo.DONE && o.Text == "Turno fechado."
            && !o.TimedOut && !o.StoppedByMaster)));
        GmDispatcher.RunningTurnOf(10).Should().BeNull();
        _sent.Should().NotContain(s => s.Method == "requestProgress", "nothing of a GM run is streamed to editors");
    }

    [Fact]
    public async Task TheMasterStopsAGmRun_QueuedOrRunning()
    {
        // Queued (no console yet): dropped at once, reported as stopped by the master.
        await GmDispatcher.EnqueueAsync(GM);
        await GmDispatcher.StopAsync(10);
        _gm.Verify(g => g.CompleteAsync(GM, It.Is<GmOutcome>(o => o.StoppedByMaster)));
        _connections.GmRequestOf(10).Should().BeNull();

        // Running: the console gets "stop" and its Finished carries the flag.
        var console = Hub("a1", 1, apiKey: true);
        await console.RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        await GmDispatcher.EnqueueAsync(GM);
        var requestId = Sent<RunInfo>("client:a1", "run")!.RequestId;
        await GmDispatcher.StopAsync(10);
        _sent.Should().Contain(s => s.Target == "client:a1" && s.Method == AnimationHub.STOP_METHOD);
        await console.Finished(requestId, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.STOPPED });
        _gm.Verify(g => g.CompleteAsync(GM, It.Is<GmOutcome>(o => o.Kind == RequestOutcomeInfo.STOPPED && o.StoppedByMaster && !o.TimedOut)));
        await GmDispatcher.StopAsync(10);
    }

    [Fact]
    public async Task AGmRunThatTakesTooLongIsStoppedOnItsConsole()
    {
        Dispatcher.GmTimeout = TimeSpan.FromMilliseconds(30);
        var console = Hub("a1", 1, apiKey: true);
        await console.RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        await GmDispatcher.EnqueueAsync(GM);
        var requestId = Sent<RunInfo>("client:a1", "run")!.RequestId;

        await Task.Delay(400);

        _sent.Should().Contain(s => s.Target == "client:a1" && s.Method == AnimationHub.STOP_METHOD);
        await console.Finished(requestId, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.STOPPED });
        _gm.Verify(g => g.CompleteAsync(GM, It.Is<GmOutcome>(o => o.TimedOut && !o.StoppedByMaster)));
    }

    // ---------- 094: prints asked by the Claude ----------

    private const string VALID_V2 = """{"format":"roll6-animation","version":1,"duration":1,"loop":true,"tracks":[{"bone":"LeftArm","times":[0,1],"degrees":[[0,0,-150],[0,0,-120]]}]}""";

    private static JsonElement Json(string text) => JsonDocument.Parse(text).RootElement.Clone();

    private static ToolCallInfo PrintCall(string callId, string arguments = "{}") =>
        new() { CallId = callId, Name = "print_stage", Arguments = Json(arguments) };

    /// <summary>A console a1, the editor tab b1 on animation 7 and a running request sent by b1.</summary>
    private async Task<long> RunningRequestAsync()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var browser = Hub("b1", 1, apiKey: false);
        await browser.OpenEditor(7);
        return await browser.SendRequest(new RequestInfo { AnimationId = 7, Text = "levante o braço" });
    }

    [Fact]
    public async Task APrintGoesToTheTabThatSentTheRequestWithTheLatestFileAndComesBackAsImages()
    {
        var requestId = await RunningRequestAsync();
        await Hub("a1", 1, apiKey: true).FileChanged(requestId, new FileChangedInfo { Path = "animacoes/7-aceno.json", Content = VALID_V2 });

        var pending = Dispatcher.ToolResultAsync(requestId, PrintCall("c1", """{"shots":[{"time":0.5,"view":"right","skeleton":true},{}]}"""));

        var asked = Sent<PrintRequestInfo>("client:b1", "printRequested");
        asked.Should().NotBeNull();
        asked!.CallId.Should().Be("c1");
        asked.Content.GetProperty("tracks")[0].GetProperty("bone").GetString().Should().Be("LeftArm", "the latest file the Claude wrote");
        asked.Shots.Select(s => s.View).Should().Equal("right", "three-quarter");
        await Hub("b1", 1, apiKey: false).PrintResult(new PrintResultInfo
        {
            CallId = "c1",
            Shots = new List<PrintedShotInfo> { new() { Png = "AAAA", Caption = "de lado" }, new() { Png = "BBBB", Caption = "três quartos" } },
        });
        var result = await pending;

        result.IsError.Should().BeFalse();
        result.Text.Should().Be("Print 1: de lado\nPrint 2: três quartos");
        result.Images.Select(i => i.Data).Should().Equal("AAAA", "BBBB");
    }

    [Fact]
    public async Task PrintsAreRefusedWithAReasonTheClaudeCanRead()
    {
        var requestId = await RunningRequestAsync();

        (await Dispatcher.ToolResultAsync(requestId, PrintCall("c1", """{"shots":[{"view":"diagonal"}]}""")))
            .Text.Should().StartWith("Pedido de print inválido");
        (await Dispatcher.ToolResultAsync(requestId, new ToolCallInfo { CallId = "c2", Name = "outra" }))
            .Text.Should().Be("Ferramenta desconhecida: outra.");

        await Hub("a1", 1, apiKey: true).FileChanged(requestId, new FileChangedInfo { Path = "animacoes/7-aceno.json", Content = "{ broken" });
        var invalid = await Dispatcher.ToolResultAsync(requestId, PrintCall("c3"));
        invalid.IsError.Should().BeTrue();
        invalid.Text.Should().StartWith("O arquivo atual não é uma animação válida");
        _sent.Should().NotContain(s => s.Method == "printRequested");
    }

    [Fact]
    public async Task ThirtyPrintsPerRequestAtMost()
    {
        var requestId = await RunningRequestAsync();
        _connections.Get(requestId)!.TryReservePrints(28, 30).Should().BeTrue();

        var over = await Dispatcher.ToolResultAsync(requestId, PrintCall("c1", """{"shots":[{},{},{}]}"""));

        over.Text.Should().Be("Limite de 30 prints por pedido atingido.");
    }

    [Fact]
    public async Task AClosedTabOrASilentOneEndsThePrintWithAnError()
    {
        var requestId = await RunningRequestAsync();
        Dispatcher.PrintTimeout = TimeSpan.FromMilliseconds(50);

        var silent = await Dispatcher.ToolResultAsync(requestId, PrintCall("c1"));
        silent.Text.Should().Be("O editor não respondeu em 20 s; tente de novo.");

        var waiting = Dispatcher.ToolResultAsync(requestId, PrintCall("c2"));
        Dispatcher.PrintTimeout = TimeSpan.FromSeconds(20);
        await Hub("b1", 1, apiKey: false).OnDisconnectedAsync(null);
        (await waiting).Text.Should().Be("O editor não está aberto; não há como tirar o print.", "the tab left while it was printing");

        var gone = await Dispatcher.ToolResultAsync(requestId, PrintCall("c3"));
        gone.Text.Should().Be("O editor não está aberto; não há como tirar o print.");
    }

    [Fact]
    public async Task TheEndOfTheRequestAnswersAPrintStillOnItsWay()
    {
        var requestId = await RunningRequestAsync();
        var waiting = Dispatcher.ToolResultAsync(requestId, PrintCall("c1"));

        await Hub("a1", 1, apiKey: true).Finished(requestId, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.DONE });

        (await waiting).Text.Should().Be("O pedido foi encerrado.");
    }

    [Fact]
    public async Task ToolCallsAndPrintResultsFromOtherConnectionsAreIgnored()
    {
        var requestId = await RunningRequestAsync();
        await Hub("a2", 1, apiKey: true).ToolCall(requestId, PrintCall("c1"));
        await Task.Delay(50);
        _sent.Should().NotContain(s => s.Method == "toolResult" || s.Method == "printRequested");

        var waiting = Dispatcher.ToolResultAsync(requestId, PrintCall("c2"));
        await Hub("b9", 1, apiKey: false).PrintResult(new PrintResultInfo { CallId = "c2", Shots = new List<PrintedShotInfo> { new() { Png = "AAAA" } } });
        waiting.IsCompleted.Should().BeFalse("only the tab that sent the request answers");
        await Hub("b1", 1, apiKey: false).PrintResult(new PrintResultInfo { CallId = "c2", Error = "Escolha um modelo 3D no editor para tirar prints." });
        (await waiting).Text.Should().Be("Escolha um modelo 3D no editor para tirar prints.");
    }

    [Fact]
    public async Task TheRunOfARequestOffersPrintStageAndAQuestionDoesNot()
    {
        await RunningRequestAsync();

        var run = Sent<RunInfo>("client:a1", "run");
        run!.Tools.Should().ContainSingle().Which.Name.Should().Be("print_stage");
        run.SystemPrompt.Should().Contain("print_stage");
        AgentDispatcher.AskRun(_connections.EnqueueAsk(new AskJob(1, 500, 1, "Mesa", "Aria", "oi"), NOW)!, new AskJob(1, 500, 1, "Mesa", "Aria", "oi"))
            .Tools.Should().BeEmpty();
    }

    // ---------- 095: the map generator ----------

    private static readonly string PNG64 = Convert.ToBase64String(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 7, 7 });

    [Fact]
    public async Task AGeneratorRequestRunsOnTheCodexWithTheTopDownRulesAndResumesItsThread()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var tab = Hub("g1", 1, apiKey: false);
        var opened = await tab.OpenGenerator(null);

        var first = await tab.SendGeneratorRequest(new GeneratorRequestInfo { SessionId = opened.SessionId, Text = "taverna com lareira" });

        var run = Sent<RunInfo>("client:a1", "run")!;
        run.Engine.Should().Be("codex");
        run.Resume.Should().BeNull();
        run.Prompt.Should().Contain("TOP-DOWN ORTHOGRAPHIC PLAN VIEW").And.Contain($"mapas-gerados/{opened.SessionId}/versao-1.png");
        run.Watch.Should().Equal($"mapas-gerados/{opened.SessionId}/");
        Sent<GeneratorStartedInfo>("client:g1", "generatorStarted")!.RequestId.Should().Be(first);

        var console = Hub("a1", 1, apiKey: true);
        await console.Progress(first, new ClaudeEventInfo { Kind = "started", Text = "01a1525c-287c-7241-82a1-6fca5b99a154" });
        await console.FileChanged(first, new FileChangedInfo { Path = $"mapas-gerados/{opened.SessionId}/versao-1.png", Content = PNG64, Encoding = "base64" });
        await console.Finished(first, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.DONE });

        var image = Sent<GeneratorImageInfo>("client:g1", "generatorImage")!;
        image.Version.Should().Be(1);
        image.MediaType.Should().Be("image/png");
        Sent<GeneratorFinishedInfo>("client:g1", "generatorFinished")!.Outcome.Kind.Should().Be("done");
        Sent<GeneratorProgressInfo>("client:g1", "generatorProgress")!.Event.Text.Should().BeNull("the thread id stays on the server");
        _stored.Should().BeEmpty("nothing of the generator is stored");

        await tab.SendGeneratorRequest(new GeneratorRequestInfo { SessionId = opened.SessionId, Text = "mais mesas", BaseImage = PNG64 });
        var second = Sent<RunInfo>("client:a1", "run")!;
        second.Resume.Should().Be("01a1525c-287c-7241-82a1-6fca5b99a154");
        second.Prompt.Should().Contain($"versao-2.png").And.Contain("é o mapa atual");
        second.Files.Should().ContainSingle(f => f.Encoding == "base64" && f.Path.Contains("/entrada/base-"));
    }

    [Fact]
    public async Task GeneratorFilesThatAreNotValidImagesBecomeNotices()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var tab = Hub("g1", 1, apiKey: false);
        var opened = await tab.OpenGenerator(null);
        var requestId = await tab.SendGeneratorRequest(new GeneratorRequestInfo { SessionId = opened.SessionId, Text = "caverna" });
        var console = Hub("a1", 1, apiKey: true);

        await console.FileChanged(requestId, new FileChangedInfo { Path = $"mapas-gerados/{opened.SessionId}/versao-1.png", Content = Convert.ToBase64String("GIF89a"u8.ToArray()), Encoding = "base64" });
        await console.FileChanged(requestId, new FileChangedInfo { Path = $"mapas-gerados/{opened.SessionId}/notas.txt", Content = "oi" });
        await console.FileChanged(requestId, new FileChangedInfo { Path = $"mapas-gerados/{opened.SessionId}/entrada/base-1.png", Content = PNG64, Encoding = "base64" });

        _sent.Should().NotContain(s => s.Method == "generatorImage");
        var notices = _sent.Where(s => s.Method == "generatorProgress").Select(s => ((GeneratorProgressInfo)s.Args[0]!).Event.Text).ToList();
        notices.Should().Equal("A imagem versao-1.png não é um PNG, JPEG ou WebP válido de até 10 MB.", "Arquivo ignorado: notas.txt");
    }

    [Fact]
    public async Task TheGeneratorRefusesBadRequestsAndOtherTabs()
    {
        var tab = Hub("g1", 1, apiKey: false);
        var opened = await tab.OpenGenerator(null);

        var noAgent = () => tab.SendGeneratorRequest(new GeneratorRequestInfo { SessionId = opened.SessionId, Text = "oi" });
        await noAgent.Should().ThrowAsync<HubException>().WithMessage("no-agent");
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var empty = () => tab.SendGeneratorRequest(new GeneratorRequestInfo { SessionId = opened.SessionId, Text = " " });
        await empty.Should().ThrowAsync<HubException>().WithMessage("invalid");
        var notImage = () => tab.SendGeneratorRequest(new GeneratorRequestInfo { SessionId = opened.SessionId, Text = "oi", BaseImage = Convert.ToBase64String("texto"u8.ToArray()) });
        await notImage.Should().ThrowAsync<HubException>().WithMessage("invalid");
        var otherTab = () => Hub("g2", 1, apiKey: false).SendGeneratorRequest(new GeneratorRequestInfo { SessionId = opened.SessionId, Text = "oi" });
        await otherTab.Should().ThrowAsync<HubException>().WithMessage("not-found");

        await tab.SendGeneratorRequest(new GeneratorRequestInfo { SessionId = opened.SessionId, Text = "oi" });
        var busy = () => tab.SendGeneratorRequest(new GeneratorRequestInfo { SessionId = opened.SessionId, Text = "de novo" });
        await busy.Should().ThrowAsync<HubException>().WithMessage("busy");
    }

    [Fact]
    public async Task OnlyAnOwnMapOpensForEditing()
    {
        _mapModels.Setup(s => s.GetByIdAsync(40)).ReturnsAsync(new Roll6.DTO.MapModel.MapModelInfo { MapModelId = 40, UserId = 1, Name = "Taverna" });
        _mapModels.Setup(s => s.GetByIdAsync(41)).ReturnsAsync(new Roll6.DTO.MapModel.MapModelInfo { MapModelId = 41, UserId = 2, Name = "Alheio" });
        _mapModels.Setup(s => s.GetByIdAsync(42)).ThrowsAsync(new KeyNotFoundException());
        var tab = Hub("g1", 1, apiKey: false);

        (await tab.OpenGenerator(40)).MapModelId.Should().Be(40);
        var other = () => tab.OpenGenerator(41);
        await other.Should().ThrowAsync<HubException>().WithMessage("forbidden");
        var missing = () => tab.OpenGenerator(42);
        await missing.Should().ThrowAsync<HubException>().WithMessage("not-found");
    }

    [Fact]
    public async Task AClosedTabStopsItsRunningGeneratorRequest()
    {
        await Hub("a1", 1, apiKey: true).RegisterAgent(new AgentRegisterInfo { Machine = "PC-A" });
        var tab = Hub("g1", 1, apiKey: false);
        var opened = await tab.OpenGenerator(null);
        var requestId = await tab.SendGeneratorRequest(new GeneratorRequestInfo { SessionId = opened.SessionId, Text = "floresta" });

        await tab.OnDisconnectedAsync(null);

        _sent.Should().Contain(s => s.Target == "client:a1" && s.Method == "stop" && (long)s.Args[0]! == requestId);
        _connections.GeneratorOf(opened.SessionId).Should().BeNull();
    }
}
