using SimpleTabletopMap.Infra.Context;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Infra.Repository;

public class UnitOfWork : IUnitOfWork
{
    private readonly SimpleTabletopMapContext _context;

    public UnitOfWork(SimpleTabletopMapContext context)
    {
        _context = context;
    }

    public async Task ExecuteInTransactionAsync(Func<Task> action)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        await action();
        await transaction.CommitAsync();
    }
}
