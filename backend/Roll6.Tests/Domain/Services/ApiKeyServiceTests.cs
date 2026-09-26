using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.ApiKey;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class ApiKeyServiceTests
{
    private const long OWNER = 1;
    private const long OTHER = 2;
    private static readonly DateTime NOW = new(2026, 9, 26, 12, 0, 0, DateTimeKind.Utc);

    private readonly Mock<IApiKeyRepository<ApiKey>> _repository = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly FakeClock _clock = new(NOW);
    private readonly ApiKeyService _service;
    private readonly List<ApiKey> _saved = new();

    private sealed class FakeClock : TimeProvider
    {
        public DateTime Now;
        public FakeClock(DateTime now) => Now = now;
        public override DateTimeOffset GetUtcNow() => new(Now, TimeSpan.Zero);
    }

    public ApiKeyServiceTests()
    {
        _repository.Setup(r => r.InsertAsync(It.IsAny<ApiKey>())).ReturnsAsync((ApiKey k) =>
        {
            k.ApiKeyId = 100 + _saved.Count;
            _saved.Add(k);
            return k;
        });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<ApiKey>())).ReturnsAsync((ApiKey k) => k);
        _repository.Setup(r => r.GetByHashAsync(It.IsAny<string>())).ReturnsAsync((string hash) => _saved.FirstOrDefault(k => k.KeyHash == hash));
        _repository.Setup(r => r.GetByIdAsync(It.IsAny<long>())).ReturnsAsync((long id) => _saved.FirstOrDefault(k => k.ApiKeyId == id));
        _userRepository.Setup(r => r.GetByIdAsync(OWNER)).ReturnsAsync(new User { UserId = OWNER, Name = "Ana" });
        _service = new ApiKeyService(_repository.Object, _userRepository.Object, _clock);
    }

    private Task<ApiKeyCreatedInfo> Create(DateTime? expiresAt = null, long userId = OWNER) =>
        _service.CreateAsync(userId, new ApiKeyInsertInfo { Name = "Bot", ExpiresAt = expiresAt });

    // --- US1: create ---

    [Fact]
    public async Task Create_ReturnsTheFullKeyAndStoresOnlyItsHash()
    {
        var created = await Create(NOW.AddDays(30));

        created.Key.Should().StartWith("r6_");
        (created.Status, created.KeyPrefix).Should().Be(("active", created.Key[..11]));
        var stored = _saved.Single();
        stored.KeyHash.Should().Be(ApiKey.Hash(created.Key));
        stored.KeyHash.Should().NotContain(created.Key);
    }

    [Fact]
    public async Task Create_BeyondTheActiveLimit_Throws()
    {
        _repository.Setup(r => r.CountActiveByUserAsync(OWNER, NOW)).ReturnsAsync(ApiKey.MAX_ACTIVE_PER_USER);

        await FluentActions.Invoking(() => Create()).Should().ThrowAsync<ConflictException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<ApiKey>()), Times.Never);
    }

    [Fact]
    public async Task Create_WithPastExpiration_Throws()
    {
        (await FluentActions.Invoking(() => Create(NOW.AddMinutes(-1))).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey("expiresAt");
    }

    // --- US2: authenticate ---

    [Fact]
    public async Task Authenticate_ValidKey_ReturnsTheOwnerAndRecordsTheUse()
    {
        var created = await Create();

        var identity = await _service.AuthenticateAsync(created.Key);

        identity.Should().Be(new Roll6.Domain.Interfaces.ApiKeyIdentity(OWNER, created.ApiKeyId, "Ana"));
        _repository.Verify(r => r.TouchLastUsedAsync(created.ApiKeyId, NOW), Times.Once);
    }

    [Fact]
    public async Task Authenticate_RecordsTheUseAtMostOncePerMinute()
    {
        var created = await Create();
        _saved.Single().LastUsedAt = NOW.AddSeconds(-30);

        await _service.AuthenticateAsync(created.Key);
        _repository.Verify(r => r.TouchLastUsedAsync(It.IsAny<long>(), It.IsAny<DateTime>()), Times.Never);

        _clock.Now = NOW.AddSeconds(31);
        await _service.AuthenticateAsync(created.Key);
        _repository.Verify(r => r.TouchLastUsedAsync(created.ApiKeyId, NOW.AddSeconds(31)), Times.Once);
    }

    [Fact]
    public async Task Authenticate_ExpiredRevokedUnknownOrMalformed_ReturnsNull()
    {
        var expiring = await Create(NOW.AddHours(1));
        var revoked = await Create();
        await _service.RevokeAsync(OWNER, revoked.ApiKeyId);
        _clock.Now = NOW.AddHours(1);

        (await _service.AuthenticateAsync(expiring.Key)).Should().BeNull();
        (await _service.AuthenticateAsync(revoked.Key)).Should().BeNull();
        (await _service.AuthenticateAsync("r6_" + new string('x', 43))).Should().BeNull();
        (await _service.AuthenticateAsync("not-a-key")).Should().BeNull();
        (await _service.AuthenticateAsync(null)).Should().BeNull();
        _repository.Verify(r => r.GetByHashAsync(ApiKey.Hash("not-a-key")), Times.Never);
    }

    // --- US3: manage ---

    [Fact]
    public async Task List_ReturnsTheStatusOfEachKey()
    {
        var active = await Create();
        var expiring = await Create(NOW.AddHours(1));
        var revoked = await Create();
        await _service.RevokeAsync(OWNER, revoked.ApiKeyId);
        _repository.Setup(r => r.ListByUserAsync(OWNER)).ReturnsAsync(() => _saved.ToList());
        _clock.Now = NOW.AddHours(2);

        var list = await _service.ListAsync(OWNER);

        list.ToDictionary(k => k.ApiKeyId, k => k.Status).Should().Equal(new Dictionary<long, string>
        {
            [active.ApiKeyId] = "active", [expiring.ApiKeyId] = "expired", [revoked.ApiKeyId] = "revoked"
        });
    }

    [Fact]
    public async Task RevokeOrDelete_SomeoneElsesKey_IsNotFound()
    {
        var created = await Create();

        await _service.Invoking(s => s.RevokeAsync(OTHER, created.ApiKeyId)).Should().ThrowAsync<KeyNotFoundException>();
        await _service.Invoking(s => s.DeleteAsync(OTHER, created.ApiKeyId)).Should().ThrowAsync<KeyNotFoundException>();
        _saved.Single().RevokedAt.Should().BeNull();
    }

    [Fact]
    public async Task Delete_ActiveKey_Throws_RevokedKey_Deletes()
    {
        var created = await Create();

        await _service.Invoking(s => s.DeleteAsync(OWNER, created.ApiKeyId)).Should().ThrowAsync<ConflictException>();

        await _service.RevokeAsync(OWNER, created.ApiKeyId);
        await _service.DeleteAsync(OWNER, created.ApiKeyId);
        _repository.Verify(r => r.DeleteAsync(created.ApiKeyId), Times.Once);
    }
}
