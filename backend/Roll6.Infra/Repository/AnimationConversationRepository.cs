using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class AnimationConversationRepository : IAnimationConversationRepository<AnimationConversation>
{
    private readonly Roll6Context _context;

    public AnimationConversationRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<AnimationConversation?> GetByIdAsync(long id)
    {
        return await _context.AnimationConversations.AsNoTracking().FirstOrDefaultAsync(e => e.AnimationConversationId == id);
    }

    public async Task<AnimationConversation?> GetOpenAsync(long animationId)
    {
        return await _context.AnimationConversations.AsNoTracking()
            .FirstOrDefaultAsync(e => e.AnimationId == animationId && e.ClosedAt == null);
    }

    public async Task<AnimationConversation> InsertAsync(AnimationConversation entity)
    {
        _context.AnimationConversations.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<AnimationConversation> UpdateAsync(AnimationConversation entity)
    {
        var existing = await _context.AnimationConversations.FindAsync(entity.AnimationConversationId)
            ?? throw new KeyNotFoundException("Conversa não encontrada.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteByAnimationAsync(long animationId)
    {
        var ids = await _context.AnimationConversations
            .Where(e => e.AnimationId == animationId)
            .Select(e => e.AnimationConversationId)
            .ToListAsync();
        if (ids.Count == 0)
            return;
        await _context.AnimationMessages.Where(e => ids.Contains(e.AnimationConversationId)).ExecuteDeleteAsync();
        await _context.AnimationConversations.Where(e => ids.Contains(e.AnimationConversationId)).ExecuteDeleteAsync();
    }
}

public class AnimationMessageRepository : IAnimationMessageRepository<AnimationMessage>
{
    private readonly Roll6Context _context;

    public AnimationMessageRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<List<AnimationMessage>> ListByConversationAsync(long conversationId, int take = 500)
    {
        var newest = await _context.AnimationMessages.AsNoTracking()
            .Where(e => e.AnimationConversationId == conversationId)
            .OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.AnimationMessageId)
            .Take(take)
            .ToListAsync();
        newest.Reverse();
        return newest;
    }

    public async Task<AnimationMessage> InsertAsync(AnimationMessage entity)
    {
        _context.AnimationMessages.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }
}
