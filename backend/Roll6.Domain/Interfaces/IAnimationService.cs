using Roll6.DTO.Animation;
using Roll6.DTO.Common;
using System.Text.Json;
using Roll6.DTO.Image;
using Roll6.DTO.Realtime.Animation;

namespace Roll6.Domain.Interfaces;

/// <summary>The animation library (059): shared like tokens; only the owner renames, retypes or deletes.</summary>
public interface IAnimationService
{
    /// <summary>Every animation (the viewer's own first), or only the viewer's (<paramref name="mine"/>), of one type when given.</summary>
    Task<PagedList<AnimationInfo>> ListAsync(long viewerUserId, PageQuery query, bool mine, int? type);
    Task<AnimationInfo> GetByIdAsync(long animationId);
    /// <summary>The stored file of an animation. Throws <see cref="KeyNotFoundException"/> when there is none.</summary>
    Task<StoredImageInfo> OpenFileAsync(long animationId);
    /// <summary>The stored <c>roll6-animation</c> content, parsed (086: what the editor opens).</summary>
    Task<JsonElement> ReadContentAsync(long animationId);
    Task<AnimationInfo> CreateAsync(long userId, AnimationInsertInfo info);
    Task<AnimationInfo> UpdateAsync(long userId, long animationId, AnimationUpdateInfo info);
    /// <summary>
    /// Replaces the file (owner only): the new content is validated, stored as a new file and the old one removed.
    /// <paramref name="origin"/> tells the editors who changed it (086): "user" (page or API), "agent" (the console).
    /// </summary>
    Task<AnimationInfo> ReplaceContentAsync(long userId, long animationId, AnimationContentInfo info, string origin = AnimationVersionInfo.ORIGIN_USER);
    Task DeleteAsync(long userId, long animationId);
}
