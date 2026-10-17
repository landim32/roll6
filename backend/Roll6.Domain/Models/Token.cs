using Roll6.Domain.Enums;
using Roll6.Domain.Validation;
using Roll6.Domain.Weapons;

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
    /// <summary>3D model (055): a .glb drawn by the 3D view instead of the 2.5D figure. Optional.</summary>
    public string? ModelFile { get; set; }
    /// <summary>
    /// Which animation the 3D view plays while the model stands still (056): null = automatic (a clip of the file
    /// named for it, else none), "none", "clip:{name}" (a clip of the file, by its exact name) or "animation:{id}" (a
    /// library animation, 059). Only with a model.
    /// </summary>
    public string? ModelIdleClip { get; set; }
    /// <summary>Which animation the 3D view plays while the model walks (056); same values as ModelIdleClip.</summary>
    public string? ModelWalkClip { get; set; }
    /// <summary>The death (058): played once when a piece of this token is down or out of combat; same values.</summary>
    public string? ModelDownClip { get; set; }
    /// <summary>
    /// Size of the 3D model in the 3D view (063): percentage of its automatic height, 25–400 in steps of 5; 100 without a
    /// model.
    /// </summary>
    public int ModelScale { get; set; } = Guard.MODEL_SCALE_DEFAULT;
    /// <summary>The library weapon held in the right hand of the 3D model (082); null = none. Only with a model.</summary>
    public long? RightWeaponId { get; set; }
    /// <summary>The library weapon held in the left hand (082); null = none. The same weapon may be in both hands.</summary>
    public long? LeftWeaponId { get; set; }
    /// <summary>How the right hand holds its weapon (082, <see cref="WeaponGrip"/> as JSON); null = default.</summary>
    public string? RightWeaponGrip { get; set; }
    /// <summary>How the left hand holds its weapon (082); null = default.</summary>
    public string? LeftWeaponGrip { get; set; }
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
    /// The token's 3D model (055) and the animations chosen for it (056; the death since 058); null removes it (the PUT
    /// of a token replaces every field). Without a model the choices are dropped and the size goes back to 100: they only
    /// mean something for a file. The size (063) is null = 100.
    /// </summary>
    public void UpdateModel(string? modelFile, string? idleClip = null, string? walkClip = null, string? downClip = null, int? scale = null)
    {
        ModelFile = Guard.ModelFileName(modelFile, "modelFile");
        ModelIdleClip = ModelFile == null ? null : Guard.ModelClip(idleClip, "modelIdleClip");
        ModelWalkClip = ModelFile == null ? null : Guard.ModelClip(walkClip, "modelWalkClip");
        ModelDownClip = ModelFile == null ? null : Guard.ModelClip(downClip, "modelDownClip");
        ModelScale = ModelFile == null ? Guard.MODEL_SCALE_DEFAULT : Guard.ModelScale(scale, "modelScale");
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// The weapons in the model's hands (082), one per hand (Q2 = B), each with its own grip (Q1 = B). Called after
    /// <see cref="UpdateModel"/>: without a model both hands are emptied, and a hand without a weapon keeps no grip.
    /// The PUT of a token replaces every field, so a hand left out is emptied.
    /// </summary>
    public void UpdateWeapons(TokenHand? right, TokenHand? left)
    {
        if (ModelFile == null)
        {
            right = null;
            left = null;
        }
        RightWeaponId = right?.WeaponId;
        RightWeaponGrip = right?.Grip?.Validate("rightWeapon").ToJson();
        LeftWeaponId = left?.WeaponId;
        LeftWeaponGrip = left?.Grip?.Validate("leftWeapon").ToJson();
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
