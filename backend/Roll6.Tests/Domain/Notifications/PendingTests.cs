using FluentAssertions;
using Roll6.Domain.Notifications;

namespace Roll6.Tests.Domain.Notifications;

/// <summary>074: "Falta apenas Fulano e você" — the US3 table and its edges.</summary>
public class PendingTests
{
    // Ana (1) plays Aria (10), Bruno (2) Bram (20), Caio (3) Cael (30), Duda (4) Dara (40).
    private static readonly long[] FOUR = { 10, 20, 30, 40 };
    private static readonly Dictionary<long, long> OWNERS = new() { [10] = 1, [20] = 2, [30] = 3, [40] = 4 };
    private static readonly Dictionary<long, string> NAMES = new() { [1] = "Ana", [2] = "Bruno", [3] = "Caio", [4] = "Duda" };

    private static IReadOnlyDictionary<long, string> Remind(params long[] acted) => Pending.Reminders(FOUR, acted, OWNERS, NAMES);

    [Fact]
    public void Us3Table()
    {
        Remind(10).Should().BeEmpty();
        Remind(10, 20).Should().BeEquivalentTo(new Dictionary<long, string>
        {
            [3] = "Falta apenas Duda e você",
            [4] = "Falta apenas Caio e você"
        });
        Remind(10, 20, 30).Should().BeEquivalentTo(new Dictionary<long, string> { [4] = "Falta só você" });
        Remind(10, 20, 30, 40).Should().BeEmpty();
    }

    [Fact]
    public void ThreeCharacters_MajorityIsTwo_AndNamesAreSorted()
    {
        var reminders = Pending.Reminders(new long[] { 10, 20, 30, 40, 50 }, new long[] { 10, 20, 30 },
            new Dictionary<long, long>(OWNERS) { [50] = 5 }, new Dictionary<long, string>(NAMES) { [5] = "Beto" });

        reminders[4].Should().Be("Falta apenas Beto e você");
        reminders[5].Should().Be("Falta apenas Duda e você");
        Pending.Reminders(new long[] { 10, 20, 30 }, new long[] { 10 }, OWNERS, NAMES).Should().BeEmpty();
        // Five characters: the majority is 3, so two actions remind nobody.
        Pending.Reminders(new long[] { 10, 20, 30, 40, 50 }, new long[] { 10, 20 }, new Dictionary<long, long>(OWNERS) { [50] = 5 },
            new Dictionary<long, string>(NAMES) { [5] = "Beto" }).Should().BeEmpty();
        Pending.Reminders(new long[] { 10, 20, 30, 40 }, new long[] { 10, 20 }, OWNERS, NAMES)[3].Should().Be("Falta apenas Duda e você");
    }

    [Fact]
    public void ASingleCharacter_NeverRemindsAnybody()
    {
        Pending.Reminders(new long[] { 10 }, new long[] { 10 }, OWNERS, NAMES).Should().BeEmpty();
        Pending.Reminders(Array.Empty<long>(), Array.Empty<long>(), OWNERS, NAMES).Should().BeEmpty();
    }

    [Fact]
    public void APlayerWithTwoCharacters_IsMissingUntilBothActed_AndNamedOnce()
    {
        // Duda plays Dara (40) and Dino (41).
        var owners = new Dictionary<long, long>(OWNERS) { [41] = 4 };
        var all = new long[] { 10, 20, 30, 40, 41 };

        var reminders = Pending.Reminders(all, new long[] { 10, 20, 30, 40 }, owners, NAMES);

        reminders.Should().BeEquivalentTo(new Dictionary<long, string> { [4] = "Falta só você" });
        Pending.Reminders(all, new long[] { 10, 20, 40 }, owners, NAMES)[3].Should().Be("Falta apenas Duda e você");
    }

    [Fact]
    public void ActionsOfCharactersOutsideTheTable_DoNotCount()
    {
        Remind(10, 99).Should().BeEmpty();
    }
}
