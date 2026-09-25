using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Interfaces;
using SimpleTabletopMap.DTO.Image;
using SimpleTabletopMap.Infra.Interfaces.AppServices;

namespace SimpleTabletopMap.Domain.Services;

public class ImageService : IImageService
{
    public const long MAX_IMAGE_BYTES = 10 * 1024 * 1024;

    private static readonly Dictionary<string, string> EXTENSIONS = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/png"] = "png",
        ["image/jpeg"] = "jpg",
        ["image/webp"] = "webp"
    };

    private readonly IImageStorageAppService _storage;

    public ImageService(IImageStorageAppService storage)
    {
        _storage = storage;
    }

    public async Task<ImageUploadInfo> UploadAsync(Stream content, long length, string? contentType)
    {
        if (length <= 0)
            throw new DomainValidationException("file", "Nenhum arquivo enviado.");
        if (length > MAX_IMAGE_BYTES)
            throw new DomainValidationException("file", "A imagem deve ter no máximo 10 MB.");
        if (contentType == null || !EXTENSIONS.TryGetValue(contentType, out var extension))
            throw new DomainValidationException("file", "Formato não suportado. Use PNG, JPEG ou WebP.");

        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer);
        if (buffer.Length > MAX_IMAGE_BYTES)
            throw new DomainValidationException("file", "A imagem deve ter no máximo 10 MB.");
        if (!HasValidSignature(buffer.GetBuffer().AsSpan(0, (int)buffer.Length), extension))
            throw new DomainValidationException("file", "O conteúdo do arquivo não corresponde a uma imagem válida.");

        buffer.Position = 0;
        var fileName = await _storage.UploadAsync(buffer, contentType, extension);
        return new ImageUploadInfo { FileName = fileName, Url = _storage.GetUrl(fileName) };
    }

    private static bool HasValidSignature(ReadOnlySpan<byte> bytes, string extension) => extension switch
    {
        "png" => bytes.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
        "jpg" => bytes.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF }),
        "webp" => bytes.Length >= 12
                  && bytes[..4].SequenceEqual("RIFF"u8)
                  && bytes.Slice(8, 4).SequenceEqual("WEBP"u8),
        _ => false
    };
}
