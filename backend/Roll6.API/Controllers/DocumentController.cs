using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Image;

namespace Roll6.API.Controllers;

/// <summary>Character sheet files (022): images or PDF, stored exactly as sent.</summary>
[Authorize]
public class DocumentController : ApiControllerBase
{
    private readonly IImageService _imageService;

    public DocumentController(IImageService imageService)
    {
        _imageService = imageService;
    }

    [HttpPost]
    [RequestSizeLimit(11_000_000)]
    [ProducesResponseType(typeof(DocumentUploadInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Upload(IFormFile? file)
    {
        try
        {
            if (file == null)
                throw new DomainValidationException("file", "Nenhum arquivo enviado.");
            await using var stream = file.OpenReadStream();
            return Ok(await _imageService.UploadDocumentAsync(stream, file.Length, file.ContentType));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
