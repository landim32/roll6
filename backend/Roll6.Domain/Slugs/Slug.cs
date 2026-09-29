using System.Globalization;
using System.Text;

namespace Roll6.Domain.Slugs;

/// <summary>
/// URL slug derived from a name. Campaigns and maps receive one on insert and never change it.
/// </summary>
public static class Slug
{
    public const int MAX_BASE_LENGTH = 80;
    public const int MAX_LENGTH = 100;

    /// <summary>
    /// Builds the base slug: accents dropped, lower case, runs outside [a-z0-9] become one hyphen,
    /// trimmed and cut at <see cref="MAX_BASE_LENGTH"/> without a trailing hyphen. Empty names use <paramref name="fallback"/>.
    /// </summary>
    public static string From(string? name, string fallback)
    {
        var source = (name ?? string.Empty).Normalize(NormalizationForm.FormD);
        var letters = new StringBuilder(source.Length);
        foreach (var ch in source)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                letters.Append(ch);
        }

        var lower = letters.ToString().ToLowerInvariant();
        var slug = new StringBuilder(lower.Length);
        var pendingHyphen = false;
        foreach (var ch in lower)
        {
            if (ch is >= 'a' and <= 'z' or >= '0' and <= '9')
            {
                if (pendingHyphen && slug.Length > 0)
                    slug.Append('-');
                pendingHyphen = false;
                slug.Append(ch);
            }
            else
            {
                pendingHyphen = true;
            }
        }

        if (slug.Length > MAX_BASE_LENGTH)
        {
            slug.Length = MAX_BASE_LENGTH;
            while (slug.Length > 0 && slug[^1] == '-')
                slug.Length--;
        }

        return slug.Length == 0 ? fallback : slug.ToString();
    }

    /// <summary>Base slug when <paramref name="n"/> is 1 or less; otherwise <c>base-n</c>.</summary>
    public static string WithSuffix(string baseSlug, int n) => n <= 1 ? baseSlug : $"{baseSlug}-{n}";

    /// <summary>Smallest <see cref="WithSuffix"/> whose result is not in <paramref name="taken"/>.</summary>
    public static string NextFree(string baseSlug, IEnumerable<string> taken)
    {
        var used = taken as ISet<string> ?? new HashSet<string>(taken, StringComparer.Ordinal);
        for (var n = 1; ; n++)
        {
            var candidate = WithSuffix(baseSlug, n);
            if (!used.Contains(candidate))
                return candidate;
        }
    }
}
