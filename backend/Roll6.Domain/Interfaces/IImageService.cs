using Roll6.DTO.Image;

namespace Roll6.Domain.Interfaces;

public interface IImageService
{
    Task<ImageUploadInfo> UploadAsync(Stream content, long length, string? contentType);
}
