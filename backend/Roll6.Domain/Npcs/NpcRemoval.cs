using Roll6.Domain.Enums;
using Roll6.Domain.Models;

namespace Roll6.Domain.Npcs;

/// <summary>
/// What happens to the piece of an NPC occurrence taken off the map (109): standing, it goes with the occurrence; down or
/// out of combat, the body stays where it fell as an Object piece (<see cref="MapToken.LeaveBody"/>). The same rule for
/// the card's X, "Retirar do mapa" and removing the NPC from the campaign.
/// </summary>
public static class NpcRemoval
{
    public enum Outcome
    {
        Delete,
        Body
    }

    public static Outcome Decide(MapNpc instance) =>
        instance.Posture == Posture.Standing ? Outcome.Delete : Outcome.Body;

    /// <summary>Applies the rule to an occurrence's piece: true when it became a body (update it), false when it must be deleted.</summary>
    public static bool LeavesBody(MapNpc instance, MapToken piece)
    {
        if (Decide(instance) != Outcome.Body)
            return false;
        piece.LeaveBody(instance.Name, instance.Posture);
        return true;
    }
}
