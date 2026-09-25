namespace SimpleTabletopMap.Infra.Interfaces.Repository;

public interface IUnitOfWork
{
    /// <summary>Runs the action inside a single database transaction shared by all repositories of the request.</summary>
    Task ExecuteInTransactionAsync(Func<Task> action);
}
