using Roll6Anime.Core.Claude;

namespace Roll6Anime.Core.Markup;

/// <summary>
/// A print of the 3D view waiting to go with the next request (062), with the red marks drawn on it (064). The original
/// print and the marks are kept apart, so reopening the editor starts again from the clean picture: <see cref="Png"/> is
/// the original with the marks painted, <see cref="Caption"/> the caption that tells the Claude they are there.
/// </summary>
public sealed class PrintAttachment
{
    private PrintAttachment(byte[] originalPng, string baseCaption, IReadOnlyList<Mark> marks, byte[] png)
    {
        OriginalPng = originalPng;
        BaseCaption = baseCaption;
        Marks = marks;
        Png = png;
    }

    /// <summary>The print as captured; it never changes.</summary>
    public byte[] OriginalPng { get; }

    /// <summary>What the print shows (animation, instant, camera), from <see cref="ViewCapture.Caption"/>.</summary>
    public string BaseCaption { get; }

    public IReadOnlyList<Mark> Marks { get; }

    /// <summary>What is sent and shown: the original with the marks (the original itself without marks).</summary>
    public byte[] Png { get; }

    /// <summary>The caption sent: the base one plus the note about the marks, if any.</summary>
    public string Caption => BaseCaption + PromptImage.MarkupNote(Marks);

    public bool HasMarks => Marks.Count > 0;

    /// <summary>A print just captured, without marks.</summary>
    public static PrintAttachment Plain(byte[] png, string caption) => new(png, caption, Array.Empty<Mark>(), png);

    /// <summary>The same print with these marks and the picture they were painted on; no marks gives back the original.</summary>
    public PrintAttachment WithMarks(IReadOnlyList<Mark> marks, byte[] renderedPng) =>
        marks.Count == 0
            ? new PrintAttachment(OriginalPng, BaseCaption, Array.Empty<Mark>(), OriginalPng)
            : new PrintAttachment(OriginalPng, BaseCaption, marks.ToList(), renderedPng);

    public PromptImage ToPromptImage() => new(Png, Caption);
}
