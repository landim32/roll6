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

    // ---- 022: documents (character sheet file) ----

    private static readonly byte[] PDF_BYTES = Encoding.ASCII.GetBytes("%PDF-1.7 fake pdf body 1 0 obj");
    private const string PDF_NAME = "0123456789abcdef0123456789abcdef.pdf";

    [Fact]
    public async Task UploadDocument_Pdf_StoresTheSameBytesWithItsContentType()
    {
        byte[]? stored = null;
        _storage.Setup(s => s.UploadAsync(It.IsAny<Stream>(), "application/pdf", "pdf"))
            .Callback((Stream stream, string _, string _) =>
            {
                using var copy = new MemoryStream();
                stream.CopyTo(copy);
                stored = copy.ToArray();
            })
            .ReturnsAsync(PDF_NAME);
        _storage.Setup(s => s.GetUrl(PDF_NAME)).Returns("https://bucket/roll6/" + PDF_NAME);

        var result = await _service.UploadDocumentAsync(new MemoryStream(PDF_BYTES), PDF_BYTES.Length, "application/pdf");

        result.FileName.Should().Be(PDF_NAME);
        result.Type.Should().Be("pdf");
        result.Url.Should().Be("https://bucket/roll6/" + PDF_NAME);
        stored.Should().Equal(PDF_BYTES);
    }

    [Theory]
    [InlineData("image/png", "png")]
    [InlineData("image/jpeg", "jpg")]
    [InlineData("image/webp", "webp")]
    public async Task UploadDocument_Images_AreImages(string contentType, string extension)
    {
        var bytes = extension switch
        {
            "png" => PNG_BYTES,
            "jpg" => new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00 },
            _ => new byte[] { 0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50 }
        };
        _storage.Setup(s => s.UploadAsync(It.IsAny<Stream>(), contentType, extension)).ReturnsAsync($"0123456789abcdef0123456789abcdef.{extension}");

        var result = await _service.UploadDocumentAsync(new MemoryStream(bytes), bytes.Length, contentType);

        result.Type.Should().Be("image");
        result.FileName.Should().EndWith("." + extension);
    }

    [Fact]
    public async Task UploadDocument_UnsupportedType_Throws()
    {
        var act = () => _service.UploadDocumentAsync(new MemoryStream(PDF_BYTES), PDF_BYTES.Length, "application/msword");

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("file");
        _storage.Verify(s => s.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UploadDocument_TextDisguisedAsPdf_Throws()
    {
        var bytes = Encoding.UTF8.GetBytes("isto não é um pdf");

        var act = () => _service.UploadDocumentAsync(new MemoryStream(bytes), bytes.Length, "application/pdf");

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("file");
        _storage.Verify(s => s.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(ImageService.MAX_IMAGE_BYTES + 1)]
    public async Task UploadDocument_EmptyOrTooLarge_Throws(long length)
    {
        var act = () => _service.UploadDocumentAsync(new MemoryStream(PDF_BYTES), length, "application/pdf");

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("file");
    }
}
