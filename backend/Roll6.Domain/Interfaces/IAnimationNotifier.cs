using Roll6.DTO.Realtime.Animation;

namespace Roll6.Domain.Interfaces;

/// <summary>
/// Tells the animation editor hub that the content of an animation changed (086), whatever changed it: a pose edit or an
/// undo from the page (<c>PUT /api/animation/{id}/content</c>), a file the console reported, the REST API. Published after
/// the write succeeds; a failure to publish never fails the write.
/// </summary>
public interface IAnimationNotifier
{
    Task VersionAsync(AnimationVersionInfo version);
}

/// <summary>Does nothing: for tests and for hosts without the hub.</summary>
public sealed class NoAnimationNotifier : IAnimationNotifier
{
    public Task VersionAsync(AnimationVersionInfo version) => Task.CompletedTask;
}
