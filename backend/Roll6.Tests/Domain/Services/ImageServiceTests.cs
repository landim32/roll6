using System.Text;
using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Services;
using Roll6.Infra.Interfaces.AppServices;

namespace Roll6.Tests.Domain.Services;

public class ImageServiceTests
{
    private static readonly byte[] PNG_BYTES = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 };

    private readonly Mock<IImageStorageAppService> _storage = new();
    private readonly ImageService _service;

    public ImageServiceTests()
    {
        _storage.Setup(s => s.UploadAsync(It.IsAny<Stream>(), "image/png", "png")).ReturnsAsync("0123456789abcdef0123456789abcdef.png");
        _storage.Setup(s => s.GetUrl("0123456789abcdef0123456789abcdef.png")).Returns("https://bucket/roll6/0123456789abcdef0123456789abcdef.png");
        _service = new ImageService(_storage.Object);
    }

    [Fact]
    public async Task Upload_ValidPng_ReturnsFileNameAndUrl()
    {
        var result = await _service.UploadAsync(new MemoryStream(PNG_BYTES), PNG_BYTES.Length, "image/png");

        result.FileName.Should().Be("0123456789abcdef0123456789abcdef.png");
        result.Url.Should().Be("https://bucket/roll6/0123456789abcdef0123456789abcdef.png");
    }

    [Fact]
    public async Task Upload_TextDisguisedAsPng_Throws()
    {
        var bytes = Encoding.UTF8.GetBytes("isto não é uma imagem");

        var act = () => _service.UploadAsync(new MemoryStream(bytes), bytes.Length, "image/png");

        await act.Should().ThrowAsync<DomainValidationException>();
        _storage.Verify(s => s.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Upload_UnsupportedContentType_Throws()
    {
        var act = () => _service.UploadAsync(new MemoryStream(PNG_BYTES), PNG_BYTES.Length, "image/gif");

        await act.Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task Upload_LargerThan10Mb_Throws()
    {
        var act = () => _service.UploadAsync(new MemoryStream(PNG_BYTES), ImageService.MAX_IMAGE_BYTES + 1, "image/png");

        await act.Should().ThrowAsync<DomainValidationException>();
    }
}
