using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Roll6Anime.Core.Markup;

namespace Roll6Anime;

/// <summary>
/// Paints the red marks of a print (064, research R2): the same code draws them on the editor's surface and on the PNG
/// sent to the Claude, both in the print's own pixels, so what is seen is what is sent.
/// </summary>
public static class MarkupDrawing
{
    private static readonly SolidColorBrush RED = Frozen(new SolidColorBrush(Color.FromRgb(0xFF, 0x20, 0x20)));

    /// <summary>The print as a bitmap of its own pixel size (DPI 96, so one unit is one pixel).</summary>
    public static BitmapSource Decode(byte[] png)
    {
        var image = new BitmapImage();
        image.BeginInit();
        image.CacheOption = BitmapCacheOption.OnLoad;
        image.StreamSource = new MemoryStream(png);
        image.EndInit();
        image.Freeze();
        if (Math.Abs(image.DpiX - 96) < 0.01 && Math.Abs(image.DpiY - 96) < 0.01)
            return image;
        // Another DPI would make WPF draw it at another size: copy the pixels at 96.
        var stride = image.PixelWidth * ((image.Format.BitsPerPixel + 7) / 8);
        var pixels = new byte[stride * image.PixelHeight];
        image.CopyPixels(pixels, stride, 0);
        var copy = BitmapSource.Create(image.PixelWidth, image.PixelHeight, 96, 96, image.Format, image.Palette, pixels, stride);
        copy.Freeze();
        return copy;
    }

    /// <summary>Draws every mark with the given stroke (pixels of the print).</summary>
    public static void Draw(DrawingContext context, IEnumerable<Mark> marks, double stroke)
    {
        var solid = Pen(stroke, dashed: false);
        var dotted = Pen(stroke, dashed: true);
        foreach (var mark in marks)
            DrawOne(context, mark, stroke, solid, dotted);
    }

    /// <summary>The print with its marks, as a PNG of the print's size.</summary>
    public static byte[] Render(byte[] originalPng, IReadOnlyList<Mark> marks)
    {
        var original = Decode(originalPng);
        var width = original.PixelWidth;
        var height = original.PixelHeight;
        var visual = new DrawingVisual();
        using (var context = visual.RenderOpen())
        {
            context.DrawImage(original, new Rect(0, 0, width, height));
            Draw(context, marks, MarkGeometry.StrokeWidth(width, height));
        }
        var target = new RenderTargetBitmap(width, height, 96, 96, PixelFormats.Pbgra32);
        target.Render(visual);
        var encoder = new PngBitmapEncoder();
        encoder.Frames.Add(BitmapFrame.Create(target));
        using var output = new MemoryStream();
        encoder.Save(output);
        return output.ToArray();
    }

    private static void DrawOne(DrawingContext context, Mark mark, double stroke, Pen solid, Pen dotted)
    {
        var points = mark.Points;
        switch (mark.Kind)
        {
            case MarkKind.Pencil when points.Count >= 2:
                var line = new StreamGeometry();
                using (var figure = line.Open())
                {
                    figure.BeginFigure(ToPoint(points[0]), isFilled: false, isClosed: false);
                    figure.PolyLineTo(points.Skip(1).Select(ToPoint).ToList(), isStroked: true, isSmoothJoin: true);
                }
                line.Freeze();
                context.DrawGeometry(null, solid, line);
                break;
            case MarkKind.Rectangle when points.Count == 2:
                var box = MarkGeometry.Bounds(points[0], points[1]);
                context.DrawRectangle(null, dotted, new Rect(box.X, box.Y, box.Width, box.Height));
                break;
            case MarkKind.Ellipse when points.Count == 2:
                var oval = MarkGeometry.Bounds(points[0], points[1]);
                context.DrawEllipse(null, dotted, new Point(oval.X + oval.Width / 2, oval.Y + oval.Height / 2), oval.Width / 2, oval.Height / 2);
                break;
            case MarkKind.Arrow when points.Count == 2:
                var head = MarkGeometry.ArrowHead(points[0], points[1], stroke);
                context.DrawLine(solid, ToPoint(points[0]), ToPoint(head.Base));
                var tip = new StreamGeometry();
                using (var figure = tip.Open())
                {
                    figure.BeginFigure(ToPoint(head.Tip), isFilled: true, isClosed: true);
                    figure.PolyLineTo(new[] { ToPoint(head.Left), ToPoint(head.Right) }, isStroked: true, isSmoothJoin: true);
                }
                tip.Freeze();
                context.DrawGeometry(RED, new Pen(RED, 1) { LineJoin = PenLineJoin.Round }, tip);
                break;
        }
    }

    private static Pen Pen(double stroke, bool dashed)
    {
        var pen = new Pen(RED, stroke)
        {
            StartLineCap = PenLineCap.Round,
            EndLineCap = PenLineCap.Round,
            DashCap = PenLineCap.Round,
            LineJoin = PenLineJoin.Round,
        };
        // Dash lengths are in multiples of the stroke width.
        if (dashed)
            pen.DashStyle = new DashStyle(new[] { MarkGeometry.DASH, MarkGeometry.GAP }, 0);
        pen.Freeze();
        return pen;
    }

    private static Point ToPoint(MarkPoint point) => new(point.X, point.Y);

    private static T Frozen<T>(T freezable) where T : Freezable
    {
        freezable.Freeze();
        return freezable;
    }
}
