using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Roll6Anime.Core.Markup;

namespace Roll6Anime;

/// <summary>
/// "Marcar print" (064): the print big, four red tools — pencil, dotted rectangle, dotted circle and arrow — to point the
/// Claude at parts of it, Desfazer/Limpar, and Concluir (attaches the print with its marks) or Cancelar. It always starts
/// from the original print plus the marks it already had, so nothing is lost by marking again.
/// </summary>
public partial class MarkupWindow : Window
{
    private readonly PrintAttachment _print;
    private readonly MarkupSurface _surface;
    /// <summary>The marks before each change (a mark, a clear): Desfazer goes back one step.</summary>
    private readonly Stack<IReadOnlyList<Mark>> _history = new();
    private IReadOnlyList<Mark> _marks;

    public MarkupWindow(PrintAttachment print)
    {
        InitializeComponent();
        _print = print;
        _marks = print.Marks;
        var original = MarkupDrawing.Decode(print.OriginalPng);
        var picture = new Image
        {
            Source = original,
            Width = original.PixelWidth,
            Height = original.PixelHeight,
            Stretch = System.Windows.Media.Stretch.Fill,
        };
        System.Windows.Automation.AutomationProperties.SetName(picture, "Print para marcar");
        Stage.Children.Add(picture);
        _surface = new MarkupSurface(original.PixelWidth, original.PixelHeight) { Marks = _marks };
        _surface.MarkAdded += OnMarkAdded;
        Stage.Children.Add(_surface);
        SizeToWorkArea();
        PreviewKeyDown += OnKey;
        // The tools are clicked, not focused: keep the keyboard in the window so Enter and Esc always reach it.
        Loaded += (_, _) => Keyboard.Focus(this);
        Refresh();
    }

    /// <summary>The print attached when the user chose Concluir; null otherwise.</summary>
    public PrintAttachment? Result { get; private set; }

    private void SizeToWorkArea()
    {
        var area = SystemParameters.WorkArea;
        Width = Math.Max(MinWidth, area.Width * 0.8);
        Height = Math.Max(MinHeight, area.Height * 0.85);
    }

    private void OnMarkAdded(Mark mark)
    {
        _history.Push(_marks);
        _marks = _marks.Append(mark).ToList();
        Refresh();
    }

    private void OnUndo(object sender, RoutedEventArgs e) => Undo();

    private void Undo()
    {
        if (_history.Count == 0)
            return;
        _marks = _history.Pop();
        Refresh();
    }

    private void OnClear(object sender, RoutedEventArgs e)
    {
        if (_marks.Count == 0)
            return;
        _history.Push(_marks);
        _marks = Array.Empty<Mark>();
        Refresh();
    }

    private void OnDone(object sender, RoutedEventArgs e)
    {
        Result = _marks.Count == 0
            ? _print.WithMarks(Array.Empty<Mark>(), _print.OriginalPng)
            : _print.WithMarks(_marks, MarkupDrawing.Render(_print.OriginalPng, _marks));
        DialogResult = true;
    }

    private void OnTool(object sender, RoutedEventArgs e)
    {
        if (_surface == null)
            return;
        _surface.Tool = sender switch
        {
            _ when ReferenceEquals(sender, RectangleTool) => MarkKind.Rectangle,
            _ when ReferenceEquals(sender, EllipseTool) => MarkKind.Ellipse,
            _ when ReferenceEquals(sender, ArrowTool) => MarkKind.Arrow,
            _ => MarkKind.Pencil,
        };
    }

    /// <summary>Ctrl+Z undoes, 1–4 pick the tool, Enter concludes and Esc cancels — wherever the focus is.</summary>
    private void OnKey(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter && Keyboard.Modifiers == ModifierKeys.None)
        {
            OnDone(this, e);
            e.Handled = true;
            return;
        }
        if (e.Key == Key.Escape)
        {
            DialogResult = false;
            e.Handled = true;
            return;
        }
        if (e.Key == Key.Z && Keyboard.Modifiers == ModifierKeys.Control)
        {
            Undo();
            e.Handled = true;
            return;
        }
        if (Keyboard.Modifiers != ModifierKeys.None)
            return;
        RadioButton? tool = e.Key switch
        {
            Key.D1 or Key.NumPad1 => PencilTool,
            Key.D2 or Key.NumPad2 => RectangleTool,
            Key.D3 or Key.NumPad3 => EllipseTool,
            Key.D4 or Key.NumPad4 => ArrowTool,
            _ => null,
        };
        if (tool != null)
        {
            tool.IsChecked = true;
            e.Handled = true;
        }
    }

    private void Refresh()
    {
        _surface.Marks = _marks;
        UndoButton.IsEnabled = _history.Count > 0;
        ClearButton.IsEnabled = _marks.Count > 0;
    }
}
