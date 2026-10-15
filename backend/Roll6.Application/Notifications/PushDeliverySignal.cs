using System.Threading.Channels;

namespace Roll6.Application.Notifications;

/// <summary>
/// Wakes the push delivery worker (074) when the dispatcher wrote new deliveries; pulses while it is busy collapse into
/// one, and the worker also wakes on its own every <see cref="PushDeliveryWorker.IDLE"/> for retries.
/// </summary>
public class PushDeliverySignal
{
    private readonly Channel<bool> _channel = Channel.CreateBounded<bool>(new BoundedChannelOptions(1)
    {
        FullMode = BoundedChannelFullMode.DropWrite,
        SingleReader = true
    });

    public void Pulse() => _channel.Writer.TryWrite(true);

    /// <summary>Waits for a pulse or the timeout, whichever comes first.</summary>
    public async Task WaitAsync(TimeSpan timeout, CancellationToken cancellationToken)
    {
        using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutSource.CancelAfter(timeout);
        try
        {
            await _channel.Reader.WaitToReadAsync(timeoutSource.Token);
            _channel.Reader.TryRead(out _);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            // Timed out: time to look for due retries.
        }
    }
}
