using System.Text.Json;
using FluentAssertions;
using Roll6.API.Mcp;
using Roll6.Domain.Exceptions;

namespace Roll6.Tests.Mcp;

public class McpToolRunnerTests
{
    private sealed class Sample
    {
        public long SampleId { get; set; } = 7;
        public string Name { get; set; } = "Ação";
    }

    [Fact]
    public async Task Success_SerializesLikeTheApi_AsTextAndStructuredContent()
    {
        var result = await McpToolRunner.RunAsync(() => Task.FromResult(new Sample()));

        (result.IsError ?? false).Should().BeFalse();
        result.StructuredContent!.Value.GetProperty("sampleId").GetInt64().Should().Be(7);
        var text = ((ModelContextProtocol.Protocol.TextContentBlock)result.Content.Single()).Text;
        text.Should().Be("{\"sampleId\":7,\"name\":\"Ação\"}");
    }

    [Fact]
    public async Task Lists_GoInsideItems_InTheStructuredContent()
    {
        var result = await McpToolRunner.RunAsync(() => Task.FromResult(new List<int> { 1, 2 }));

        result.StructuredContent!.Value.GetProperty("items").GetArrayLength().Should().Be(2);
        ((ModelContextProtocol.Protocol.TextContentBlock)result.Content.Single()).Text.Should().Be("[1,2]");
    }

    [Fact]
    public async Task NoBody_ReturnsOk()
    {
        var result = await McpToolRunner.RunAsync(() => Task.CompletedTask);

        result.StructuredContent!.Value.GetProperty("ok").GetBoolean().Should().BeTrue();
    }

    public static IEnumerable<object[]> Errors() => new[]
    {
        new object[] { new UnauthorizedAccessException("Apenas o mestre."), 403 },
        new object[] { new KeyNotFoundException("Não encontrado."), 404 },
        new object[] { new ConflictException("Ocupado."), 409 },
        new object[] { new InvalidOperationException("Falhou."), 500 }
    };

    [Theory]
    [MemberData(nameof(Errors))]
    public async Task Exceptions_BecomeTheSameStatusAsTheApi(Exception exception, int status)
    {
        var result = await McpToolRunner.RunAsync<object>(() => throw exception);

        result.IsError.Should().BeTrue();
        var problem = result.StructuredContent!.Value;
        problem.GetProperty("status").GetInt32().Should().Be(status);
        problem.GetProperty("detail").GetString().Should().Be(exception.Message);
    }

    [Fact]
    public async Task Validation_KeepsTheFieldErrors()
    {
        var result = await McpToolRunner.RunAsync(() => Task.FromException(new DomainValidationException("name", "O campo name é obrigatório.")));

        result.IsError.Should().BeTrue();
        var problem = result.StructuredContent!.Value;
        problem.GetProperty("status").GetInt32().Should().Be(400);
        problem.GetProperty("errors").GetProperty("name")[0].GetString().Should().Be("O campo name é obrigatório.");
        problem.GetProperty("errors").ValueKind.Should().Be(JsonValueKind.Object);
    }
}
