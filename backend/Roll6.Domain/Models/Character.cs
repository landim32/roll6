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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Life and energy are the character's totals (≥ 0); current values, the status and the campaign's copy of
    /// the sheet live in each campaign participation. Only the owner changes the character.
    /// </summary>
    public void Update(string? name, string? sheet, int life, int energy, int move, string? image)
    {
        Name = Guard.RequiredText(name, "name", 260);
        Sheet = Guard.OptionalText(sheet, "sheet", 20000);
        Life = Guard.NonNegative(life, "life");
        Energy = Guard.NonNegative(energy, "energy");
        Move = Guard.NonNegative(move, "move");
        Image = Guard.ImageFileName(image, "image");
        UpdatedAt = DateTime.UtcNow;
    }
}
