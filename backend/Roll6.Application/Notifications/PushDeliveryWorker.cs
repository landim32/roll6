using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Roll6.Application.Notifications;

/// <summary>
/// Drains the push outbox (074): on start-up (pushes left by a restart), whenever the dispatcher signals new rows, and
/// every <see cref="IDLE"/> for the retries. Each pass runs in a DI scope of its own; a failing pass never stops it.
/// </summary>
public class PushDeliveryWorker : BackgroundService
{
    /// <summary>Longest wait between passes when nothing signals.</summary>
    public static readonly TimeSpan IDLE = TimeSpan.FromSeconds(15);

    private readonly PushDeliverySignal _signal;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<PushDeliveryWorker> _logger;

    public PushDeliveryWorker(PushDeliverySignal signal, IServiceScopeFactory scopes, ILogger<PushDeliveryWorker> logger)
    {
        _signal = signal;
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var handled = 0;
            try
            {
                using var scope = _scopes.CreateScope();
                handled = await scope.ServiceProvider.GetRequiredService<PushDeliveryRunner>().RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "A push delivery pass failed");
            }
            try
            {
                if (handled == 0)
                    await _signal.WaitAsync(IDLE, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }
}
