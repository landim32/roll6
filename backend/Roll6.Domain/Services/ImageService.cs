using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using System.Text.RegularExpressions;
using Roll6.DTO.Image;
using Roll6.Infra.Interfaces.AppServices;

namespace Roll6.Domain.Services;

public class ImageService : IImageService
{
    public const long MAX_IMAGE_BYTES = 10 * 1024 * 1024;

    private static readonly Dictionary<string, string> EXTENSIONS = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/png"] = "png",
        ["image/jpeg"] = "jpg",
        ["image/webp"] = "webp"
    };

    /// <summary>Sheet files (022): the image types plus PDF.</summary>
    private static readonly Dictionary<string, string> DOCUMENT_EXTENSIONS = new(EXTENSIONS, StringComparer.OrdinalIgnoreCase)
    {
        ["application/pdf"] = "pdf"
    };

    /// <summary>Names the storage hands out: a 32-hex guid plus an image extension. Anything else is refused.</summary>
    private static readonly Regex STORED_IMAGE_NAME = new(@"^[0-9a-f]{32}\.(png|jpg|webp)$", RegexOptions.Compiled);

    private readonly IImageStorageAppService _storage;

    public ImageService(IImageStorageAppService storage)
    {
        _storage = storage;
    }

    public async Task<ImageUploadInfo> UploadAsync(Stream content, long length, string? contentType)
    {
        var fileName = await StoreAsync(content, length, contentType, EXTENSIONS,
            "A imagem deve ter no máximo 10 MB.",
            "Formato não suportado. Use PNG, JPEG ou WebP.",
            "O conteúdo do arquivo não corresponde a uma imagem válida.");
        return new ImageUploadInfo { FileName = fileName, Url = _storage.GetUrl(fileName) };
    }

    /// <summary>The bytes go to the storage untouched, with the Content-Type they were sent with (022 FR-003).</summary>
    public async Task<DocumentUploadInfo> UploadDocumentAsync(Stream content, long length, string? contentType)
    {
        var fileName = await StoreAsync(content, length, contentType, DOCUMENT_EXTENSIONS,
            "O arquivo deve ter no máximo 10 MB.",
            "Formato não suportado. Use PNG, JPEG, WebP ou PDF.",
            "O conteúdo do arquivo não corresponde ao formato informado.");
        return new DocumentUploadInfo
        {
            FileName = fileName,
            Url = _storage.GetUrl(fileName),
            Type = SheetFiles.TypeOf(fileName) ?? SheetFiles.IMAGE
        };
    }

    public async Task<StoredImageInfo?> OpenAsync(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || !STORED_IMAGE_NAME.IsMatch(fileName))
            return null;
        return await _storage.OpenAsync(fileName);
    }

    private async Task<string> StoreAsync(Stream content, long length, string? contentType,
        Dictionary<string, string> extensions, string tooLarge, string unsupported, string invalidContent)
    {
        if (length <= 0)
            throw new DomainValidationException("file", "Nenhum arquivo enviado.");
        if (length > MAX_IMAGE_BYTES)
            throw new DomainValidationException("file", tooLarge);
        if (contentType == null || !extensions.TryGetValue(contentType, out var extension))
            throw new DomainValidationException("file", unsupported);

        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer);
        if (buffer.Length > MAX_IMAGE_BYTES)
            throw new DomainValidationException("file", tooLarge);
        if (!HasValidSignature(buffer.GetBuffer().AsSpan(0, (int)buffer.Length), extension))
            throw new DomainValidationException("file", invalidContent);

        buffer.Position = 0;
        return await _storage.UploadAsync(buffer, contentType, extension);
    }

    private static bool HasValidSignature(ReadOnlySpan<byte> bytes, string extension) => extension switch
    {
        "png" => bytes.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
        "jpg" => bytes.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF }),
        "webp" => bytes.Length >= 12
                  && bytes[..4].SequenceEqual("RIFF"u8)
                  && bytes.Slice(8, 4).SequenceEqual("WEBP"u8),
        "pdf" => bytes.StartsWith("%PDF-"u8),
        _ => false
    };
}
