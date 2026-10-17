using System.Text.Json.Serialization;

namespace Roll6.DTO.MapToken;

public class MapTokenInfo
{
    [JsonPropertyName("mapTokenId")]
    public long MapTokenId { get; set; }

    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("tokenId")]
    public long TokenId { get; set; }

    [JsonPropertyName("tokenName")]
    public string TokenName { get; set; } = string.Empty;

    [JsonPropertyName("upImageUrl")]
    public string? UpImageUrl { get; set; }

    [JsonPropertyName("downImageUrl")]
    public string? DownImageUrl { get; set; }

    /// <summary>"2.5D front" image of the piece's token (034), standing figure of the 3D view; null when it has none.</summary>
    [JsonPropertyName("frontImageUrl")]
    public string? FrontImageUrl { get; set; }

    /// <summary>"2.5D right" image of the piece's token (035): profile looking to the right of the image.</summary>
    [JsonPropertyName("rightImageUrl")]
    public string? RightImageUrl { get; set; }

    /// <summary>"2.5D left" image of the piece's token (035): profile looking to the left of the image.</summary>
    [JsonPropertyName("leftImageUrl")]
    public string? LeftImageUrl { get; set; }

    /// <summary>"2.5D back" image of the piece's token (035): seen from behind.</summary>
    [JsonPropertyName("backImageUrl")]
    public string? BackImageUrl { get; set; }

    /// <summary>3D model of the piece's token (055): a .glb the 3D view draws instead of the 2.5D figure.</summary>
    [JsonPropertyName("modelFileUrl")]
    public string? ModelFileUrl { get; set; }

    /// <summary>Animations chosen for the token's model (056): null = automatic, "none", "clip:{name}" or "animation:{id}".</summary>
    [JsonPropertyName("modelIdleClip")]
    public string? ModelIdleClip { get; set; }

    [JsonPropertyName("modelWalkClip")]
    public string? ModelWalkClip { get; set; }

    /// <summary>The death (058): what the 3D view shows, at its last frame, while the piece is down or out of combat.</summary>
    [JsonPropertyName("modelDownClip")]
    public string? ModelDownClip { get; set; }

    /// <summary>Size of the token's 3D model in the 3D view (063), percent of its automatic height (100 = as before).</summary>
    [JsonPropertyName("modelScale")]
    public int ModelScale { get; set; } = 100;

    /// <summary>Weapon in the model's right hand (082): name, file URL and grip; null = none.</summary>
    [JsonPropertyName("rightWeapon")]
    public Weapon.TokenWeaponInfo? RightWeapon { get; set; }

    /// <summary>Weapon in the model's left hand (082); null = none.</summary>
    [JsonPropertyName("leftWeapon")]
    public Weapon.TokenWeaponInfo? LeftWeapon { get; set; }

    /// <summary>Participation of a Character token (its name/vitals/status/sheet are shown).</summary>
    [JsonPropertyName("campaignCharacterId")]
    public long? CampaignCharacterId { get; set; }

    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    /// <summary>NPC occurrence of an Npc piece (its name/vitals/status are shown).</summary>
    [JsonPropertyName("mapNpcId")]
    public long? MapNpcId { get; set; }

    [JsonPropertyName("npcId")]
    public long? NpcId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("tokenType")]
    public int TokenType { get; set; }

    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    [JsonPropertyName("life")]
    public int Life { get; set; }

    [JsonPropertyName("energy")]
    public int Energy { get; set; }

    /// <summary>Maximum life: the character's or the NPC's total (the piece's own life for objects, 026).</summary>
    [JsonPropertyName("totalLife")]
    public int TotalLife { get; set; }

    /// <summary>Maximum energy: the character's or the NPC's total (the piece's own energy for objects).</summary>
    [JsonPropertyName("totalEnergy")]
    public int TotalEnergy { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("move")]
    public int Move { get; set; }

    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("look")]
    public int Look { get; set; }

    /// <summary>NPC pieces (071): 1 Inimigo, 2 Neutro, 3 Aliado in the piece's campaign; null for characters and objects.</summary>
    [JsonPropertyName("npcCategory")]
    public int? NpcCategory { get; set; }

    /// <summary>NPC pieces (071): the player commanding this ally (owner of its approved master character); null when none.</summary>
    [JsonPropertyName("commanderUserId")]
    public long? CommanderUserId { get; set; }

    /// <summary>Where a 3D walk left the figure inside its hex (map pixels) and its exact direction (radians); null = the middle of the hex, facing look (069).</summary>
    [JsonPropertyName("walkX")]
    public double? WalkX { get; set; }

    [JsonPropertyName("walkY")]
    public double? WalkY { get; set; }

    [JsonPropertyName("walkYaw")]
    public double? WalkYaw { get; set; }

    /// <summary>Posture of the character/NPC occurrence: 1 standing, 2 down, 3 out of combat; null for objects (031).</summary>
    [JsonPropertyName("posture")]
    public int? Posture { get; set; }

    /// <summary>Hexes the piece takes now (1, 2, 3, 7 or 10): the token's standing or down size, by the posture.</summary>
    [JsonPropertyName("space")]
    public int Space { get; set; } = 1;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
