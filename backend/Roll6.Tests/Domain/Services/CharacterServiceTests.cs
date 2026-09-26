using FluentAssertions;
using Moq;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Character;
using Roll6.DTO.Common;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class CharacterServiceTests
{
    private const long CHARACTER = 7;
    private const long OWNER = 3;
    private const long MASTER = 1;
    private const long OUTSIDER = 9;

    private readonly Mock<ICharacterRepository<Character>> _repository = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly Mock<IImageStorageAppService> _imageStorage = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly CharacterService _service;

    public CharacterServiceTests()
    {
        _imageStorage.Setup(s => s.GetUrl(It.IsAny<string?>()))
            .Returns((string? file) => file == null ? null : $"https://cdn/{file}");
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Character>())).ReturnsAsync((Character c) => c);
        _repository.Setup(r => r.GetByIdAsync(CHARACTER)).ReturnsAsync(() => new Character { CharacterId = CHARACTER, UserId = OWNER, Name = "Aria", Life = 12, Energy = 6 });
        _service = new CharacterService(_repository.Object, _campaignCharacterRepository.Object,
            _unitOfWork.Object, _userRepository.Object, _imageStorage.Object);
    }

    [Fact]
    public async Task Search_ReturnsPublicFieldsWithOwnerNames()
    {
        _repository.Setup(r => r.ListPagedAsync("ar", 20, 10)).ReturnsAsync((new List<Character>
        {
            new() { CharacterId = 1, UserId = 5, Name = "Aria", Image = "0123456789abcdef0123456789abcdef.png" },
            new() { CharacterId = 2, UserId = 6, Name = "Arthur" },
            new() { CharacterId = 3, UserId = 5, Name = "Barao" }
        }, 23));
        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<User>
        {
            new() { UserId = 5, Name = "Rodrigo" },
            new() { UserId = 6, Name = "Ana" }
        });

        var result = await _service.SearchAsync(new PageQuery { Page = 3, PageSize = 10, Search = "ar" });

        result.TotalCount.Should().Be(23);
        result.Page.Should().Be(3);
        result.Items.Should().HaveCount(3);
        result.Items[0].OwnerName.Should().Be("Rodrigo");
        result.Items[0].ImageUrl.Should().Be("https://cdn/0123456789abcdef0123456789abcdef.png");
        result.Items[1].OwnerName.Should().Be("Ana");
        result.Items[1].ImageUrl.Should().BeNull();
        _userRepository.Verify(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()), Times.Once);
    }

    [Fact]
    public async Task Search_Empty_DoesNotLoadOwners()
    {
        _repository.Setup(r => r.ListPagedAsync(null, 0, 20)).ReturnsAsync((new List<Character>(), 0));

        var result = await _service.SearchAsync(new PageQuery());

        result.Items.Should().BeEmpty();
        _userRepository.Verify(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()), Times.Never);
    }

    private static CharacterInsertInfo Changes(int life = 10, int energy = 4) =>
        new() { Name = "Aria", Life = life, Energy = energy, Move = 6 };

    [Fact]
    public async Task GetAndUpdate_Owner_Allowed()
    {
        (await _service.GetByIdAsync(OWNER, CHARACTER)).Name.Should().Be("Aria");

        var updated = await _service.UpdateAsync(OWNER, CHARACTER, Changes());

        updated.Life.Should().Be(10);
    }

    /// <summary>The master changes only the participation, never the character itself (010 FR-006).</summary>
    [Theory]
    [InlineData(MASTER)]
    [InlineData(OUTSIDER)]
    public async Task GetAndUpdate_NotOwner_Throws(long userId)
    {
        await _service.Invoking(s => s.GetByIdAsync(userId, CHARACTER)).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.UpdateAsync(userId, CHARACTER, Changes())).Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Character>()), Times.Never);
    }

    [Fact]
    public async Task Delete_Master_Throws()
    {
        await _service.Invoking(s => s.DeleteAsync(MASTER, CHARACTER)).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Update_ClampsCurrentValuesToTheNewTotals()
    {
        await _service.UpdateAsync(OWNER, CHARACTER, Changes(life: 8, energy: 2));

        _campaignCharacterRepository.Verify(r => r.ClampVitalsAsync(CHARACTER, 8, 2), Times.Once);
    }
}
