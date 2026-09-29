using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Image;

namespace Roll6.API.Controllers;

[Authorize]
public class ImageController : ApiControllerBase
{
    private readonly IImageService _imageService;

    public ImageController(IImageService imageService)
    {
        _imageService = imageService;
    }

    [HttpPost]
    [RequestSizeLimit(11_000_000)]
    [ProducesResponseType(typeof(ImageUploadInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Upload(IFormFile? file)
    {
        try
        {
            if (file == null)
                throw new DomainValidationException("file", "Nenhum arquivo enviado.");
            await using var stream = file.OpenReadStream();
            return Ok(await _imageService.UploadAsync(stream, file.Length, file.ContentType));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>
    /// Stored image served by the API itself (029): the map snapshot draws the scene and the pieces on a
    /// canvas, which needs same-origin (or CORS) bytes — the bucket's presigned URLs don't send CORS headers.
    /// </summary>
    [HttpGet("file/{fileName}")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFile(string fileName)
    {
        try
        {
            var image = await _imageService.OpenAsync(fileName);
            if (image == null)
                return NotFound();
            Response.Headers.CacheControl = "private, max-age=3600";
            return File(image.Content, image.ContentType);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
