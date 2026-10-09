using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using Roll6.DTO.Image;
using Roll6.Infra.AppServices;
using Roll6.Infra.Interfaces.AppServices;
using SkiaSharp;

namespace Roll6.Tests.Infra;

public class PreviewImageRendererTests
{
    private readonly Mock<IImageStorageAppService> _storage = new();
    private readonly SkiaPreviewImageRenderer _renderer;

    public PreviewImageRendererTests()
    {
        _renderer = new SkiaPreviewImageRenderer(_storage.Object, new MemoryCache(new MemoryCacheOptions { SizeLimit = 32 * 1024 * 1024 }));
    }

    private void Stored(string fileName, byte[] bytes) =>
        _storage.Setup(s => s.OpenAsync(fileName)).ReturnsAsync(() => new StoredImageInfo { Content = new MemoryStream(bytes), ContentType = "image/png" });

    private static byte[] Png(int width, int height)
    {
        using var bitmap = new SKBitmap(width, height);
        bitmap.Erase(SKColors.Red);
        using var data = SKImage.FromBitmap(bitmap).Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    [Fact]
    public async Task WideImage_BecomesA1200x630Jpeg()
    {
        Stored("wide.png", Png(4000, 1000));

        var bytes = await _renderer.RenderMapAsync("wide.png");

        bytes.Should().NotBeNull();
        using var codec = SKCodec.Create(new MemoryStream(bytes!));
        codec.EncodedFormat.Should().Be(SKEncodedImageFormat.Jpeg);
        (codec.Info.Width, codec.Info.Height).Should().Be((1200, 630));
    }

    [Fact]
    public async Task SmallImage_IsCenteredOnTheBrandBackground()
    {
        Stored("small.png", Png(300, 300));

        var bytes = await _renderer.RenderMapAsync("small.png");
        using var bitmap = SKBitmap.Decode(bytes!);

        var corner = bitmap.GetPixel(5, 5);
        (corner.Red, corner.Green, corner.Blue).Should().Match<(byte, byte, byte)>(c => c.Item1 < 30 && c.Item2 < 40 && c.Item3 < 50, "the corner is the brand navy");
        bitmap.GetPixel(600, 315).Red.Should().BeGreaterThan(200, "the image fills the middle");
    }

    [Fact]
    public async Task SecondRequest_ComesFromTheCache()
    {
        Stored("wide.png", Png(800, 400));

        await _renderer.RenderMapAsync("wide.png");
        await _renderer.RenderMapAsync("wide.png");

        _storage.Verify(s => s.OpenAsync("wide.png"), Times.Once);
    }

    [Fact]
    public async Task MissingOrInvalidImage_ReturnsNull()
    {
        _storage.Setup(s => s.OpenAsync("missing.png")).ReturnsAsync((StoredImageInfo?)null);
        Stored("broken.png", new byte[] { 1, 2, 3, 4 });

        (await _renderer.RenderMapAsync("missing.png")).Should().BeNull();
        (await _renderer.RenderMapAsync("broken.png")).Should().BeNull();
    }
}
