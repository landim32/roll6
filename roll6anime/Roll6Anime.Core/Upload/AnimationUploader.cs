using System.Text.Json;

namespace Roll6Anime.Core.Upload;

/// <summary>
/// What "Enviar ao Roll6" will do with an animation (067): update <see cref="Existing"/> (one of the user's own) or
/// create a new one. <see cref="Name"/> and <see cref="Type"/> are the suggestions shown before sending.
/// </summary>
public sealed record UploadPlan(RemoteAnimation? Existing, string Name, int? Type)
{
    public bool Creates => Existing == null;
}

/// <summary>
/// Sends an animation file of the folder to the Roll6's library: creates it when it does not exist, updates it (name,
/// type and file, same id — the tokens that use it play the new version) when it does. "Exists" means: the animation
/// this file was last sent to, if it is still there and still the user's; else the user's own animation with the same
/// name (ignoring case). Only the user's own animations are ever changed.
/// </summary>
public sealed class AnimationUploader(IRoll6Api api)
{
    public const int MAX_NAME = 100;

    /// <summary>Finds the animation to update (or none) and suggests the name and type.</summary>
    public async Task<UploadPlan> PlanAsync(string name, int? fileType, long? linkedId, CancellationToken cancel = default)
    {
        var clean = Clean(name);
        var me = await api.GetMyUserIdAsync(cancel);
        RemoteAnimation? existing = null;
        if (linkedId is { } id && await api.GetAnimationAsync(id, cancel) is { } linked && linked.UserId == me)
            existing = linked;
        existing ??= (await api.SearchMineAsync(clean, cancel))
            .FirstOrDefault(item => item.UserId == me && string.Equals(item.Name.Trim(), clean, StringComparison.OrdinalIgnoreCase));
        return new UploadPlan(existing, existing?.Name ?? clean, fileType ?? existing?.Type);
    }

    /// <summary>Creates or updates, as planned, with the name and type confirmed by the user.</summary>
    public Task<RemoteAnimation> SendAsync(UploadPlan plan, string name, int type, JsonElement content, CancellationToken cancel = default) =>
        plan.Existing is { } existing
            ? api.UpdateAsync(existing.AnimationId, Clean(name), type, content, cancel)
            : api.CreateAsync(Clean(name), type, content, cancel);

    public static string Clean(string name)
    {
        var trimmed = name.Trim();
        return trimmed.Length > MAX_NAME ? trimmed[..MAX_NAME] : trimmed;
    }
}
