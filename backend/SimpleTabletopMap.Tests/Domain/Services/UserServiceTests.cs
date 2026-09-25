using FluentAssertions;
using Moq;
using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Interfaces;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.Domain.Services;
using SimpleTabletopMap.DTO.User;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Tests.Domain.Services;

public class UserServiceTests
{
    private readonly Mock<IUserRepository<User>> _repository = new();
    private readonly Mock<IPasswordHasherService> _hasher = new();
    private readonly Mock<ITokenService> _tokenService = new();
    private readonly UserService _service;

    public UserServiceTests()
    {
        _hasher.Setup(h => h.Hash(It.IsAny<string>())).Returns<string>(p => $"hash:{p}");
        _hasher.Setup(h => h.Verify(It.IsAny<string>(), It.IsAny<string>()))
            .Returns<string, string>((hash, password) => hash == $"hash:{password}");
        _repository.Setup(r => r.InsertAsync(It.IsAny<User>())).ReturnsAsync((User u) => u);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<User>())).ReturnsAsync((User u) => u);
        _service = new UserService(_repository.Object, _hasher.Object, _tokenService.Object);
    }

    private static User ExistingUser() => new()
    {
        UserId = 1, Name = "Ana", Email = "ana@test.com", PasswordHash = "hash:senha-atual"
    };

    [Fact]
    public async Task Register_NormalizesEmailAndHashesPassword()
    {
        var result = await _service.RegisterAsync(new UserInsertInfo { Name = "Ana", Email = " ANA@Test.com ", Password = "12345678" });

        result.Email.Should().Be("ana@test.com");
        _repository.Verify(r => r.InsertAsync(It.Is<User>(u => u.PasswordHash == "hash:12345678")));
    }

    [Fact]
    public async Task Register_WithDuplicatedEmail_Throws()
    {
        _repository.Setup(r => r.GetByEmailAsync("ana@test.com")).ReturnsAsync(ExistingUser());

        var act = () => _service.RegisterAsync(new UserInsertInfo { Name = "Ana", Email = "ana@test.com", Password = "12345678" });

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Register_WithShortPassword_Throws()
    {
        var act = () => _service.RegisterAsync(new UserInsertInfo { Name = "Ana", Email = "ana@test.com", Password = "1234567" });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("password");
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsNull()
    {
        _repository.Setup(r => r.GetByEmailAsync("ana@test.com")).ReturnsAsync(ExistingUser());

        var result = await _service.LoginAsync(new UserLoginInfo { Email = "ana@test.com", Password = "errada" });

        result.Should().BeNull();
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
    {
        _repository.Setup(r => r.GetByEmailAsync("ana@test.com")).ReturnsAsync(ExistingUser());
        _tokenService.Setup(t => t.Create(1, "Ana", "ana@test.com")).Returns(("jwt", DateTime.UtcNow.AddHours(1)));

        var result = await _service.LoginAsync(new UserLoginInfo { Email = "ANA@test.com", Password = "senha-atual" });

        result!.Token.Should().Be("jwt");
        result.User.UserId.Should().Be(1);
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_Throws()
    {
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(ExistingUser());

        var act = () => _service.ChangePasswordAsync(1, new UserPasswordInfo { CurrentPassword = "errada", NewPassword = "nova-senha" });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("currentPassword");
    }

    [Fact]
    public async Task ChangePassword_StoresNewHash()
    {
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(ExistingUser());

        await _service.ChangePasswordAsync(1, new UserPasswordInfo { CurrentPassword = "senha-atual", NewPassword = "nova-senha" });

        _repository.Verify(r => r.UpdateAsync(It.Is<User>(u => u.PasswordHash == "hash:nova-senha")));
    }

    [Fact]
    public async Task Rename_ChangesOnlyTheName()
    {
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(ExistingUser());

        var result = await _service.RenameAsync(1, new UserNameInfo { Name = "Ana Maria" });

        result.Name.Should().Be("Ana Maria");
        result.Email.Should().Be("ana@test.com");
        _repository.Verify(r => r.UpdateAsync(It.Is<User>(u => u.PasswordHash == "hash:senha-atual")));
    }
}
