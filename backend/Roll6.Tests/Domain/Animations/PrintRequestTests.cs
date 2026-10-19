using System.Text.Json;
using FluentAssertions;
using Roll6.Domain.Animations;
using Xunit;

namespace Roll6.Tests.Domain.Animations;

public class PrintRequestTests
{
    private static JsonElement Json(string text)
    {
        using var document = JsonDocument.Parse(text);
        return document.RootElement.Clone();
    }

    [Fact]
    public void Parse_NoArguments_GivesOneKeyPoseFromThreeQuarter()
    {
        var parse = PrintRequest.Parse(default);

        parse.IsValid.Should().BeTrue();
        parse.Shots.Should().ContainSingle();
        parse.Shots[0].Time.GetString().Should().Be("key");
        parse.Shots[0].View.Should().Be("three-quarter");
        parse.Shots[0].Skeleton.Should().BeFalse();
    }

    [Fact]
    public void Parse_FillsDefaultsPerShotAndKeepsTheOrder()
    {
        var parse = PrintRequest.Parse(Json("""{"shots":[{"time":0.5,"view":"Right","skeleton":true},{}]}"""));

        parse.IsValid.Should().BeTrue();
        parse.Shots.Should().HaveCount(2);
        parse.Shots[0].Time.GetDouble().Should().Be(0.5);
        parse.Shots[0].View.Should().Be("right");
        parse.Shots[0].Skeleton.Should().BeTrue();
        parse.Shots[1].Time.GetString().Should().Be("key");
        parse.Shots[1].View.Should().Be("three-quarter");
    }

    [Fact]
    public void Parse_MoreThanSixShots_IsRefused()
    {
        var shots = string.Join(",", Enumerable.Repeat("{}", 7));

        var parse = PrintRequest.Parse(Json($$"""{"shots":[{{shots}}]}"""));

        parse.IsValid.Should().BeFalse();
        parse.Error.Should().StartWith("Pedido de print inválido").And.Contain("6");
    }

    [Theory]
    [InlineData("""{"shots":[{"view":"diagonal"}]}""", "lado")]
    [InlineData("""{"shots":[{"time":-1}]}""", "negativo")]
    [InlineData("""{"shots":[{"time":"meio"}]}""", "instante")]
    [InlineData("""{"shots":[{"skeleton":"sim"}]}""", "skeleton")]
    [InlineData("""{"shots":"todos"}""", "lista")]
    [InlineData("[1]", "objeto")]
    public void Parse_InvalidArguments_SayWhy(string json, string word)
    {
        var parse = PrintRequest.Parse(Json(json));

        parse.IsValid.Should().BeFalse();
        parse.Error.Should().Contain(word);
    }

    [Fact]
    public void ResultText_NumbersTheCaptions()
    {
        PrintRequest.ResultText(new[] { "frente", "lado" }).Should().Be("Print 1: frente\nPrint 2: lado");
    }

    [Fact]
    public void ToolDefinition_LimitsTheShotsInTheSchema()
    {
        var tool = PrintRequest.ToolDefinition();

        tool.Name.Should().Be("print_stage");
        tool.InputSchema.GetProperty("properties").GetProperty("shots").GetProperty("maxItems").GetInt32().Should().Be(6);
        tool.Description.Should().Contain("LATEST");
    }
}
