namespace Roll6.Infra.Interfaces.Repository;

/// <summary>Where a character stands (108): the map of its piece, the one its owner sees.</summary>
public class CharacterMapRow
{
    public long CampaignCharacterId { get; set; }
    public long CampaignId { get; set; }
    public long CharacterId { get; set; }

    /// <summary>The character's current owner.</summary>
    public long OwnerUserId { get; set; }

    public long MapId { get; set; }
    public string MapName { get; set; } = string.Empty;
}
