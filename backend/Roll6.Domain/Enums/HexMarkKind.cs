namespace Roll6.Domain.Enums;

/// <summary>
/// What a painted hex of a campaign map shows (107). Informative only: no movement, occupancy or turn rule reads it.
/// Only <see cref="Mark"/> carries a text.
/// </summary>
public enum HexMarkKind
{
    Wall = 1,
    Stone = 2,
    Hole = 3,
    Water = 4,
    Fire = 5,
    Entrance = 6,
    Mark = 7
}
