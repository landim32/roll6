using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>
/// One occurrence of an NPC on a campaign map, with its own name, life, energy and status (three goblins on
/// the same map are three occurrences). It is shown by a map piece linked through <see cref="MapToken.MapNpcId"/>.
/// </summary>
public class MapNpc
{
    public long MapNpcId { get; set; }
    public long MapId { get; set; }
    public long NpcId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Life { get; set; }
    public int Energy { get; set; }
    public string? Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Starts with the NPC's name, life and energy and no status.</summary>
    public static MapNpc FromNpc(long mapId, Npc npc)
    {
        var now = DateTime.UtcNow;
        return new MapNpc
        {
            MapId = mapId,
            NpcId = npc.NpcId,
            Name = npc.Name,
            Life = npc.Life,
            Energy = npc.Energy,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    /// <summary>Changes only this occurrence; life and energy may go to zero or below (fallen).</summary>
    public void Update(string? name, int life, int energy, string? status)
    {
        Name = Guard.RequiredText(name, "name", 260);
        Life = life;
        Energy = energy;
        Status = Guard.OptionalText(status, "status", 260);
        UpdatedAt = DateTime.UtcNow;
    }
}
