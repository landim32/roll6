using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Interfaces;
using SimpleTabletopMap.DTO.Image;

namespace SimpleTabletopMap.API.Controllers;

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
}
