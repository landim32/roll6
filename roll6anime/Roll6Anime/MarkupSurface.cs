using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using Roll6Anime.Core.Markup;

namespace Roll6Anime;

/// <summary>
/// The drawing surface of the print editor (064): exactly as big as the print in pixels and scaled by the window's
/// Viewbox, so the pointer arrives in the print's pixels at any window size. It shows the marks made and the one being
/// dragged, and tells the editor when a drag makes a mark (<see cref="MarkGeometry.IsMeaningful"/>). Mouse events also
/// carry the Windows pen and touch.
/// </summary>
public sealed class MarkupSurface : FrameworkElement
{
    private readonly int _pixelWidth;
    private readonly int _pixelHeight;
    private IReadOnlyList<Mark> _marks = Array.Empty<Mark>();
    private List<MarkPoint>? _drag;

    public MarkupSurface(int pixelWidth, int pixelHeight)
    {
        _pixelWidth = pixelWidth;
        _pixelHeight = pixelHeight;
        Width = pixelWidth;
        Height = pixelHeight;
        Stroke = MarkGeometry.StrokeWidth(pixelWidth, pixelHeight);
        Cursor = Cursors.Cross;
        Focusable = false;
    }

    /// <summary>A drag became a mark.</summary>
    public event Action<Mark>? MarkAdded;

    public MarkKind Tool { get; set; } = MarkKind.Pencil;

    public double Stroke { get; }

    /// <summary>The marks made so far, drawn under the one being dragged.</summary>
    public IReadOnlyList<Mark> Marks
    {
        get => _marks;
        set
        {
            _marks = value;
            InvalidateVisual();
        }
    }

    protected override void OnRender(DrawingContext context)
    {
        // Transparent, so the whole print takes the pointer.
        context.DrawRectangle(Brushes.Transparent, null, new Rect(0, 0, _pixelWidth, _pixelHeight));
        MarkupDrawing.Draw(context, _marks, Stroke);
        if (Current() is { } dragging)
            MarkupDrawing.Draw(context, new[] { dragging }, Stroke);
    }

    protected override void OnMouseLeftButtonDown(MouseButtonEventArgs e)
    {
        base.OnMouseLeftButtonDown(e);
        var start = PointOf(e);
        _drag = new List<MarkPoint> { start, start };
        CaptureMouse();
        e.Handled = true;
        InvalidateVisual();
    }

    protected override void OnMouseMove(MouseEventArgs e)
    {
        base.OnMouseMove(e);
        if (_drag == null)
            return;
        var point = PointOf(e);
        if (Tool == MarkKind.Pencil)
        {
            var last = _drag[^1];
            if (MarkGeometry.Length(last, point) >= 1)
                _drag.Add(point);
        }
        else
        {
            _drag[1] = point;
        }
        InvalidateVisual();
    }

    protected override void OnMouseLeftButtonUp(MouseButtonEventArgs e)
    {
        base.OnMouseLeftButtonUp(e);
        if (_drag == null)
            return;
        var mark = Current();
        _drag = null;
        ReleaseMouseCapture();
        InvalidateVisual();
        if (mark != null && MarkGeometry.IsMeaningful(mark))
            MarkAdded?.Invoke(mark);
    }

    protected override void OnLostMouseCapture(MouseEventArgs e)
    {
        base.OnLostMouseCapture(e);
        // The capture was taken away (another window, Esc): the drag is dropped.
        if (_drag != null)
        {
            _drag = null;
            InvalidateVisual();
        }
    }

    /// <summary>The mark being dragged: every point for the pencil, start and end for the shapes.</summary>
    private Mark? Current()
    {
        if (_drag == null)
            return null;
        // The pencil's first point is doubled on purpose by the press; drop the copy.
        var points = Tool == MarkKind.Pencil ? _drag.Skip(1).ToList() : new List<MarkPoint> { _drag[0], _drag[1] };
        return new Mark(Tool, points);
    }

    private MarkPoint PointOf(MouseEventArgs e)
    {
        var position = e.GetPosition(this);
        return MarkGeometry.Clamp(new MarkPoint(position.X, position.Y), _pixelWidth, _pixelHeight);
    }
}
