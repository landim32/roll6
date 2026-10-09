using Microsoft.EntityFrameworkCore;
using Npgsql;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class ChatPollRepository : IChatPollRepository<ChatPollOption, ChatPollVote>
{
    /// <summary>Two taps at once from the same voter: the loser of the unique index tries again once.</summary>
    private const int MAX_VOTE_ATTEMPTS = 2;

    private readonly Roll6Context _context;

    public ChatPollRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task InsertOptionsAsync(IEnumerable<ChatPollOption> options)
    {
        _context.ChatPollOptions.AddRange(options);
        await _context.SaveChangesAsync();
    }

    public async Task<List<ChatPollOption>> ListOptionsByTurnsAsync(IEnumerable<long> turnIds)
    {
        var ids = turnIds.Distinct().ToList();
        return await _context.ChatPollOptions.AsNoTracking().Where(o => ids.Contains(o.TurnId))
            .OrderBy(o => o.TurnId).ThenBy(o => o.Position).ToListAsync();
    }

    public async Task<List<ChatPollVote>> ListVotesByTurnsAsync(IEnumerable<long> turnIds)
    {
        var ids = turnIds.Distinct().ToList();
        return await _context.ChatPollVotes.AsNoTracking().Where(v => ids.Contains(v.TurnId))
            .OrderBy(v => v.CreatedAt).ThenBy(v => v.ChatPollVoteId).ToListAsync();
    }

    public async Task<ChatPollOption?> GetOptionAsync(long optionId)
    {
        return await _context.ChatPollOptions.AsNoTracking().FirstOrDefaultAsync(o => o.ChatPollOptionId == optionId);
    }

    public async Task SetVoteAsync(long turnId, long? characterId, ChatPollVote? vote)
    {
        for (var attempt = 1; ; attempt++)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();
            await _context.ChatPollVotes.Where(v => v.TurnId == turnId && v.CharacterId == characterId).ExecuteDeleteAsync();
            if (vote == null)
            {
                await transaction.CommitAsync();
                return;
            }
            _context.ChatPollVotes.Add(vote);
            try
            {
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return;
            }
            catch (DbUpdateException ex) when (attempt < MAX_VOTE_ATTEMPTS
                                               && ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                await transaction.RollbackAsync();
                _context.Entry(vote).State = EntityState.Detached;
                vote.ChatPollVoteId = 0;
            }
        }
    }
}
