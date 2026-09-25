namespace SimpleTabletopMap.DTO.Settings;

public class S3Settings
{
    public string BucketName { get; set; } = string.Empty;

    /// <summary>Signing region. For DigitalOcean Spaces use "us-east-1" (the Spaces region goes in ServiceUrl).</summary>
    public string Region { get; set; } = "us-east-1";

    /// <summary>Endpoint of an S3-compatible provider, e.g. https://nyc3.digitaloceanspaces.com. Empty = AWS S3.</summary>
    public string? ServiceUrl { get; set; }

    /// <summary>Path-style URLs (endpoint/bucket/key). Required by MinIO; DigitalOcean Spaces uses virtual-hosted style (false).</summary>
    public bool ForcePathStyle { get; set; }

    /// <summary>Folder (key prefix) inside the bucket where uploaded files are stored.</summary>
    public string Folder { get; set; } = "simple-tabletop";

    public int UrlExpirationMinutes { get; set; } = 60;
}
