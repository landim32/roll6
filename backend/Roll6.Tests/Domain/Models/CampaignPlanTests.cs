using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class CampaignPlanTests
{
    private const string IMAGE_A = "0123456789abcdef0123456789abcdef.png";
    private const string IMAGE_B = "fedcba9876543210fedcba9876543210.webp";

    [Fact]
    public void Create_TrimsAndStartsBothDates()
    {
        var plan = CampaignPlan.Create(10, "  Capítulo 1  ", "  ## Estrada  ");

        (plan.CampaignId, plan.Title, plan.Description).Should().Be((10L, "Capítulo 1", "## Estrada"));
        plan.CreatedAt.Should().Be(plan.ChangedAt);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void Create_WithoutTitle_Throws(string? title)
    {
        var act = () => CampaignPlan.Create(10, title, null);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("title");
    }

    [Fact]
    public void Limits_AreEnforced()
    {
        var longTitle = () => CampaignPlan.Create(10, new string('a', CampaignPlan.MAX_TITLE + 1), null);
        var longText = () => CampaignPlan.Create(10, "T", new string('a', CampaignPlan.MAX_DESCRIPTION + 1));

        longTitle.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("title");
        longText.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("description");
    }

    [Fact]
    public void EmptyDescription_IsNull()
    {
        CampaignPlan.Create(10, "T", "   ").Description.Should().BeNull();
    }

    [Fact]
    public void Update_ChangesChangedAtButNotCreatedAt()
    {
        var plan = CampaignPlan.Create(10, "T", null);
        var created = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        plan.CreatedAt = created;
        plan.ChangedAt = created;

        plan.Update("Novo", "texto");

        plan.CreatedAt.Should().Be(created);
        plan.ChangedAt.Should().BeAfter(created);
        (plan.Title, plan.Description).Should().Be(("Novo", "texto"));
    }

    [Fact]
    public void ImageFileNames_ReturnsValidReferencesOnce()
    {
        var plan = CampaignPlan.Create(10, "T",
            $"![a](roll6-image:{IMAGE_A}) texto ![b](roll6-image:{IMAGE_B}) ![de novo](roll6-image:{IMAGE_A}) "
            + "![externa](https://example.com/x.png) ![inválida](roll6-image:../../etc/passwd) ![gif](roll6-image:0123456789abcdef0123456789abcdef.gif)");

        plan.ImageFileNames().Should().Equal(IMAGE_A, IMAGE_B);
    }

    [Fact]
    public void ImageFileNames_WithoutDescription_IsEmpty()
    {
        CampaignPlan.Create(10, "T", null).ImageFileNames().Should().BeEmpty();
    }
}
