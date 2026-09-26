using System.Text.RegularExpressions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>
/// One entry of a campaign's plan (018), seen and changed only by the master: a title and a markdown
/// description whose images are stored as <c>roll6-image:{fileName}</c> — only the uploaded file name, like every
/// other entity — and resolved to temporary URLs on read.
/// </summary>
public class CampaignPlan
{
    public const int MAX_TITLE = 260;
    public const int MAX_DESCRIPTION = 50000;
    public const string IMAGE_PREFIX = "roll6-image:";

    private static readonly Regex IMAGE_REF_REGEX = new(@"roll6-image:([0-9a-f]{32}\.(?:png|jpg|webp))", RegexOptions.Compiled);

    public long CampaignPlanId { get; set; }
    public long CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ChangedAt { get; set; }

    public static CampaignPlan Create(long campaignId, string? title, string? description)
    {
        if (campaignId <= 0)
            throw new DomainValidationException("campaignId", "A campanha é obrigatória.");
        var plan = new CampaignPlan { CampaignId = campaignId };
        plan.Update(title, description);
        plan.CreatedAt = plan.ChangedAt;
        return plan;
    }

    public void Update(string? title, string? description)
    {
        Title = Guard.RequiredText(title, "title", MAX_TITLE);
        Description = Guard.OptionalText(description, "description", MAX_DESCRIPTION);
        ChangedAt = DateTime.UtcNow;
    }

    /// <summary>Uploaded images referenced by the description, each once.</summary>
    public List<string> ImageFileNames() => Description == null
        ? new List<string>()
        : IMAGE_REF_REGEX.Matches(Description).Select(m => m.Groups[1].Value).Distinct().ToList();
}
