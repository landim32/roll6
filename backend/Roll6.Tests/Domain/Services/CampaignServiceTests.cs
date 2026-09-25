using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Campaign;
using Roll6.DTO.Common;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class CampaignServiceTests
{
    private readonly Mock<ICampaignRepository<Campaign>> _repository = new();
    private readonly Mock<IMapRepository<Map>> _mapRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly CampaignService _service;

    public CampaignServiceTests()
    {
        _repository.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(new Campaign { CampaignId = 10, UserId = 1, Name = "Campanha" });
        _repository.Setup(r => r.InsertAsync(It.IsAny<Campaign>())).ReturnsAsync((Campaign c) => c);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Campaign>())).ReturnsAsync((Campaign c) => c);
        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<User>
        {
            new() { UserId = 1, Name = "Mestre Ana" },
            new() { UserId = 2, Name = "Bruno" }
        });
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns<Func<Task>>(action => action());
        _service = new CampaignService(_repository.Object, _mapRepository.Object, _mapTokenRepository.Object,
            _campaignCharacterRepository.Object, _userRepository.Object, _unitOfWork.Object);
    }

    [Fact]
    public async Task Delete_WithActiveMaps_Throws()
    {
        _mapRepository.Setup(r => r.CountNotDeletedByCampaignAsync(10)).ReturnsAsync(1);

        var act = () => _service.DeleteAsync(1, 10);

        await act.Should().ThrowAsync<ConflictException>();
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Delete_RemovesDeletedMapsTokensAndParticipationsFirst()
    {
        var deletedMapIds = new List<long> { 30, 31 };
        _mapRepository.Setup(r => r.CountNotDeletedByCampaignAsync(10)).ReturnsAsync(0);
        _mapRepository.Setup(r => r.ListDeletedIdsByCampaignAsync(10)).ReturnsAsync(deletedMapIds);

        await _service.DeleteAsync(1, 10);

        _mapTokenRepository.Verify(r => r.DeleteByMapIdsAsync(deletedMapIds));
        _mapRepository.Verify(r => r.DeleteRangeAsync(deletedMapIds));
        _campaignCharacterRepository.Verify(r => r.DeleteByCampaignAsync(10));
        _repository.Verify(r => r.DeleteAsync(10));
    }

    [Fact]
    public async Task GetById_ByAnotherUser_ReturnsCampaignWithOwnerName()
    {
        var result = await _service.GetByIdAsync(10);

        result.Name.Should().Be("Campanha");
        result.OwnerName.Should().Be("Mestre Ana");
    }

    [Fact]
    public async Task List_ReturnsCampaignsOfAllUsersWithOwnerNames()
    {
        _repository.Setup(r => r.ListPagedAsync(null, 0, 20, null)).ReturnsAsync((new List<Campaign>
        {
            new() { CampaignId = 10, UserId = 1, Name = "Campanha", Open = true },
            new() { CampaignId = 11, UserId = 2, Name = "Outra" }
        }, 2));

        var result = await _service.ListAsync(new PageQuery());

        result.TotalCount.Should().Be(2);
        result.Items.Select(i => (i.Name, i.OwnerName, i.Open)).Should().Equal(("Campanha", "Mestre Ana", true), ("Outra", "Bruno", false));
    }

    [Fact]
    public async Task Create_WithoutOpen_IsClosed()
    {
        var result = await _service.CreateAsync(1, new CampaignInsertInfo { Name = "Nova" });

        result.Open.Should().BeFalse();
        result.OwnerName.Should().Be("Mestre Ana");
    }

    [Fact]
    public async Task SetOpen_ByMaster_OpensCampaign()
    {
        var result = await _service.SetOpenAsync(1, 10, new CampaignOpenInfo { Open = true });

        result.Open.Should().BeTrue();
    }

    [Fact]
    public async Task SetOpen_ByAnotherUser_Throws()
    {
        var act = () => _service.SetOpenAsync(2, 10, new CampaignOpenInfo { Open = true });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Rename_ByAnotherUser_Throws()
    {
        var act = () => _service.RenameAsync(2, 10, new CampaignInsertInfo { Name = "Roubada" });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task List_Mine_PassesOwnerToRepository()
    {
        _repository.Setup(r => r.ListPagedAsync(null, 0, 20, 1)).ReturnsAsync((new List<Campaign>
        {
            new() { CampaignId = 10, UserId = 1, Name = "Campanha" }
        }, 1));

        var result = await _service.ListAsync(new PageQuery(), ownerUserId: 1);

        result.Items.Should().ContainSingle(c => c.CampaignId == 10);
        _repository.Verify(r => r.ListPagedAsync(null, 0, 20, 1));
    }
}
