using System.ComponentModel;
using System.Reflection;
using System.Text.RegularExpressions;
using FluentAssertions;
using Roll6.Mcp;

namespace Roll6.Tests.Mcp;

/// <summary>The MCP must be more descriptive than the API (020 US3): these checks keep every tool documented.</summary>
public class McpDescriptionTests
{
    private static readonly List<McpToolCatalog.Tool> TOOLS = McpToolCatalog.Tools();

    /// <summary>Parameters filled by dependency injection are not part of the tool's input.</summary>
    private static bool IsInjected(ParameterInfo parameter) => parameter.ParameterType == typeof(Roll6ApiClient);

    public static IEnumerable<object[]> ToolNames() => TOOLS.Select(t => new object[] { t.Name });

    private static McpToolCatalog.Tool Find(string name) => TOOLS.Single(t => t.Name == name);

    [Theory]
    [MemberData(nameof(ToolNames))]
    public void Description_HasTheStandardSections(string name)
    {
        var tool = Find(name);

        tool.Description.Length.Should().BeGreaterThan(80, $"{name} must explain itself");
        foreach (var section in new[] { "What it does:", "Who can use it:", "Returns:", "Related tools:" })
            tool.Description.Should().Contain(section, $"{name} needs the '{section}' section");
        if (tool.Operation != null)
            tool.Description.Should().Contain("Common errors:", $"{name} must list the errors the API can answer");
    }

    [Theory]
    [MemberData(nameof(ToolNames))]
    public void EveryInputParameter_IsDescribed(string name)
    {
        var tool = Find(name);
        foreach (var parameter in tool.Method.GetParameters().Where(p => !IsInjected(p)))
        {
            var description = parameter.GetCustomAttribute<DescriptionAttribute>()?.Description;
            description.Should().NotBeNull($"{name}.{parameter.Name} needs a description");
            description!.Length.Should().BeGreaterThanOrEqualTo(20, $"{name}.{parameter.Name} description is too short");
        }
    }

    [Theory]
    [MemberData(nameof(ToolNames))]
    public void Annotations_MatchTheOperation(string name)
    {
        var tool = Find(name);
        var verb = tool.Operation?.Verb ?? "GET";

        tool.Attribute.ReadOnly.Should().Be(verb == "GET", $"{name}: only reads are read-only");
        if (verb == "GET")
            tool.Attribute.Idempotent.Should().BeTrue($"{name}: reads are idempotent");
        if (verb == "DELETE")
        {
            tool.Attribute.Destructive.Should().BeTrue($"{name}: deletions are destructive");
            tool.Description.Should().Contain(McpDocs.DESTRUCTIVE, $"{name}: warn before irreversible calls");
        }
        if (tool.Attribute.Destructive)
            tool.Description.Should().Contain(McpDocs.DESTRUCTIVE, $"{name}: warn before irreversible calls");
        tool.Attribute.Title.Should().NotBeNullOrWhiteSpace();
    }

    [Theory]
    [MemberData(nameof(ToolNames))]
    public void RelatedTools_Exist(string name)
    {
        var names = TOOLS.Select(t => t.Name).ToHashSet();
        var related = Find(name).Description.Split('\n').Where(l => l.Contains("Related tools:")).ToList();

        related.Should().HaveCount(1);
        foreach (Match match in Regex.Matches(related[0], @"\b[a-z]+(?:_[a-z0-9]+)+\b"))
            names.Should().Contain(match.Value, $"{name} mentions {match.Value}");
    }

    [Fact]
    public void Guide_CoversTheConceptsTheToolsRelyOn()
    {
        foreach (var concept in new[] { "look", "odd-q", "column", "Turns", "master", "roll6-image:", "Approved", "Common flows" })
            Roll6Guide.MARKDOWN.Should().Contain(concept);
        Roll6Guide.INSTRUCTIONS.Should().Contain(Roll6Guide.URI).And.Contain("get_roll6_guide");
    }
}
