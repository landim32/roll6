namespace Roll6.Domain.Notifications;

/// <summary>
/// The majority of a turn (043, 074): half of the approved characters, rounded up. From it on, each first action of a
/// character reminds whoever is still missing (<see cref="Pending"/>).
/// </summary>
public static class Majority
{
    public static int Threshold(int approvedCharacters) => (approvedCharacters + 1) / 2;
}
