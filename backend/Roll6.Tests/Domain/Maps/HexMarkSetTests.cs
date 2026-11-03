using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Maps;
using Roll6.DTO.Map;

namespace Roll6.Tests.Domain.Maps;

public class HexMarkSetTests
{
    private static MapHexMarkWriteInfo Mark(int x, int y, int? kind, string? text = null) => new() { X = x, Y = y, Kind = kind, Text = text };

    private static string KeyOf(Action act)
    {
        var ex = act.Should().Throw<DomainValidationException>().Which;
        return ex.Errors.Keys.Single();
    }

    [Fact]
    public void Parse_SplitsUpsertsAndRemovals()
    {
        var batch = HexMarkSet.Parse(new[] { Mark(0, 0, 4), Mark(1, 0, 7, "  Baú "), Mark(2, 0, null) }, 10, 8);

        batch.Upserts.Should().Equal(
            new HexMarkWrite(0, 0, HexMarkKind.Water, null),
            new HexMarkWrite(1, 0, HexMarkKind.Mark, "Baú"));
        batch.Removals.Should().Equal((2, 0));
    }

    [Fact]
    public void Parse_MarkWithEmptyText_HasNoText()
    {
        HexMarkSet.Parse(new[] { Mark(3, 3, 7, "   ") }, 10, 8).Upserts.Single().Text.Should().BeNull();
    }

    [Fact]
    public void Parse_EmptyOrTooMany_IsRefusedOnMarks()
    {
        KeyOf(() => HexMarkSet.Parse(Array.Empty<MapHexMarkWriteInfo>(), 10, 8)).Should().Be("marks");
        KeyOf(() => HexMarkSet.Parse(null, 10, 8)).Should().Be("marks");
        var many = Enumerable.Range(0, 201).Select(i => Mark(i % 20, i / 20, 1)).ToList();
        KeyOf(() => HexMarkSet.Parse(many, 20, 20)).Should().Be("marks");
    }

    [Fact]
    public void Parse_TwoHundred_IsAccepted()
    {
        var items = Enumerable.Range(0, 200).Select(i => Mark(i % 20, i / 20, 1)).ToList();

        HexMarkSet.Parse(items, 20, 20).Upserts.Should().HaveCount(200);
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(10, 0)]
    [InlineData(0, 8)]
    public void Parse_OutsideTheGrid_IsRefusedOnX(int x, int y)
    {
        var act = () => HexMarkSet.Parse(new[] { Mark(1, 1, 1), Mark(x, y, 1) }, 10, 8);

        act.Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("marks[1].x").WhoseValue.Should().Equal(HexMarkSet.OUTSIDE);
    }

    [Fact]
    public void Parse_RepeatedHex_IsRefused()
    {
        var act = () => HexMarkSet.Parse(new[] { Mark(1, 1, 1), Mark(1, 1, null) }, 10, 8);

        act.Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("marks[1].x").WhoseValue.Should().Equal(HexMarkSet.REPEATED);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(8)]
    public void Parse_UnknownKind_IsRefused(int kind)
    {
        KeyOf(() => HexMarkSet.Parse(new[] { Mark(1, 1, kind) }, 10, 8)).Should().Be("marks[0].kind");
    }

    [Fact]
    public void Parse_TextOnAnotherKind_IsRefused()
    {
        KeyOf(() => HexMarkSet.Parse(new[] { Mark(1, 1, 1, "parede") }, 10, 8)).Should().Be("marks[0].text");
    }

    [Fact]
    public void Parse_TextOverAHundred_IsRefused()
    {
        HexMarkSet.Parse(new[] { Mark(1, 1, 7, new string('a', 100)) }, 10, 8).Upserts.Should().HaveCount(1);
        KeyOf(() => HexMarkSet.Parse(new[] { Mark(1, 1, 7, new string('a', 101)) }, 10, 8)).Should().Be("marks[0].text");
    }
}
