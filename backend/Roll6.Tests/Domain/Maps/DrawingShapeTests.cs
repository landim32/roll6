using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Maps;

namespace Roll6.Tests.Domain.Maps;

public class DrawingShapeTests
{
    private static List<int[]> Points(params int[] xy) =>
        Enumerable.Range(0, xy.Length / 2).Select(i => new[] { xy[2 * i], xy[2 * i + 1] }).ToList();

    private static string KeyOf(Func<DrawingShapeInfo> act) =>
        act.Should().Throw<DomainValidationException>().Which.Errors.Keys.Single();

    [Fact]
    public void Check_ValidArrow_NormalisesTheColor()
    {
        var shape = DrawingShape.Check(5, Points(120, 80, 400, 260), " #E03131 ", 6, 0.8, 10, 8);

        shape.Kind.Should().Be(DrawingKind.Arrow);
        shape.Points.Select(p => (p[0], p[1])).Should().Equal((120, 80), (400, 260));
        shape.Color.Should().Be("#e03131");
        shape.Width.Should().Be(6);
        shape.Opacity.Should().BeApproximately(0.8f, 0.0001f);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void Check_UnknownKind_IsRefused(int kind)
    {
        KeyOf(() => DrawingShape.Check(kind, Points(0, 0, 10, 10), "#000000", 4, 1, 10, 8)).Should().Be("kind");
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(4)]
    [InlineData(5)]
    public void Check_TwoPointKinds_NeedExactlyTwo(int kind)
    {
        KeyOf(() => DrawingShape.Check(kind, Points(0, 0), "#000000", 4, 1, 10, 8)).Should().Be("points");
        KeyOf(() => DrawingShape.Check(kind, Points(0, 0, 10, 10, 20, 20), "#000000", 4, 1, 10, 8)).Should().Be("points");
    }

    [Fact]
    public void Check_Pencil_TakesTwoToTwoThousandPoints()
    {
        DrawingShape.Check(3, Points(0, 0, 5, 5, 10, 0), "#000000", 4, 1, 10, 8).Points.Should().HaveCount(3);
        var tooMany = Enumerable.Range(0, 2001).Select(i => new[] { i % 300, i / 300 }).ToList();
        KeyOf(() => DrawingShape.Check(3, tooMany, "#000000", 4, 1, 10, 8)).Should().Be("points");
        KeyOf(() => DrawingShape.Check(3, Points(1, 1), "#000000", 4, 1, 10, 8)).Should().Be("points");
    }

    [Fact]
    public void Check_PointWithoutTwoCoordinates_IsRefused()
    {
        var points = new List<int[]> { new[] { 0, 0 }, new[] { 1, 2, 3 } };

        KeyOf(() => DrawingShape.Check(4, points, "#000000", 4, 1, 10, 8)).Should().Be("points");
    }

    [Fact]
    public void Check_FarOutsideTheGrid_IsRefused()
    {
        DrawingShape.Check(4, Points(-20000, 0, 10, 10), "#000000", 4, 1, 10, 8);
        KeyOf(() => DrawingShape.Check(4, Points(-20001, 0, 10, 10), "#000000", 4, 1, 10, 8)).Should().Be("points");
        var maxX = DrawingShape.GridPixelWidth(10) + DrawingShape.MARGIN;
        DrawingShape.Check(4, Points(0, 0, maxX, 10), "#000000", 4, 1, 10, 8);
        KeyOf(() => DrawingShape.Check(4, Points(0, 0, maxX + 1, 10), "#000000", 4, 1, 10, 8)).Should().Be("points");
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(4)]
    [InlineData(5)]
    public void Check_EqualPoints_IsTooSmall(int kind)
    {
        var act = () => DrawingShape.Check(kind, Points(50, 50, 50, 50), "#000000", 4, 1, 10, 8);

        act.Should().Throw<DomainValidationException>()
            .Which.Errors["points"].Should().Equal(DrawingShape.TOO_SMALL);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("red")]
    [InlineData("#12345")]
    [InlineData("#1234567")]
    [InlineData("#gg0000")]
    public void Check_BadColor_IsRefused(string? color)
    {
        KeyOf(() => DrawingShape.Check(4, Points(0, 0, 10, 10), color, 4, 1, 10, 8)).Should().Be("color");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(201)]
    public void Check_BadWidth_IsRefused(int width)
    {
        KeyOf(() => DrawingShape.Check(4, Points(0, 0, 10, 10), "#000000", width, 1, 10, 8)).Should().Be("width");
    }

    [Theory]
    [InlineData(0.04)]
    [InlineData(1.01)]
    [InlineData(double.NaN)]
    public void Check_BadOpacity_IsRefused(double opacity)
    {
        KeyOf(() => DrawingShape.Check(4, Points(0, 0, 10, 10), "#000000", 4, opacity, 10, 8)).Should().Be("opacity");
    }

    [Fact]
    public void Check_Limits_AreAccepted()
    {
        DrawingShape.Check(2, Points(0, 0, 10, 0), "#ffffff", 1, 0.05, 10, 8).Width.Should().Be(1);
        DrawingShape.Check(2, Points(0, 0, 10, 0), "#ffffff", 200, 1, 10, 8).Width.Should().Be(200);
    }
}
