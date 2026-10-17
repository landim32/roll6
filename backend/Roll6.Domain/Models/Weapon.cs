using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>
/// A library weapon (082): a 3D model (.glb, uploaded through <c>POST /api/model</c>) that tokens hold in a hand. Shared
/// like tokens and animations; only the owner renames it, replaces its file or deletes it. Stored files are write-once:
/// replacing the file points the weapon to a new name and nothing is ever deleted from the bucket.
/// </summary>
public class Weapon
{
    public const int MAX_NAME = 100;

    public long WeaponId { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ModelFile { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public static Weapon Create(long userId, string? name, string? modelFile)
    {
        var weapon = new Weapon { UserId = userId };
        weapon.Rename(name);
        weapon.ReplaceFile(modelFile);
        weapon.CreatedAt = weapon.UpdatedAt;
        return weapon;
    }

    public void Rename(string? name)
    {
        Name = Guard.RequiredText(name, "name", MAX_NAME);
        UpdatedAt = DateTime.UtcNow;
    }

    public void ReplaceFile(string? modelFile)
    {
        ModelFile = Guard.ModelFileName(modelFile, "modelFile")
            ?? throw new DomainValidationException("modelFile", "Envie o modelo 3D da arma.");
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsOwnedBy(long userId) => UserId == userId;
}
