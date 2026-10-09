using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Chat;

namespace Roll6.API.Controllers;

/// <summary>Chat entries by id and the recorded audio upload (041); the campaign's chat is read under /api/campaign/{id}/chat.</summary>
[Authorize]
public class ChatController : ApiControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    /// <summary>Deletes a message (its author or the master) or a narration (the master); it stays as "Mensagem apagada".</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(long id)
    {
        try
        {
            await _chatService.DeleteMessageAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Stores a recorded audio as it came (WebM, MP4/M4A or Ogg, at most 5 MB); send its fileName with the message.</summary>
    [HttpPost("audio")]
    [RequestSizeLimit(6_000_000)]
    [ProducesResponseType(typeof(ChatAudioUploadInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadAudio(IFormFile? file)
    {
        try
        {
            if (file == null)
                throw new DomainValidationException("file", "Nenhum arquivo enviado.");
            await using var stream = file.OpenReadStream();
            return Ok(await _chatService.UploadAudioAsync(stream, file.Length));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
