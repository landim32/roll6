using Roll6.Domain.Enums;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

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
    /// <summary>"2.5D front" (034): the figure seen from the front, standing, used by the 3D view. Optional.</summary>
    public string? FrontImage { get; set; }
    /// <summary>"2.5D right" (035): the figure in profile, looking to the right of the image. Optional.</summary>
    public string? RightImage { get; set; }
    /// <summary>"2.5D left" (035): the figure in profile, looking to the left of the image. Optional.</summary>
    public string? LeftImage { get; set; }
    /// <summary>"2.5D back" (035): the figure seen from behind. Optional.</summary>
    public string? BackImage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public void Update(string? name, string? description, int? upSpace, int? downSpace, string? upImage, string? downImage)
    {
        Name = Guard.RequiredText(name, "name", 260);
        Description = Guard.OptionalText(description, "description", 2000);
        UpSpace = Guard.TokenSpace(upSpace ?? DEFAULT_UP_SPACE, "upSpace");
        UpImage = Guard.ImageFileName(upImage, "upImage");
        DownImage = Guard.ImageFileName(downImage, "downImage");
        DownSpace = ResolveDownSpace(downSpace, DownImage);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// The four "2.5D" images the 3D view draws (035), each optional and independent; separate from Update so
    /// the group has one place. A null removes the stored file (the PUT of a token replaces every field).
    /// </summary>
    public void UpdateSprites(string? front, string? right, string? left, string? back)
    {
        FrontImage = Guard.ImageFileName(front, "frontImage");
        RightImage = Guard.ImageFileName(right, "rightImage");
        LeftImage = Guard.ImageFileName(left, "leftImage");
        BackImage = Guard.ImageFileName(back, "backImage");
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Hexes a piece of this token takes (031): the standing size while standing (and for objects, which have no
    /// posture), the down size while down or out of combat — or the standing one when the token has no down state.
    /// </summary>
    public int SpaceFor(Posture? posture) =>
        posture is null or Posture.Standing ? UpSpace : DownSpace ?? UpSpace;

    /// <summary>
    /// Informed value wins; otherwise the default only applies when the token has a down image,
    /// and a token with neither has no down state.
    /// </summary>
    private static int? ResolveDownSpace(int? downSpace, string? downImage)
    {
        if (downSpace.HasValue)
            return Guard.TokenSpace(downSpace.Value, "downSpace");
        return downImage != null ? DEFAULT_DOWN_SPACE : null;
    }
}
