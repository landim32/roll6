namespace Roll6.Domain.Enums;

/// <summary>
/// How a character or NPC is on the map (031): standing, down ("Caído") or out of combat ("Fora de combate").
/// Down and out-of-combat pieces lie down and take the token's down size; out-of-combat pieces are also drawn in black
/// and white. Kept by the participation (per campaign) and by the NPC occurrence; objects have no posture.
/// </summary>
public enum Posture
{
    Standing = 1,
    Down = 2,
    OutOfCombat = 3
}
