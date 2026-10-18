using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;
using Roll6.Domain.Weapons;

namespace Roll6.Domain.Models;

/// <summary>
/// A library weapon (082): a 3D model (.glb, uploaded through <c>POST /api/model</c>) that tokens carry in their sockets
/// (083). Shared like tokens and animations; only the owner renames it, replaces its file, or sets its grip point and
/// standard pose (083: where the hand holds it and how it stands — tip +Y, edge +X — so every socket aligns it the same
/// way). Stored files are write-once: replacing the file points the weapon to a new name and nothing is ever deleted
/// from the bucket.
/// </summary>
public class Weapon
{
    public const int MAX_NAME = 100;

    public long WeaponId { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ModelFile { get; set; } = string.Empty;
    /// <summary>The grip point (083), normalised in the file's bounding box; 0.5 = the middle.</summary>
    public double GripX { get; set; } = WeaponGripPoint.CENTER;
    public double GripY { get; set; } = WeaponGripPoint.CENTER;
    public double GripZ { get; set; } = WeaponGripPoint.CENTER;
    /// <summary>The standard pose (083): Euler XYZ in whole degrees, 0…359.</summary>
    public int PoseRx { get; set; }
    public int PoseRy { get; set; }
    public int PoseRz { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public WeaponGripPoint GripPoint => new(GripX, GripY, GripZ);
    public WeaponPose Pose => new(PoseRx, PoseRy, PoseRz);

    public static Weapon Create(long userId, string? name, string? modelFile, WeaponGripPoint? gripPoint = null, WeaponPose? pose = null)
    {
        var weapon = new Weapon { UserId = userId };
        weapon.Rename(name);
        weapon.ReplaceFile(modelFile);
        weapon.SetGripPoint(gripPoint ?? WeaponGripPoint.Default);
        weapon.SetPose(pose ?? WeaponPose.Default);
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

    /// <summary>Where the hand holds the weapon (083); error keys <c>gripPoint.{x|y|z}</c>.</summary>
    public void SetGripPoint(WeaponGripPoint point)
    {
        point.Validate("gripPoint");
        GripX = point.X;
        GripY = point.Y;
        GripZ = point.Z;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>The standard pose (083), stored normalised; error keys <c>pose.{rx|ry|rz}</c>.</summary>
    public void SetPose(WeaponPose pose)
    {
        var normalized = pose.Validate("pose").Normalized();
        PoseRx = normalized.Rx;
        PoseRy = normalized.Ry;
        PoseRz = normalized.Rz;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsOwnedBy(long userId) => UserId == userId;
}
