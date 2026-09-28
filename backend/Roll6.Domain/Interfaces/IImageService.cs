using Roll6.DTO.Image;

namespace Roll6.Domain.Interfaces;

public interface IImageService
{
    Task<ImageUploadInfo> UploadAsync(Stream content, long length, string? contentType);

    /// <summary>Uploads a character sheet file (image or PDF) exactly as sent (022).</summary>
    Task<DocumentUploadInfo> UploadDocumentAsync(Stream content, long length, string? contentType);
}
