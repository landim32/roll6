using Microsoft.Extensions.Caching.Memory;
using Roll6.Infra.Interfaces.AppServices;
using SkiaSharp;

namespace Roll6.Infra.AppServices;

/// <summary>
/// Link-preview picture of a map (040): the stored image scaled to fit 1200×630 (the 1.91:1 of previews), centered on
/// the brand navy, as a JPEG small enough for messaging apps (map images go up to 10 MB). Kept in memory by file
/// name — stored files never change, so a new image is a new key.
/// </summary>
public class SkiaPreviewImageRenderer : IPreviewImageRenderer
{
    public const int WIDTH = 1200;
    public const int HEIGHT = 630;
    private const int JPEG_QUALITY = 80;
    private static readonly SKColor BACKGROUND = new(0x0b, 0x12, 0x20);

    private readonly IImageStorageAppService _storage;
    private readonly IMemoryCache _cache;

    public SkiaPreviewImageRenderer(IImageStorageAppService storage, IMemoryCache cache)
    {
        _storage = storage;
        _cache = cache;
    }

    public async Task<byte[]?> RenderMapAsync(string fileName)
    {
        var key = $"og:{fileName}";
        if (_cache.TryGetValue(key, out byte[]? cached))
            return cached;

        var stored = await _storage.OpenAsync(fileName);
        if (stored == null)
            return null;
        byte[] source;
        await using (stored.Content)
        {
            using var buffer = new MemoryStream();
            await stored.Content.CopyToAsync(buffer);
            source = buffer.ToArray();
        }

        var rendered = Render(source);
        if (rendered != null)
            _cache.Set(key, rendered, new MemoryCacheEntryOptions { Size = rendered.Length, SlidingExpiration = TimeSpan.FromDays(1) });
        return rendered;
    }

    private static byte[]? Render(byte[] source)
    {
        SKBitmap? decoded;
        try
        {
            decoded = SKBitmap.Decode(source);
        }
        catch (ArgumentException)
        {
            // Not an image SkiaSharp can read (it throws instead of returning null on unknown data).
            return null;
        }
        using var image = decoded;
        if (image == null || image.Width == 0 || image.Height == 0)
            return null;

        var scale = Math.Min((float)WIDTH / image.Width, (float)HEIGHT / image.Height);
        var width = image.Width * scale;
        var height = image.Height * scale;
        var target = SKRect.Create((WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);

        using var surface = SKSurface.Create(new SKImageInfo(WIDTH, HEIGHT, SKColorType.Rgba8888, SKAlphaType.Premul));
        var canvas = surface.Canvas;
        canvas.Clear(BACKGROUND);
        using var picture = SKImage.FromBitmap(image);
        canvas.DrawImage(picture, target, new SKSamplingOptions(SKCubicResampler.Mitchell));
        using var snapshot = surface.Snapshot();
        using var data = snapshot.Encode(SKEncodedImageFormat.Jpeg, JPEG_QUALITY);
        return data?.ToArray();
    }
}
