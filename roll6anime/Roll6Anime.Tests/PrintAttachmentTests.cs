using FluentAssertions;
using Roll6Anime.Core.Claude;
using Roll6Anime.Core.Markup;

namespace Roll6Anime.Tests;

/// <summary>A print with its red marks (064): the original is never lost and the caption tells the Claude.</summary>
public class PrintAttachmentTests
{
    private static readonly byte[] ORIGINAL = { 1, 2, 3 };
    private static readonly byte[] MARKED = { 9, 9, 9 };
    private const string CAPTION = "print da vista 3D do roll6anime: o modelo na pose de descanso, sem animação; câmera de frente.";

    private static Mark Shape(MarkKind kind) => new(kind, new[] { new MarkPoint(10, 10), new MarkPoint(60, 50) });

    [Fact]
    public void APlainPrintIsTheOriginalWithItsCaption()
    {
        var print = PrintAttachment.Plain(ORIGINAL, CAPTION);

        print.Png.Should().BeSameAs(ORIGINAL);
        print.Marks.Should().BeEmpty();
        print.HasMarks.Should().BeFalse();
        print.Caption.Should().Be(CAPTION);
    }

    [Fact]
    public void MarksKeepTheOriginalAndTheBaseCaption()
    {
        var marked = PrintAttachment.Plain(ORIGINAL, CAPTION).WithMarks(new[] { Shape(MarkKind.Ellipse), Shape(MarkKind.Arrow) }, MARKED);

        marked.OriginalPng.Should().BeSameAs(ORIGINAL);
        marked.Png.Should().BeSameAs(MARKED);
        marked.BaseCaption.Should().Be(CAPTION);
        marked.Caption.Should().Be(CAPTION + " Marcações em vermelho desenhadas pelo usuário para apontar partes da imagem (não fazem parte da cena): 1 circunferência, 1 seta.");
    }

    [Fact]
    public void RemovingEveryMarkGivesBackTheOriginal()
    {
        var marked = PrintAttachment.Plain(ORIGINAL, CAPTION).WithMarks(new[] { Shape(MarkKind.Rectangle) }, MARKED);

        var clean = marked.WithMarks(Array.Empty<Mark>(), MARKED);

        clean.Png.Should().BeSameAs(ORIGINAL);
        clean.Caption.Should().Be(CAPTION);
    }

    [Fact]
    public void TheRequestCarriesTheMarkedPictureAndCaption()
    {
        var marked = PrintAttachment.Plain(ORIGINAL, CAPTION).WithMarks(new[] { Shape(MarkKind.Rectangle) }, MARKED);

        marked.ToPromptImage().Should().Be(new PromptImage(MARKED, marked.Caption));
    }

    [Fact]
    public void TheNoteCountsEachKindInOrderWithPlurals()
    {
        var pencil = new Mark(MarkKind.Pencil, new[] { new MarkPoint(1, 1), new MarkPoint(20, 20) });
        var marks = new[] { Shape(MarkKind.Arrow), pencil, Shape(MarkKind.Arrow), Shape(MarkKind.Rectangle), pencil };

        PromptImage.MarkupNote(marks).Should().EndWith("(não fazem parte da cena): 2 traços à mão, 1 retângulo, 2 setas.");
        PromptImage.MarkupNote(Array.Empty<Mark>()).Should().BeEmpty();
    }
}
