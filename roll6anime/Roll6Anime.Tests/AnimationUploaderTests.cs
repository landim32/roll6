using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Roll6Anime.Core.Upload;

namespace Roll6Anime.Tests;

/// <summary>"Enviar ao Roll6" (067): the access, the Roll6's messages and the create-or-update decision.</summary>
public sealed class AnimationUploaderTests
{
    private static readonly JsonElement CONTENT = JsonDocument.Parse("""{ "format": "roll6-animation" }""").RootElement;

    [Fact]
    public void TheEnvironmentWinsAndTheMcpAddressBecomesTheSite()
    {
        var env = new Dictionary<string, string?> { ["ROLL6_URL"] = "https://roll6.site/mcp/", ["ROLL6_API_KEY"] = " r6_abc " };

        var connection = Roll6Connection.Resolve(@"C:\x", name => env.GetValueOrDefault(name), claudeJsonPath: "missing.json");

        connection!.ApiBase.Should().Be("https://roll6.site");
        connection.Headers["X-Api-Key"].Should().Be("r6_abc");
    }

    [Fact]
    public void TheWorkingDirectoryProjectIsPreferred()
    {
        const string JSON = """
            { "mcpServers": { "roll6": { "url": "https://other.site/mcp", "headers": { "X-Api-Key": "r6_global" } } },
              "projects": { "C:/repos/gurps-adventure": { "mcpServers": {
                  "roll6": { "type": "http", "url": "https://roll6.site/mcp", "headers": { "X-Api-Key": "r6_table" } } } } } }
            """;

        var connection = Roll6Connection.FromClaudeJson(JSON, @"C:\repos\gurps-adventure\");

        connection!.ApiBase.Should().Be("https://roll6.site");
        connection.Headers["X-Api-Key"].Should().Be("r6_table");
        Roll6Connection.FromClaudeJson(JSON, @"C:\elsewhere")!.Headers["X-Api-Key"].Should().Be("r6_global");
    }

    [Fact]
    public void NoServerOrNoKeyIsNoConnection()
    {
        Roll6Connection.FromClaudeJson("""{ "projects": {} }""", null).Should().BeNull();
        Roll6Connection.FromClaudeJson("""{ "roll6": { "url": "https://roll6.site/mcp" } }""", null).Should().BeNull();
        Roll6Connection.FromClaudeJson("not json", null).Should().BeNull();
    }

    [Fact]
    public void TheProblemMessageIsTheFirstValidationError()
    {
        const string BODY = """{ "title": "One or more validation errors occurred.", "errors": { "content.tracks[0].bone": ["Osso desconhecido."] } }""";

        Roll6Api.ProblemMessage(HttpStatusCode.BadRequest, BODY).Should().Be("content.tracks[0].bone: Osso desconhecido.");
        Roll6Api.ProblemMessage(HttpStatusCode.Conflict, """{ "detail": "Esta animação está em uso." }""").Should().Be("Esta animação está em uso.");
        Roll6Api.ProblemMessage(HttpStatusCode.InternalServerError, "falhou").Should().Be("falhou");
        Roll6Api.ProblemMessage(HttpStatusCode.Unauthorized, "").Should().Contain("chave de API");
    }

    [Fact]
    public async Task WithoutAnyMatchItCreates()
    {
        var api = new FakeApi();
        var uploader = new AnimationUploader(api);

        var plan = await uploader.PlanAsync("  Ogro Parado  ", 1, null);
        var sent = await uploader.SendAsync(plan, plan.Name, 1, CONTENT);

        plan.Creates.Should().BeTrue();
        plan.Name.Should().Be("Ogro Parado");
        api.Created.Should().Equal(("Ogro Parado", 1));
        sent.AnimationId.Should().Be(100);
    }

    [Fact]
    public async Task TheLinkedAnimationIsUpdated()
    {
        var api = new FakeApi();
        api.Remote[7] = new RemoteAnimation(7, FakeApi.ME, "Ogro Parado 1", 1);
        var uploader = new AnimationUploader(api);

        var plan = await uploader.PlanAsync("ogro-parado", null, 7);
        await uploader.SendAsync(plan, "Ogro Parado 2", 1, CONTENT);

        plan.Existing!.AnimationId.Should().Be(7);
        plan.Name.Should().Be("Ogro Parado 1");
        plan.Type.Should().Be(1);
        api.Updated.Should().Equal((7L, "Ogro Parado 2", 1));
        api.Created.Should().BeEmpty();
    }

    [Fact]
    public async Task AGoneOrForeignLinkFallsBackToTheSameNameAmongMine()
    {
        var api = new FakeApi();
        api.Remote[3] = new RemoteAnimation(3, 99, "Aceno", 1);
        api.Remote[9] = new RemoteAnimation(9, FakeApi.ME, "Aceno largo", 1);
        api.Remote[8] = new RemoteAnimation(8, FakeApi.ME, "ACENO", 7);
        var uploader = new AnimationUploader(api);

        var foreign = await uploader.PlanAsync("Aceno", 1, 3);
        var gone = await uploader.PlanAsync("Aceno", null, 404);

        foreign.Existing!.AnimationId.Should().Be(8);
        foreign.Type.Should().Be(1);
        gone.Existing!.AnimationId.Should().Be(8);
        gone.Type.Should().Be(7);
    }

    [Fact]
    public async Task SomeoneElsesAnimationWithTheSameNameIsNeverChanged()
    {
        var api = new FakeApi();
        api.Remote[3] = new RemoteAnimation(3, 99, "Aceno", 1);

        var plan = await new AnimationUploader(api).PlanAsync("Aceno", 1, null);

        plan.Creates.Should().BeTrue();
    }

    [Fact]
    public async Task TheRealClientSendsTheKeyAndReadsTheAnswers()
    {
        var handler = new RecordingHandler();
        using var api = new Roll6Api(new Roll6Connection("https://roll6.test", new Dictionary<string, string> { ["X-Api-Key"] = "r6_k" }), handler);

        (await api.GetMyUserIdAsync()).Should().Be(5);
        (await api.GetAnimationAsync(404)).Should().BeNull();
        var updated = await api.UpdateAsync(7, "Novo", 2, CONTENT);
        var failure = () => api.CreateAsync("Ruim", 1, CONTENT);

        updated.Name.Should().Be("Novo");
        (await failure.Should().ThrowAsync<Roll6Exception>()).Which.Message.Should().Be("content.version: Versão inválida.");
        handler.Keys.Should().AllBe("r6_k");
        handler.Bodies.Should().Contain(body => body.Contains("\"name\":\"Novo\"") && body.Contains("\"type\":2")
            && body.Contains("\"content\":{\"format\":\"roll6-animation\"}"));
    }

    private sealed class FakeApi : IRoll6Api
    {
        public const long ME = 5;
        public Dictionary<long, RemoteAnimation> Remote { get; } = new();
        public List<(string, int)> Created { get; } = new();
        public List<(long, string, int)> Updated { get; } = new();

        public Task<long> GetMyUserIdAsync(CancellationToken cancel = default) => Task.FromResult(ME);

        public Task<RemoteAnimation?> GetAnimationAsync(long animationId, CancellationToken cancel = default) =>
            Task.FromResult(Remote.GetValueOrDefault(animationId));

        public Task<IReadOnlyList<RemoteAnimation>> SearchMineAsync(string name, CancellationToken cancel = default) =>
            Task.FromResult<IReadOnlyList<RemoteAnimation>>(Remote.Values
                .Where(item => item.UserId == ME && item.Name.Contains(name, StringComparison.OrdinalIgnoreCase)).ToList());

        public Task<RemoteAnimation> CreateAsync(string name, int type, JsonElement content, CancellationToken cancel = default)
        {
            Created.Add((name, type));
            return Task.FromResult(new RemoteAnimation(100, ME, name, type));
        }

        public Task<RemoteAnimation> UpdateAsync(long animationId, string name, int type, JsonElement content, CancellationToken cancel = default)
        {
            Updated.Add((animationId, name, type));
            return Task.FromResult(new RemoteAnimation(animationId, ME, name, type));
        }
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public List<string?> Keys { get; } = new();
        public List<string> Bodies { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancel)
        {
            Keys.Add(request.Headers.TryGetValues("X-Api-Key", out var values) ? values.Single() : null);
            if (request.Content != null)
                Bodies.Add(await request.Content.ReadAsStringAsync(cancel));
            var path = request.RequestUri!.AbsolutePath;
            return (request.Method.Method, path) switch
            {
                ("GET", "/api/user/me") => Json(HttpStatusCode.OK, """{ "userId": 5, "name": "Rodrigo" }"""),
                ("GET", "/api/animation/404") => Json(HttpStatusCode.NotFound, """{ "title": "Animação não encontrada." }"""),
                ("PUT", "/api/animation/7") => Json(HttpStatusCode.OK, """{ "animationId": 7, "userId": 5, "name": "Novo", "type": 2 }"""),
                ("POST", "/api/animation") => Json(HttpStatusCode.BadRequest, """{ "errors": { "content.version": ["Versão inválida."] } }"""),
                _ => Json(HttpStatusCode.NotFound, "{}"),
            };
        }

        private static HttpResponseMessage Json(HttpStatusCode status, string body) =>
            new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
    }
}
