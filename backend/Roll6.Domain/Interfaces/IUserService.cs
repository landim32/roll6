using Roll6.DTO.User;

namespace Roll6.Domain.Interfaces;

public interface IUserService
{
    Task<UserInfo> RegisterAsync(UserInsertInfo info);
    Task<UserTokenInfo?> LoginAsync(UserLoginInfo info);
    Task<UserInfo> GetMeAsync(long userId);
    Task<UserInfo> RenameAsync(long userId, UserNameInfo info);
    Task ChangePasswordAsync(long userId, UserPasswordInfo info);
}
