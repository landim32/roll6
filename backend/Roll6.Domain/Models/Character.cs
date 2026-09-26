using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

public class Character
{
    public long CharacterId { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sheet { get; set; }
    public int Life { get; set; }
    public int Energy { get; set; }
    public int Move { get; set; }
    public string? Image { get; set; }

    /// <summary>Library token placed on the map when the character is dragged there (optional).</summary>
    public long? TokenId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Life and energy are the character's totals (≥ 0); current values, the status and the campaign's copy of
    /// the sheet live in each campaign participation. Only the owner changes the character.
    /// </summary>
    public void Update(string? name, string? sheet, int life, int energy, int move, string? image, long? tokenId)
    {
        Name = Guard.RequiredText(name, "name", 260);
        Sheet = Guard.OptionalText(sheet, "sheet", 20000);
        Life = Guard.NonNegative(life, "life");
        Energy = Guard.NonNegative(energy, "energy");
        Move = Guard.NonNegative(move, "move");
        Image = Guard.ImageFileName(image, "image");
        TokenId = tokenId;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Gives the character the token chosen when it is placed on a map without one — the only change the
    /// campaign master may make to someone else's character (011 FR-001/FR-015). An existing token is kept.
    /// </summary>
    /// <returns>True when the token was assigned.</returns>
    public bool AssignTokenIfMissing(long tokenId)
    {
        if (TokenId.HasValue)
            return false;
        TokenId = tokenId;
        UpdatedAt = DateTime.UtcNow;
        return true;
    }
}
