using Roll6.DTO.Image;

namespace Roll6.Infra.Interfaces.AppServices;

public interface IImageStorageAppService
{
    /// <summary>Uploads the content into the configured folder and returns the file name ({guid}.{extension}) to store.</summary>
    Task<string> UploadAsync(Stream content, string contentType, string extension);

    /// <summary>Returns a temporary URL for the file, or null when there is no file.</summary>
    string? GetUrl(string? fileName);

    /// <summary>Opens the stored file for reading, or null when it does not exist.</summary>
    Task<StoredImageInfo?> OpenAsync(string fileName);

    /// <summary>
    /// Removes a stored file. Only for files nothing else can point to — the campaign chat's photos and audios (041);
    /// character and sheet files are write-once and shared, so they are never deleted.
    /// </summary>
    Task DeleteAsync(string fileName);
}
