namespace Roll6.Domain.Enums;

/// <summary>
/// Which side an NPC is on in a campaign (071): enemies and neutrals stay in the NPC panel; allies go to the party's
/// side and may have a master character whose owner commands them. Kept per campaign NPC.
/// </summary>
public enum NpcCategory
{
    Enemy = 1,
    Neutral = 2,
    Ally = 3
}
