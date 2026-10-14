using FluentAssertions;
using Roll6Anime.Core.Markup;

namespace Roll6Anime.Tests;

/// <summary>The geometry of the red marks on a print (064, research R3/R4).</summary>
public class MarkGeometryTests
{
    private static Mark Shape(MarkKind kind, double x1, double y1, double x2, double y2) =>
        new(kind, new[] { new MarkPoint(x1, y1), new MarkPoint(x2, y2) });

    [Theory]
    [InlineData(700, 900, 4)]
    [InlineData(2000, 1600, 10)]
    [InlineData(100, 100, 3)]
    [InlineData(4000, 4000, 12)]
    public void TheStrokeGrowsWithThePrintWithinLimits(int width, int height, double expected)
    {
        MarkGeometry.StrokeWidth(width, height).Should().Be(expected);
    }

    [Fact]
    public void PointsAreKeptInsideThePrint()
    {
        MarkGeometry.Clamp(new MarkPoint(-5, 20), 100, 80).Should().Be(new MarkPoint(0, 20));
        MarkGeometry.Clamp(new MarkPoint(130, -1), 100, 80).Should().Be(new MarkPoint(100, 0));
        MarkGeometry.Clamp(new MarkPoint(50, 99), 100, 80).Should().Be(new MarkPoint(50, 80));
        MarkGeometry.Clamp(new MarkPoint(50, 40), 100, 80).Should().Be(new MarkPoint(50, 40));
    }

    [Fact]
    public void BoundsAreNormalizedWhateverTheDragDirection()
    {
        MarkGeometry.Bounds(new MarkPoint(80, 60), new MarkPoint(20, 10)).Should().Be(new MarkBounds(20, 10, 60, 50));
    }

    [Theory]
    [InlineData(MarkKind.Rectangle)]
    [InlineData(MarkKind.Ellipse)]
    [InlineData(MarkKind.Arrow)]
    public void AClickWithoutADragIsNotAMark(MarkKind kind)
    {
        MarkGeometry.IsMeaningful(Shape(kind, 30, 30, 30, 30)).Should().BeFalse();
        MarkGeometry.IsMeaningful(Shape(kind, 30, 30, 32, 31)).Should().BeFalse();
        MarkGeometry.IsMeaningful(Shape(kind, 30, 30, 60, 50)).Should().BeTrue();
    }

    [Fact]
    public void AFlatRectangleIsNotAMark()
    {
        MarkGeometry.IsMeaningful(Shape(MarkKind.Rectangle, 10, 10, 90, 12)).Should().BeFalse();
    }

    [Fact]
    public void APencilNeedsTwoPointsAndSomeExtent()
    {
        MarkGeometry.IsMeaningful(new Mark(MarkKind.Pencil, new[] { new MarkPoint(5, 5) })).Should().BeFalse();
        MarkGeometry.IsMeaningful(new Mark(MarkKind.Pencil, new[] { new MarkPoint(5, 5), new MarkPoint(6, 6) })).Should().BeFalse();
        MarkGeometry.IsMeaningful(new Mark(MarkKind.Pencil, new[] { new MarkPoint(5, 5), new MarkPoint(6, 6), new MarkPoint(12, 7) })).Should().BeTrue();
    }

    [Fact]
    public void TheArrowHeadIsOnTheEndPointAndSymmetric()
    {
        var head = MarkGeometry.ArrowHead(new MarkPoint(0, 0), new MarkPoint(200, 0), 4);

        head.Tip.Should().Be(new MarkPoint(200, 0));
        // 35% of 200 = 70, clamped to 7 strokes = 28; half width 0.6 × 28.
        head.Base.X.Should().BeApproximately(172, 1e-9);
        head.Left.X.Should().BeApproximately(172, 1e-9);
        head.Right.X.Should().BeApproximately(172, 1e-9);
        head.Left.Y.Should().BeApproximately(-head.Right.Y, 1e-9);
        Math.Abs(head.Left.Y).Should().BeApproximately(16.8, 1e-9);
    }

    [Fact]
    public void AShortArrowKeepsAVisibleHead()
    {
        var head = MarkGeometry.ArrowHead(new MarkPoint(0, 0), new MarkPoint(0, 10), 4);

        // 35% of 10 = 3.5, raised to 3 strokes = 12.
        MarkGeometry.Length(head.Tip, head.Base).Should().BeApproximately(12, 1e-9);
    }
}
