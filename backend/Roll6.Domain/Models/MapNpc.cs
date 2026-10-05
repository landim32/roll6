using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>
/// One occurrence of an NPC on a campaign map, with its own name, current life, current energy and status (three
/// goblins on the same map are three occurrences); the totals are the NPC's (026, like a participation and its
/// character). It is shown by a map piece linked through <see cref="MapToken.MapNpcId"/>, which reads these values.
/// </summary>
public class MapNpc
{
    public long MapNpcId { get; set; }
    public long MapId { get; set; }
    public long NpcId { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>Current life (at most the NPC's life; 0 or below is allowed and does not change posture).</summary>
    public int CurrentLife { get; set; }

    /// <summary>Current energy (at most the NPC's energy).</summary>
    public int CurrentEnergy { get; set; }
    public string? Status { get; set; }

    /// <summary>Standing, down or out of combat (031); starts standing.</summary>
    public Posture Posture { get; set; } = Posture.Standing;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Starts with the NPC's name, status and posture and the current values at the NPC's totals.</summary>
    public static MapNpc FromNpc(long mapId, Npc npc)
    {
        var now = DateTime.UtcNow;
        return new MapNpc
        {
            MapId = mapId,
            NpcId = npc.NpcId,
            Name = npc.Name,
            CurrentLife = npc.Life,
            CurrentEnergy = npc.Energy,
            Status = npc.Status,
            Posture = npc.Posture,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    /// <summary>
    /// Changes only this occurrence; current life and energy may go to zero or below but never above the
    /// NPC's totals.
    /// </summary>
    public void Update(string? name, int currentLife, int currentEnergy, string? status, int totalLife, int totalEnergy)
    {
        if (currentLife > totalLife)
            throw new DomainValidationException("currentLife", $"A vida atual não pode passar da vida total ({totalLife}).");
        if (currentEnergy > totalEnergy)
            throw new DomainValidationException("currentEnergy", $"A energia atual não pode passar da energia total ({totalEnergy}).");
        Name = Guard.RequiredText(name, "name", 260);
        CurrentLife = currentLife;
        CurrentEnergy = currentEnergy;
        Status = Guard.OptionalText(status, "status", 260);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Changes the posture; false when it already was that one.</summary>
    public bool ChangePosture(int posture)
    {
        var value = Guard.ValidPosture(posture, "posture");
        if (value == Posture)
            return false;
        Posture = value;
        UpdatedAt = DateTime.UtcNow;
        return true;
    }
}
