using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.User;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

public class UserService : IUserService
{
    public const int MIN_PASSWORD_LENGTH = 8;

    private readonly IUserRepository<User> _repository;
    private readonly IPasswordHasherService _passwordHasher;
    private readonly ITokenService _tokenService;

    public UserService(IUserRepository<User> repository, IPasswordHasherService passwordHasher, ITokenService tokenService)
    {
        _repository = repository;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<UserInfo> RegisterAsync(UserInsertInfo info)
    {
        var user = new User();
        user.Rename(info.Name);
        user.SetEmail(info.Email);
        ValidatePassword(info.Password, "password");

        if (await _repository.GetByEmailAsync(user.Email) != null)
            throw new ConflictException("Este e-mail já está em uso.");

        user.PasswordHash = _passwordHasher.Hash(info.Password);
        user.CreatedAt = DateTime.UtcNow;
        user.UpdatedAt = user.CreatedAt;

        return MapToDto(await _repository.InsertAsync(user));
    }

    public async Task<UserTokenInfo?> LoginAsync(UserLoginInfo info)
    {
        if (string.IsNullOrWhiteSpace(info.Email) || string.IsNullOrEmpty(info.Password))
            return null;

        var user = await _repository.GetByEmailAsync(info.Email.Trim().ToLowerInvariant());
        if (user == null || !_passwordHasher.Verify(user.PasswordHash, info.Password))
            return null;

        var (token, expiresAt) = _tokenService.Create(user.UserId, user.Name, user.Email);
        return new UserTokenInfo { Token = token, ExpiresAt = expiresAt, User = MapToDto(user) };
    }

    public async Task<UserInfo> GetMeAsync(long userId)
    {
        return MapToDto(await GetUserAsync(userId));
    }

    public async Task<UserInfo> RenameAsync(long userId, UserNameInfo info)
    {
        var user = await GetUserAsync(userId);
        user.Rename(info.Name);
        return MapToDto(await _repository.UpdateAsync(user));
    }

    public async Task ChangePasswordAsync(long userId, UserPasswordInfo info)
    {
        var user = await GetUserAsync(userId);
        if (string.IsNullOrEmpty(info.CurrentPassword) || !_passwordHasher.Verify(user.PasswordHash, info.CurrentPassword))
            throw new DomainValidationException("currentPassword", "A senha atual está incorreta.");
        ValidatePassword(info.NewPassword, "newPassword");

        user.PasswordHash = _passwordHasher.Hash(info.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _repository.UpdateAsync(user);
    }

    private async Task<User> GetUserAsync(long userId)
    {
        return await _repository.GetByIdAsync(userId)
            ?? throw new KeyNotFoundException("Usuário não encontrado.");
    }

    private static void ValidatePassword(string? password, string field)
    {
        if (string.IsNullOrEmpty(password) || password.Length < MIN_PASSWORD_LENGTH)
            throw new DomainValidationException(field, $"A senha deve ter no mínimo {MIN_PASSWORD_LENGTH} caracteres.");
    }

    private static UserInfo MapToDto(User user) => new()
    {
        UserId = user.UserId,
        Name = user.Name,
        Email = user.Email
    };
}
