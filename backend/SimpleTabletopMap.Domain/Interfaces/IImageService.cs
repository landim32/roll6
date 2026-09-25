using SimpleTabletopMap.DTO.Image;

namespace SimpleTabletopMap.Domain.Interfaces;

public interface IImageService
{
    Task<ImageUploadInfo> UploadAsync(Stream content, long length, string? contentType);
}
