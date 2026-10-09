using Roll6.Domain.Meta;

namespace Roll6.Domain.Interfaces;

public interface IPageMetaService
{
    /// <summary>The preview of the page at <paramref name="path"/> (map/{slug}, campaign/{slug}, else generic); never throws.</summary>
    Task<PageMeta> ForPathAsync(string path, string baseUrl);

    /// <summary>Stored image name of an active map's model, for its preview picture; null when there is none.</summary>
    Task<string?> MapImageAsync(string mapSlug);
}
