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

    /// <summary>
    /// Deslocamento of this instance (051): movement points per turn, shown on its piece. Starts at the NPC's move and
    /// follows a changed NPC move only while untouched (like a participation's Deslocamento, 037). Never a maximum for
    /// the master, who moves any piece freely.
    /// </summary>
    public int CurrentMove { get; set; }

    /// <summary>
    /// Removed from the map (051): the piece is gone, but the row stays so the turn entries keep naming the instance.
    /// Listings of a map skip removed instances; reads by id still find them.
    /// </summary>
    public DateTime? RemovedAt { get; set; }

    public bool IsRemoved => RemovedAt.HasValue;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public const int MAX_NAME = 260;

    /// <summary>
    /// The name of a new instance (051): the NPC's name when no active instance of that NPC on the map uses it, else
    /// "{name} N" with the smallest N ≥ 2 not in use — so a number freed by a removal or a rename is used again.
    /// </summary>
    public static string NextName(string npcName, IEnumerable<string> namesInUse)
    {
        var used = namesInUse.Select(n => n.Trim()).ToHashSet();
        var baseName = npcName.Trim();
        if (!used.Contains(baseName))
            return baseName;
        for (var n = 2; ; n++)
        {
            var suffix = $" {n}";
            var cut = baseName.Length + suffix.Length > MAX_NAME ? baseName[..(MAX_NAME - suffix.Length)].TrimEnd() : baseName;
            var candidate = cut + suffix;
            if (!used.Contains(candidate))
                return candidate;
        }
    }

    /// <summary>Takes the instance off the map (051); false when it already was. Its turn entries stay.</summary>
    public bool Remove(DateTime now)
    {
        if (IsRemoved)
            return false;
        RemovedAt = now;
        UpdatedAt = now;
        return true;
    }

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
            CurrentMove = npc.Move,
            CreatedAt = now,
            UpdatedAt = now
        };
    }

    /// <summary>
    /// Changes only this occurrence; current life and energy may go to zero or below but never above the
    /// NPC's totals. <paramref name="currentMove"/> null keeps the Deslocamento (051).
    /// </summary>
    public void Update(string? name, int currentLife, int currentEnergy, string? status, int totalLife, int totalEnergy,
        int? currentMove = null)
    {
        if (currentLife > totalLife)
            throw new DomainValidationException("currentLife", $"A vida atual não pode passar da vida total ({totalLife}).");
        if (currentEnergy > totalEnergy)
            throw new DomainValidationException("currentEnergy", $"A energia atual não pode passar da energia total ({totalEnergy}).");
        Name = Guard.RequiredText(name, "name", MAX_NAME);
        CurrentLife = currentLife;
        CurrentEnergy = currentEnergy;
        Status = Guard.OptionalText(status, "status", 260);
        if (currentMove is int move)
            CurrentMove = Guard.NonNegative(move, "currentMove");
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
