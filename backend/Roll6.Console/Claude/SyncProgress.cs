namespace Roll6.Console.Claude;

/// <summary>
/// Reports on the calling thread, in order. <see cref="Progress{T}"/> posts each report to the thread pool, which would
/// let a text delta reach the server after the result line.
/// </summary>
public sealed class SyncProgress<T> : IProgress<T>
{
    private readonly Action<T> _handler;

    public SyncProgress(Action<T> handler) => _handler = handler;

    public void Report(T value) => _handler(value);
}
