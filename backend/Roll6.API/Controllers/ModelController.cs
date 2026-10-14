using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Image;

namespace Roll6.API.Controllers;

/// <summary>Token 3D models (055): a glTF binary (.glb) stored exactly as sent and read back through the API.</summary>
[Authorize]
public class ModelController : ApiControllerBase
{
    private readonly IImageService _imageService;

    public ModelController(IImageService imageService)
    {
        _imageService = imageService;
    }

    [HttpPost]
    [RequestSizeLimit(21_000_000)]
    [ProducesResponseType(typeof(ModelUploadInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Upload(IFormFile? file)
    {
        try
        {
            if (file == null)
                throw new DomainValidationException("file", "Nenhum arquivo enviado.");
            await using var stream = file.OpenReadStream();
            return Ok(await _imageService.UploadModelAsync(stream, file.Length));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>
    /// A stored model served by the API itself: the 3D view fetches it, and the bucket's presigned URLs send no CORS
    /// headers. Stored names are write-once, so the response may be cached for good.
    /// </summary>
    [HttpGet("file/{fileName}")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFile(string fileName)
    {
        try
        {
            var model = await _imageService.OpenModelAsync(fileName);
            if (model == null)
                return NotFound();
            Response.Headers.CacheControl = "private, max-age=31536000, immutable";
            return File(model.Content, "model/gltf-binary");
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
