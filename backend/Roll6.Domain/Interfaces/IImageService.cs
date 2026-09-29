using Roll6.DTO.Image;

namespace Roll6.Domain.Interfaces;

public interface IImageService
{
    Task<ImageUploadInfo> UploadAsync(Stream content, long length, string? contentType);

    /// <summary>Uploads a character sheet file (image or PDF) exactly as sent (022).</summary>
    Task<DocumentUploadInfo> UploadDocumentAsync(Stream content, long length, string? contentType);

    /// <summary>
    /// Reads a stored image by its file name ({guid}.png|jpg|webp) so the browser can draw it on a canvas
    /// without depending on the bucket's CORS (029). Null for an invalid name or a missing file.
    /// </summary>
    Task<StoredImageInfo?> OpenAsync(string fileName);
}
