using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>A non-player character in its owner's library; placed on maps through campaigns (<see cref="CampaignNpc"/>, <see cref="MapNpc"/>).</summary>
public class Npc
{
    public long NpcId { get; set; }
    public long UserId { get; set; }

    /// <summary>Library token used for the NPC's pieces on the maps (required).</summary>
    public long TokenId { get; set; }

    public string Name { get; set; } = string.Empty;
    public int Life { get; set; }
    public int Energy { get; set; }
    public int Move { get; set; }
    public string? Sheet { get; set; }
    public string? Image { get; set; }

    /// <summary>Free-text condition ("ferido"); each new map occurrence starts with it.</summary>
    public string? Status { get; set; }

    /// <summary>Posture each new map occurrence starts with (031): standing unless the NPC is registered lying down.</summary>
    public Posture Posture { get; set; } = Posture.Standing;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Only the owner changes an NPC (checked by the service); same limits as a character.</summary>
    public void Update(long tokenId, string? name, int life, int energy, int move, string? sheet, string? image, string? status = null, int? posture = null)
    {
        if (tokenId <= 0)
            throw new DomainValidationException("tokenId", "O token é obrigatório.");
        TokenId = tokenId;
        Name = Guard.RequiredText(name, "name", 260);
        Life = Guard.NonNegative(life, "life");
        Energy = Guard.NonNegative(energy, "energy");
        Move = Guard.NonNegative(move, "move");
        Sheet = Guard.OptionalText(sheet, "sheet", 20000);
        Image = Guard.ImageFileName(image, "image");
        Status = Guard.OptionalText(status, "status", 260);
        Posture = posture is int value ? Guard.ValidPosture(value, "posture") : Posture.Standing;
        UpdatedAt = DateTime.UtcNow;
    }
}
