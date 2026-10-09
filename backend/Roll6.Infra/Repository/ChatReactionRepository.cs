using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class ChatReactionRepository : IChatReactionRepository<ChatReaction>
{
    private readonly Roll6Context _context;

    public ChatReactionRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<List<ChatReaction>> ListByTurnsAsync(IEnumerable<long> turnIds)
    {
        var ids = turnIds.Distinct().ToList();
        return await _context.ChatReactions.AsNoTracking().Where(r => ids.Contains(r.TurnId))
            .OrderBy(r => r.CreatedAt).ToListAsync();
    }

    public async Task<ChatReaction?> GetAsync(long turnId, long userId)
    {
        return await _context.ChatReactions.AsNoTracking().FirstOrDefaultAsync(r => r.TurnId == turnId && r.UserId == userId);
    }

    public async Task<ChatReaction> InsertAsync(ChatReaction entity)
    {
        _context.ChatReactions.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<ChatReaction> UpdateAsync(ChatReaction entity)
    {
        _context.ChatReactions.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task DeleteAsync(long chatReactionId)
    {
        await _context.ChatReactions.Where(r => r.ChatReactionId == chatReactionId).ExecuteDeleteAsync();
    }
}
