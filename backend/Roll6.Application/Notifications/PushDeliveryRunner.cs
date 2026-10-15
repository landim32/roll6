using Microsoft.Extensions.Logging;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Application.Notifications;

/// <summary>
/// One pass over the push outbox (074): drops what expired, sends what is due — in parallel, at most
/// <see cref="PushPolicy.PARALLEL"/> at once and never two to the same device — and then records the results one by one
/// (the database context is not thread safe; only the HTTP sends overlap). A slow or dead device only holds its own
/// pushes, never anybody else's.
/// </summary>
public class PushDeliveryRunner
{
    /// <summary>How many due rows one pass takes.</summary>
    public const int BATCH = 100;

    private readonly IPushDeliveryRepository<PushDelivery> _deliveries;
    private readonly IPushSubscriptionRepository<PushSubscription> _subscriptions;
    private readonly IPushSender _sender;
    private readonly TimeProvider _time;
    private readonly ILogger<PushDeliveryRunner> _logger;

    public PushDeliveryRunner(
        IPushDeliveryRepository<PushDelivery> deliveries,
        IPushSubscriptionRepository<PushSubscription> subscriptions,
        IPushSender sender,
        TimeProvider time,
        ILogger<PushDeliveryRunner> logger)
    {
        _deliveries = deliveries;
        _subscriptions = subscriptions;
        _sender = sender;
        _time = time;
        _logger = logger;
    }

    private DateTime Now => _time.GetUtcNow().UtcDateTime;

    /// <summary>Delivers what is due; returns how many rows it handled (0 = nothing due).</summary>
    public async Task<int> RunOnceAsync(CancellationToken cancellationToken = default)
    {
        var expired = await _deliveries.DeleteExpiredAsync(Now);
        if (expired > 0)
            _logger.LogInformation("Dropped {Count} expired pushes", expired);
        var due = await _deliveries.ListDueAsync(Now, BATCH);
        if (due.Count == 0)
            return 0;

        var devices = (await _subscriptions.ListByIdsAsync(due.Select(d => d.PushSubscriptionId).Distinct().ToList()))
            .ToDictionary(s => s.PushSubscriptionId);
        var orphans = due.Where(d => !devices.ContainsKey(d.PushSubscriptionId)).ToList();
        foreach (var orphan in orphans)
            await _deliveries.DeleteAsync(orphan.PushDeliveryId);

        var groups = due.Where(d => devices.ContainsKey(d.PushSubscriptionId))
            .GroupBy(d => d.PushSubscriptionId)
            .ToList();
        using var gate = new SemaphoreSlim(PushPolicy.PARALLEL);
        var outcomes = await Task.WhenAll(groups.Select(async group =>
        {
            await gate.WaitAsync(cancellationToken);
            try
            {
                return await SendGroupAsync(devices[group.Key], group.ToList());
            }
            finally
            {
                gate.Release();
            }
        }));
        foreach (var outcome in outcomes)
            await RecordAsync(outcome);
        return due.Count;
    }

    private sealed record Outcome(PushSubscription Device, List<PushDelivery> Sent, PushSendResult? Stop, List<PushDelivery> Unsent);

    /// <summary>One device's pushes in order; the first one that does not go stops the rest (they wait for the retry).</summary>
    private async Task<Outcome> SendGroupAsync(PushSubscription device, List<PushDelivery> deliveries)
    {
        var target = new PushTarget(device.Endpoint, device.P256dh, device.Auth);
        var sent = new List<PushDelivery>();
        for (var i = 0; i < deliveries.Count; i++)
        {
            var delivery = deliveries[i];
            var result = await _sender.SendAsync(target, delivery.Payload, delivery.Topic, delivery.TimeToLive(Now));
            if (result == PushSendResult.Sent)
            {
                sent.Add(delivery);
                continue;
            }
            return new Outcome(device, sent, result, deliveries.Skip(i).ToList());
        }
        return new Outcome(device, sent, null, new List<PushDelivery>());
    }

    private async Task RecordAsync(Outcome outcome)
    {
        var id = outcome.Device.PushSubscriptionId;
        foreach (var delivery in outcome.Sent)
            await _deliveries.DeleteAsync(delivery.PushDeliveryId);
        if (outcome.Sent.Count > 0)
            await _subscriptions.RecordSuccessAsync(id, Now);
        switch (outcome.Stop)
        {
            case null:
                return;
            case PushSendResult.Gone:
                // The browser dropped the subscription: the device and its pushes go.
                await _subscriptions.DeleteAsync(id);
                return;
            default:
                var failures = await _subscriptions.RecordFailureAsync(id);
                if (failures >= PushPolicy.MAX_FAILURES)
                {
                    _logger.LogInformation("Push device {Id} skipped after {Failures} failures in a row", id, failures);
                    await _deliveries.DeleteBySubscriptionAsync(id);
                    return;
                }
                foreach (var delivery in outcome.Unsent)
                {
                    if (delivery.Failed(Now))
                        await _deliveries.UpdateAsync(delivery);
                    else
                        await _deliveries.DeleteAsync(delivery.PushDeliveryId);
                }
                return;
        }
    }
}
