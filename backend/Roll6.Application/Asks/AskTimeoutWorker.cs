using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Roll6.Domain.Interfaces;

namespace Roll6.Application.Asks;

/// <summary>
/// Fails the chat questions still waiting after two minutes (093, Q2 = B) and stops their runs. Runs once on start — a
/// restart leaves no question "Pensando…" forever — and then every ten seconds. The state lives in the database.
/// </summary>
public sealed class AskTimeoutWorker : BackgroundService
{
    public static readonly TimeSpan INTERVAL = TimeSpan.FromSeconds(10);

    private readonly IServiceScopeFactory _scopes;
    private readonly IAskDispatcher _dispatcher;
    private readonly TimeProvider _time;
    private readonly ILogger<AskTimeoutWorker> _logger;

    public AskTimeoutWorker(IServiceScopeFactory scopes, IAskDispatcher dispatcher, TimeProvider time, ILogger<AskTimeoutWorker> logger)
    {
        _scopes = scopes;
        _dispatcher = dispatcher;
        _time = time;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await RunOnceAsync();
            try
            {
                await Task.Delay(INTERVAL, _time, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }
    }

    public async Task RunOnceAsync()
    {
        try
        {
            using var scope = _scopes.CreateScope();
            var asks = scope.ServiceProvider.GetRequiredService<IAskService>();
            foreach (var turnId in await asks.FailExpiredAsync(_time.GetUtcNow().UtcDateTime))
                await _dispatcher.StopAsync(turnId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ask timeout sweep failed");
        }
    }
}
