using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class UnitOfWork : IUnitOfWork
{
    private readonly Roll6Context _context;

    public UnitOfWork(Roll6Context context)
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
