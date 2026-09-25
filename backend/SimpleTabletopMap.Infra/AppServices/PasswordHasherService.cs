using Microsoft.AspNetCore.Identity;
using SimpleTabletopMap.Domain.Interfaces;
using SimpleTabletopMap.Domain.Models;

namespace SimpleTabletopMap.Infra.AppServices;

public class PasswordHasherService : IPasswordHasherService
{
    private readonly PasswordHasher<User> _hasher = new();
    private static readonly User HASH_OWNER = new();

    public string Hash(string password) => _hasher.HashPassword(HASH_OWNER, password);

    public bool Verify(string passwordHash, string password)
    {
        var result = _hasher.VerifyHashedPassword(HASH_OWNER, passwordHash, password);
        return result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }
}
