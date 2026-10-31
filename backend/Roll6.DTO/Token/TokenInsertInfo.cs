using System.Text.Json.Serialization;

namespace Roll6.DTO.Token;

public class TokenInsertInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("upSpace")]
    public int? UpSpace { get; set; }

    [JsonPropertyName("downSpace")]
    public int? DownSpace { get; set; }

    [JsonPropertyName("upImage")]
    public string? UpImage { get; set; }

    [JsonPropertyName("downImage")]
    public string? DownImage { get; set; }

    /// <summary>"2.5D front" image (034): the figure seen from the front, used by the 3D view. Optional.</summary>
    [JsonPropertyName("frontImage")]
    public string? FrontImage { get; set; }

    /// <summary>"2.5D right" image (035): the figure in profile, looking to the right of the image. Optional.</summary>
    [JsonPropertyName("rightImage")]
    public string? RightImage { get; set; }

    /// <summary>"2.5D left" image (035): the figure in profile, looking to the left of the image. Optional.</summary>
    [JsonPropertyName("leftImage")]
    public string? LeftImage { get; set; }

    /// <summary>"2.5D back" image (035): the figure seen from behind. Optional.</summary>
    [JsonPropertyName("backImage")]
    public string? BackImage { get; set; }

    /// <summary>3D model (055): fileName returned by POST /api/model (a .glb). Optional; omitted on PUT = removed.</summary>
    [JsonPropertyName("modelFile")]
    public string? ModelFile { get; set; }

    /// <summary>
    /// Animation played while the model stands still (056): omitted = automatic, "none", "clip:{name}" (a clip of the
    /// file, by its exact name) or "animation:{id}" (a library animation, 059). Ignored without modelFile.
    /// </summary>
    [JsonPropertyName("modelIdleClip")]
    public string? ModelIdleClip { get; set; }

    /// <summary>Animation played while the model walks (056); same values as modelIdleClip.</summary>
    [JsonPropertyName("modelWalkClip")]
    public string? ModelWalkClip { get; set; }

    /// <summary>
    /// Animation played once when a piece of this token is down or out of combat, resting on its last frame (058);
    /// same values as modelIdleClip. Omitted = automatic.
    /// </summary>
    [JsonPropertyName("modelDownClip")]
    public string? ModelDownClip { get; set; }

    /// <summary>
    /// Size of the 3D model in the 3D view (063): percentage of its automatic height, 25–400 in steps of 5. Omitted = 100.
    /// Ignored without modelFile.
    /// </summary>
    [JsonPropertyName("modelScale")]
    public int? ModelScale { get; set; }

    /// <summary>
    /// Which side of the file is the model's front (106), for models without a skeleton: 0 (+Z, glTF's forward), 90 (+X),
    /// 180 (−Z), 270 (−X) or any whole degree between 0 and 359. Omitted = 0. Ignored without modelFile.
    /// </summary>
    [JsonPropertyName("modelFront")]
    public int? ModelFront { get; set; }

    /// <summary>
    /// The weapons in the model's sockets (083): { socket (1 right hand, 2 left hand, 3 back, 4 right holster, 5 left
    /// holster), weaponId, grip? } each. Omitted or empty = none (the PUT replaces the whole set); ignored without
    /// modelFile. The same weapon may be in several sockets; the same socket only once.
    /// </summary>
    [JsonPropertyName("weapons")]
    public List<Weapon.TokenWeaponInfo>? Weapons { get; set; }
}
