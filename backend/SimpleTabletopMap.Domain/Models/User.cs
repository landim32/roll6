using SimpleTabletopMap.Domain.Validation;

namespace SimpleTabletopMap.Domain.Models;

public class User
{
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public void Rename(string? name)
    {
        Name = Guard.RequiredText(name, "name", 260);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetEmail(string? email)
    {
        Email = Guard.Email(email, "email");
    }
}
