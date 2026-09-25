using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using SimpleTabletopMap.DTO.Settings;
using SimpleTabletopMap.Infra.Interfaces.AppServices;

namespace SimpleTabletopMap.Infra.AppServices;

public class S3ImageStorageAppService : IImageStorageAppService
{
    private readonly IAmazonS3 _client;
    private readonly S3Settings _settings;

    public S3ImageStorageAppService(IAmazonS3 client, IOptions<S3Settings> settings)
    {
        _client = client;
        _settings = settings.Value;
    }

    /// <summary>
    /// AWS S3 when ServiceUrl is empty; otherwise an S3-compatible provider such as
    /// DigitalOcean Spaces (https://{region}.digitaloceanspaces.com) or MinIO.
    /// </summary>
    public static IAmazonS3 CreateClient(S3Settings settings)
    {
        var config = new AmazonS3Config();
        if (string.IsNullOrWhiteSpace(settings.ServiceUrl))
        {
            config.RegionEndpoint = RegionEndpoint.GetBySystemName(settings.Region);
        }
        else
        {
            config.ServiceURL = settings.ServiceUrl;
            config.AuthenticationRegion = settings.Region;
            config.ForcePathStyle = settings.ForcePathStyle;
            // Newer SDKs send checksums by default, which S3-compatible providers may reject.
            config.RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED;
            config.ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED;
        }
        return new AmazonS3Client(config);
    }

    public async Task<string> UploadAsync(Stream content, string contentType, string extension)
    {
        var fileName = $"{Guid.NewGuid():N}.{extension}";
        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _settings.BucketName,
            Key = GetKey(fileName),
            InputStream = content,
            ContentType = contentType,
            // aws-chunked uploads are not supported by every S3-compatible provider.
            UseChunkEncoding = string.IsNullOrWhiteSpace(_settings.ServiceUrl)
        });
        return fileName;
    }

    public string? GetUrl(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            return null;

        return _client.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = _settings.BucketName,
            Key = GetKey(fileName),
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.AddMinutes(_settings.UrlExpirationMinutes)
        });
    }

    /// <summary>Only the file name is stored in the database; the configured folder is applied here.</summary>
    private string GetKey(string fileName)
    {
        var folder = _settings.Folder.Trim().Trim('/');
        return string.IsNullOrEmpty(folder) ? fileName : $"{folder}/{fileName}";
    }
}
