using Roll6.DTO.Animation;
using Roll6.DTO.Common;
using Roll6.DTO.Image;

namespace Roll6.Domain.Interfaces;

/// <summary>The animation library (059): shared like tokens; only the owner renames, retypes or deletes.</summary>
public interface IAnimationService
{
    /// <summary>Every animation (the viewer's own first), or only the viewer's (<paramref name="mine"/>), of one type when given.</summary>
    Task<PagedList<AnimationInfo>> ListAsync(long viewerUserId, PageQuery query, bool mine, int? type);
    Task<AnimationInfo> GetByIdAsync(long animationId);
    /// <summary>The stored file of an animation. Throws <see cref="KeyNotFoundException"/> when there is none.</summary>
    Task<StoredImageInfo> OpenFileAsync(long animationId);
    Task<AnimationInfo> CreateAsync(long userId, AnimationInsertInfo info);
    Task<AnimationInfo> UpdateAsync(long userId, long animationId, AnimationUpdateInfo info);
    Task DeleteAsync(long userId, long animationId);
}
