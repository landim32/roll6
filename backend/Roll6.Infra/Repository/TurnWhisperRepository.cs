using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class TurnWhisperRepository : ITurnWhisperRepository<TurnWhisperTarget>
{
    private readonly Roll6Context _context;

    public TurnWhisperRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task InsertAsync(IEnumerable<TurnWhisperTarget> targets)
    {
        _context.TurnWhisperTargets.AddRange(targets);
        await _context.SaveChangesAsync();
    }

    public async Task<List<TurnWhisperTarget>> ListByTurnsAsync(IEnumerable<long> turnIds)
    {
        var ids = turnIds.Distinct().ToList();
        if (ids.Count == 0)
            return new List<TurnWhisperTarget>();
        return await _context.TurnWhisperTargets.AsNoTracking().Where(w => ids.Contains(w.TurnId))
            .OrderBy(w => w.TurnWhisperTargetId).ToListAsync();
    }
}
