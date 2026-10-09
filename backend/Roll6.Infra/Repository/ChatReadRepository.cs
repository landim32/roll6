using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class ChatReadRepository : IChatReadRepository<ChatRead>
{
    private readonly Roll6Context _context;

    public ChatReadRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<ChatRead?> GetAsync(long campaignId, long userId)
    {
        return await _context.ChatReads.AsNoTracking().FirstOrDefaultAsync(e => e.CampaignId == campaignId && e.UserId == userId);
    }

    public async Task<ChatRead> InsertAsync(ChatRead entity)
    {
        _context.ChatReads.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<ChatRead> UpdateAsync(ChatRead entity)
    {
        _context.ChatReads.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task DeleteByCampaignAsync(long campaignId)
    {
        await _context.ChatReads.Where(e => e.CampaignId == campaignId).ExecuteDeleteAsync();
    }
}
