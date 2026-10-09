using FluentAssertions;
using Roll6.Domain.Notifications;

namespace Roll6.Tests.Domain.Notifications;

public class NoticeTextsTests
{
    [Fact]
    public void Plain_StripsMarkdown()
    {
        NoticeTexts.Plain("**Ataco** o _orc_ com a [espada](http://x) ![img](a.png)\n\n> e grito")
            .Should().Be("Ataco o orc com a espada e grito");
        NoticeTexts.Plain("  ").Should().BeEmpty();
    }

    [Fact]
    public void Ellipsize_CutsAtAWord()
    {
        var text = string.Join(' ', Enumerable.Repeat("palavra", 30));
        var cut = NoticeTexts.Ellipsize(text);
        cut.Length.Should().BeLessThanOrEqualTo(NoticeTexts.MAX_BODY);
        cut.Should().EndWith("palavra…");
        NoticeTexts.Ellipsize("curto").Should().Be("curto");
    }

    [Fact]
    public void Names()
    {
        NoticeTexts.FirstName(" Bruno Carneiro ").Should().Be("Bruno");
        NoticeTexts.JoinNames(new[] { "Ana" }).Should().Be("Ana");
        NoticeTexts.JoinNames(new[] { "Ana", "Bruno" }).Should().Be("Ana e Bruno");
        NoticeTexts.JoinNames(new[] { "Ana", "Bruno", "Caio" }).Should().Be("Ana, Bruno e Caio");
    }

    [Fact]
    public void Bodies()
    {
        NoticeTexts.Majority(Array.Empty<string>()).Should().Be("Falta apenas você");
        NoticeTexts.Majority(new[] { "Bruno" }).Should().Be("Falta apenas você e Bruno");
        NoticeTexts.Majority(new[] { "Bruno", "Ana" }).Should().Be("Falta apenas você, Bruno e Ana");
        NoticeTexts.TurnFinished(12).Should().Be("Turno 12 terminado. Pode agir novamente");
        NoticeTexts.Life(-3, 13).Should().Be("Você está com -3/13 PV");
        NoticeTexts.Fatigue(5, 11).Should().Be("Você está com 5/11 de Fadiga");
        NoticeTexts.Poke("Rodrigo").Should().Be("Rodrigo está cutucando você");
        NoticeTexts.PokeLine("Rodrigo", "Ana e Bruno").Should().Be("Rodrigo cutucou Ana e Bruno");
        NoticeTexts.Roll(14).Should().Be("rolou 3d6: total 14");
        NoticeTexts.Narration("O **orc** cai.").Should().Be("Narração: O orc cai.");
        NoticeTexts.Title("Aria", "Tormento Vil").Should().Be("Aria · Tormento Vil");
        NoticeTexts.Title(null, "Tormento Vil").Should().Be("Tormento Vil");
    }
}
