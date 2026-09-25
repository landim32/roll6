namespace Roll6.Infra.Interfaces.AppServices;

public interface IImageStorageAppService
{
    /// <summary>Uploads the content into the configured folder and returns the file name ({guid}.{extension}) to store.</summary>
    Task<string> UploadAsync(Stream content, string contentType, string extension);

    /// <summary>Returns a temporary URL for the file, or null when there is no file.</summary>
    string? GetUrl(string? fileName);
}
