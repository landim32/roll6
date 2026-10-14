using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>
/// A library animation (059): a <c>roll6-animation</c> JSON file uploaded by a user, stored in the bucket as
/// <c>{guid}.json</c> and shared like tokens. Its duration and loop are read from the file; the file never changes.
/// Tokens use it through the choice <c>animation:{id}</c> of an animation state.
/// </summary>
public class Animation
{
    public const int MAX_NAME = 100;

    public long AnimationId { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public AnimationType AnimationType { get; set; }
    public string FileName { get; set; } = string.Empty;
    public double Duration { get; set; }
    public bool Loop { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>A new animation without its file yet: name and type are validated before anything is stored.</summary>
    public static Animation Create(long userId, string? name, int type, double duration, bool loop)
    {
        var animation = new Animation { UserId = userId, Duration = duration, Loop = loop };
        animation.Rename(name);
        animation.ChangeType(type);
        animation.CreatedAt = animation.UpdatedAt;
        return animation;
    }

    /// <summary>The stored file, set once after the upload.</summary>
    public void AttachFile(string fileName)
    {
        FileName = Guard.AnimationFileName(fileName, "fileName");
    }

    public void Rename(string? name)
    {
        Name = Guard.RequiredText(name, "name", MAX_NAME);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>The type, 1–7. Whether a token in use allows the change is the service's rule.</summary>
    public void ChangeType(int type)
    {
        if (!Enum.IsDefined(typeof(AnimationType), type))
            throw new DomainValidationException("type", "Tipo de animação inválido. Use de 1 a 7.");
        AnimationType = (AnimationType)type;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsOwnedBy(long userId) => UserId == userId;
}
