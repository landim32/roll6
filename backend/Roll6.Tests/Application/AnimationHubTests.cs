using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Roll6.Application.Auth;
using Roll6.Application.Realtime;
using Roll6.Domain.Enums;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.Animation;
using Roll6.DTO.Realtime.Animation;
using Roll6.DTO.Realtime.Console;

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
        return new AnimationHub(_animations.Object, _conversations.Object, _connections, new TestClock(NOW))
        {
            Clients = _clients.Object,
            Groups = _groups.Object,
            Context = context.Object,
        };
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
}
