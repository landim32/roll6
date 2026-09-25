using SimpleTabletopMap.Domain.Validation;

namespace SimpleTabletopMap.Domain.Models;

public class Token
{
    public const int DEFAULT_UP_SPACE = 1;
    public const int DEFAULT_DOWN_SPACE = 2;

    public long TokenId { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int UpSpace { get; set; } = DEFAULT_UP_SPACE;
    /// <summary>Space when lying down; null means the token has no down state.</summary>
    public int? DownSpace { get; set; }
    public string? UpImage { get; set; }
    public string? DownImage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public void Update(string? name, string? description, int? upSpace, int? downSpace, string? upImage, string? downImage)
    {
        Name = Guard.RequiredText(name, "name", 260);
        Description = Guard.OptionalText(description, "description", 2000);
        UpSpace = Guard.NonNegative(upSpace ?? DEFAULT_UP_SPACE, "upSpace");
        UpImage = Guard.ImageFileName(upImage, "upImage");
        DownImage = Guard.ImageFileName(downImage, "downImage");
        DownSpace = ResolveDownSpace(downSpace, DownImage);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Informed value wins; otherwise the default only applies when the token has a down image,
    /// and a token with neither has no down state.
    /// </summary>
    private static int? ResolveDownSpace(int? downSpace, string? downImage)
    {
        if (downSpace.HasValue)
            return Guard.NonNegative(downSpace.Value, "downSpace");
        return downImage != null ? DEFAULT_DOWN_SPACE : null;
    }
}
