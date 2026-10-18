using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Roll6.Domain.Animations;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Realtime.Animation;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Application.Realtime;

/// <summary>
/// Tells the animation editor hub about a new version of an animation (086): every editor of the animation gets
/// <c>animationVersion</c>; when the version did not come from the console (a pose edit, an undo, the REST API) the
/// consoles of the user get <c>writeFiles</c> so their working file follows. Failures are logged and swallowed.
/// </summary>
public class AnimationNotifier : IAnimationNotifier
{
    private readonly IHubContext<AnimationHub> _hub;
    private readonly AnimationConnections _connections;
    private readonly ILogger<AnimationNotifier> _logger;

    public AnimationNotifier(IHubContext<AnimationHub> hub, AnimationConnections connections, ILogger<AnimationNotifier> logger)
    {
        _hub = hub;
        _connections = connections;
        _logger = logger;
    }

    public async Task VersionAsync(AnimationVersionInfo version)
    {
        try
        {
            await _hub.Clients.Group(AnimationConnections.GroupName(version.AnimationId))
                .SendAsync(AnimationHub.ANIMATION_VERSION_METHOD, version);
            if (version.Origin == AnimationVersionInfo.ORIGIN_AGENT)
                return;
            var agents = _connections.AgentsOf(version.UserId);
            if (agents.Count == 0)
                return;
            var files = new List<FileWriteInfo>
            {
                new()
                {
                    Path = AnimationRequestBuilder.WorkingPath(version.AnimationId, version.Name),
                    Content = AnimationRequestBuilder.Serialize(version.Content)
                }
            };
            await _hub.Clients.Clients(agents).SendAsync(AnimationHub.WRITE_FILES_METHOD, files);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao publicar a versão da animação {AnimationId}.", version.AnimationId);
        }
    }
}
