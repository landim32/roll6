using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Roll6.Application.Notifications;

/// <summary>Delivers the queued notices (043), each in a DI scope of its own; one failing notice never stops the rest.</summary>
public class NotificationWorker : BackgroundService
{
    private readonly NotificationQueue _queue;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<NotificationWorker> _logger;

    public NotificationWorker(NotificationQueue queue, IServiceScopeFactory scopes, ILogger<NotificationWorker> logger)
    {
        _queue = queue;
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var notice in _queue.Reader.ReadAllAsync(stoppingToken))
            {
                try
                {
                    using var scope = _scopes.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<NoticeDispatcher>().DispatchAsync(notice);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not deliver a {Kind} notice of campaign {CampaignId}", notice.Kind, notice.CampaignId);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Shutting down.
        }
    }
}
