namespace Roll6.Domain.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) Create(long userId, string name, string email);
}
