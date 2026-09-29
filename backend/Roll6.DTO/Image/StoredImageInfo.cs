namespace Roll6.DTO.Image;

/// <summary>A stored image read back through the API (029: the map snapshot cannot read the bucket directly).</summary>
public class StoredImageInfo
{
    public Stream Content { get; set; } = Stream.Null;

    public string ContentType { get; set; } = "application/octet-stream";
}
