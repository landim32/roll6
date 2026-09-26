using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class ApiKeyTests
{
    private static readonly DateTime NOW = new(2026, 9, 26, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Generate_ReturnsTheKeyOnceAndStoresOnlyItsHashAndPrefix()
    {
        var (apiKey, plainKey) = ApiKey.Generate(1, "  Bot  ", NOW.AddDays(30), NOW);

        plainKey.Should().MatchRegex("^r6_[A-Za-z0-9_-]{43}$");
        apiKey.KeyPrefix.Should().Be(plainKey[..11]);
        apiKey.KeyHash.Should().Be(ApiKey.Hash(plainKey)).And.HaveLength(64).And.NotContain(plainKey[3..]);
        (apiKey.UserId, apiKey.Name, apiKey.CreatedAt, apiKey.ExpiresAt).Should().Be((1L, "Bot", NOW, (DateTime?)NOW.AddDays(30)));
    }

    [Fact]
    public void Generate_NeverRepeatsAKey()
    {
        var keys = Enumerable.Range(0, 50).Select(_ => ApiKey.Generate(1, "k", null, NOW).PlainKey).ToList();

        keys.Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public void Hash_IsStableAndLowerCaseHex()
    {
        ApiKey.Hash("r6_abc").Should().Be(ApiKey.Hash("r6_abc")).And.MatchRegex("^[0-9a-f]{64}$");
        ApiKey.Hash("r6_abc").Should().NotBe(ApiKey.Hash("r6_abd"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("  ")]
    public void Generate_WithoutName_Throws(string? name)
    {
        var act = () => ApiKey.Generate(1, name, null, NOW);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("name");
    }

    [Fact]
    public void Generate_TooLongName_Throws()
    {
        var act = () => ApiKey.Generate(1, new string('a', ApiKey.MAX_NAME + 1), null, NOW);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("name");
    }

    [Fact]
    public void Generate_ExpirationNotInTheFuture_Throws()
    {
        var act = () => ApiKey.Generate(1, "k", NOW, NOW);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("expiresAt");
    }

    [Fact]
    public void Status_ActiveExpiredRevoked()
    {
        var (never, _) = ApiKey.Generate(1, "k", null, NOW);
        var (dated, _) = ApiKey.Generate(1, "k", NOW.AddHours(1), NOW);

        never.Status(NOW.AddYears(10)).Should().Be(ApiKey.STATUS_ACTIVE);
        dated.Status(NOW).Should().Be(ApiKey.STATUS_ACTIVE);
        dated.Status(NOW.AddHours(1)).Should().Be(ApiKey.STATUS_EXPIRED);
        dated.IsActive(NOW.AddHours(1)).Should().BeFalse();

        never.Revoke(NOW);
        never.Status(NOW).Should().Be(ApiKey.STATUS_REVOKED);
        never.IsActive(NOW).Should().BeFalse();
    }

    [Fact]
    public void Revoke_KeepsTheFirstDate()
    {
        var (apiKey, _) = ApiKey.Generate(1, "k", null, NOW);

        apiKey.Revoke(NOW);
        apiKey.Revoke(NOW.AddDays(1));

        apiKey.RevokedAt.Should().Be(NOW);
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("abc", false)]
    [InlineData("r6_short", false)]
    [InlineData("Bearer r6_abcdefghijk", false)]
    [InlineData("r6_abcdefghijk", true)]
    public void LooksLikeKey(string? value, bool expected)
    {
        ApiKey.LooksLikeKey(value).Should().Be(expected);
    }
}
