using FluentAssertions;
using Roll6.Domain.Slugs;

namespace Roll6.Tests.Domain.Validation;

public class SlugTests
{
    [Theory]
    [InlineData("Tormento Vil", "tormento-vil")]
    [InlineData("Ação & Reação", "acao-reacao")]
    [InlineData("  --Teste--  ", "teste")]
    public void From_NormalizesName(string name, string expected)
    {
        Slug.From(name, "campanha").Should().Be(expected);
    }

    [Fact]
    public void From_EmptyAfterNormalize_UsesFallback()
    {
        Slug.From("🐉🐉", "campanha").Should().Be("campanha");
        Slug.From("   ", "mapa").Should().Be("mapa");
        Slug.From(null, "mapa").Should().Be("mapa");
    }

    [Fact]
    public void From_CutsAt80WithoutTrailingHyphen()
    {
        Slug.From(new string('a', 200), "campanha").Should().Be(new string('a', 80));

        var cutOnHyphen = new string('b', 79) + " " + new string('c', 50);
        var slug = Slug.From(cutOnHyphen, "mapa");
        slug.Should().Be(new string('b', 79));
        slug.Should().NotEndWith("-");
        slug.Length.Should().BeLessThanOrEqualTo(Slug.MAX_BASE_LENGTH);
    }

    [Fact]
    public void NextFree_PicksSmallestMissingSuffix()
    {
        Slug.NextFree("teste", ["teste", "teste-2"]).Should().Be("teste-3");
        Slug.NextFree("teste", []).Should().Be("teste");
        Slug.NextFree("teste", ["teste-2"]).Should().Be("teste");
    }
}
