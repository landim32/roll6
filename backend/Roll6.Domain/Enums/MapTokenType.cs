namespace Roll6.Domain.Enums;

/// <summary>
/// Kind of map piece: a campaign character, an NPC occurrence (placed from the NPC panel) or an object
/// (any other token, e.g. from the hex menu). Value 3 (Enemy) was removed; stored values keep their numbers.
/// </summary>
public enum MapTokenType
{
    Character = 1,
    Npc = 2,
    Object = 4
}
