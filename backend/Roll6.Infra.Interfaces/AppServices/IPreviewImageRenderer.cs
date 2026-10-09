namespace Roll6.Infra.Interfaces.AppServices;

/// <summary>Pictures for link previews (040).</summary>
public interface IPreviewImageRenderer
{
    /// <summary>The stored image as a 1200×630 JPEG on the brand background; null when missing or unreadable.</summary>
    Task<byte[]?> RenderMapAsync(string fileName);
}
