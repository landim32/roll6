using System.Threading.Channels;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Notifications;

namespace Roll6.Application.Notifications;

/// <summary>
/// In-memory queue of notices (043): writing never blocks the request; <see cref="NotificationWorker"/> drains it.
/// Notices still queued when the API stops are lost — push is a best-effort warning, the chat is the source of truth.
/// </summary>
public class NotificationQueue : INotificationQueue
{
    private readonly Channel<TableNotice> _channel = Channel.CreateUnbounded<TableNotice>(new UnboundedChannelOptions
    {
        SingleReader = true,
        SingleWriter = false
    });

    public ChannelReader<TableNotice> Reader => _channel.Reader;

    public void Enqueue(TableNotice notice) => _channel.Writer.TryWrite(notice);
}
