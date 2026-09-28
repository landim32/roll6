using FluentAssertions;

namespace Roll6.Tests.Mcp;

/// <summary>
/// Every API operation available to API keys has exactly one MCP tool (020 SC-001). Adding an endpoint without its tool
/// (or the other way round) fails here.
/// </summary>
public class McpCoverageTests
{
    [Fact]
    public void EveryApiOperation_ExceptTheLoginOnlyOnes_HasExactlyOneTool()
    {
        var expected = McpToolCatalog.ApiOperations().Where(op => !McpToolCatalog.EXCLUDED.Contains(op)).ToList();
        var mapped = McpToolCatalog.Tools().Where(t => t.Operation != null).Select(t => McpToolCatalog.Key(t.Operation!)).ToList();

        expected.Should().OnlyHaveUniqueItems();
        mapped.Should().OnlyHaveUniqueItems("each operation is exposed by a single tool");
        mapped.Should().BeEquivalentTo(expected);
        expected.Should().HaveCount(75);
    }

    [Fact]
    public void LoginOnlyOperations_AreNotExposed()
    {
        McpToolCatalog.ApiOperations().Should().Contain(McpToolCatalog.EXCLUDED, "the exclusion list must name real operations");
        McpToolCatalog.Tools().Where(t => t.Operation != null)
            .Select(t => McpToolCatalog.Key(t.Operation!))
            .Should().NotIntersectWith(McpToolCatalog.EXCLUDED);
    }

    [Fact]
    public void ToolNames_AreUniqueSnakeCase_AndOnlyTheGuideHasNoOperation()
    {
        var tools = McpToolCatalog.Tools();

        tools.Select(t => t.Name).Should().OnlyHaveUniqueItems();
        tools.Should().OnlyContain(t => System.Text.RegularExpressions.Regex.IsMatch(t.Name, "^[a-z]+(_[a-z0-9]+)*$"));
        tools.Where(t => t.Operation == null).Select(t => t.Name).Should().Equal("get_roll6_guide");
        tools.Should().HaveCount(76);
    }
}
