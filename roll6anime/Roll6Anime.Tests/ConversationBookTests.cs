using FluentAssertions;
using Roll6Anime.Core.Claude;

namespace Roll6Anime.Tests;

/// <summary>One conversation per animation (062, Q3 = A).</summary>
public class ConversationBookTests
{
    private readonly ConversationBook _book = new();

    [Fact]
    public void AFileKeepsItsConversationIgnoringCase()
    {
        var first = _book.For("aceno.json");

        _book.For("ACENO.json").Should().BeSameAs(first);
        _book.For("outra.json").SessionId.Should().NotBe(first.SessionId);
        first.Started.Should().BeFalse();
    }

    [Fact]
    public void NewConversationStartsTheFilesConversationAgain()
    {
        var first = _book.For("aceno.json");
        first.Messages.Add(new ConversationMessage(ConversationRole.User, "feche a mão"));
        first.Started = true;

        var again = _book.Reset("aceno.json");

        again.SessionId.Should().NotBe(first.SessionId);
        again.Messages.Should().BeEmpty();
        again.Started.Should().BeFalse();
        _book.For("aceno.json").Should().BeSameAs(again);
    }

    [Fact]
    public void TheNewAnimationConversationIsAdoptedByTheCreatedFile()
    {
        var creating = _book.For(null);

        _book.Adopt("agachar.json").Should().BeSameAs(creating);

        _book.For("agachar.json").Should().BeSameAs(creating);
        _book.For(null).Should().NotBeSameAs(creating);
    }

    [Fact]
    public void ARenamedFileKeepsItsConversation()
    {
        var conversation = _book.For("a.json");

        _book.Rename("a.json", "b.json");

        _book.For("b.json").Should().BeSameAs(conversation);
        _book.For("a.json").Should().NotBeSameAs(conversation);
    }
}
