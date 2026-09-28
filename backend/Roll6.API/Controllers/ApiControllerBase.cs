using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Roll6.API.Extensions;
using Roll6.Domain.Exceptions;

namespace Roll6.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    protected long CurrentUserId => User.GetUserId();

    private string ActionName => $"{ControllerContext.ActionDescriptor.ControllerName}.{ControllerContext.ActionDescriptor.ActionName}";

    private ILogger Logger => HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger(GetType());

    protected IActionResult HandleException(Exception ex)
    {
        // Expected refusals are logged briefly; anything else (database down, storage, bugs) with the full exception.
        if (ex is DomainValidationException or UnauthorizedAccessException or KeyNotFoundException or ConflictException)
            Logger.LogInformation("{Action} refused: {Error} ({Message})", ActionName, ex.GetType().Name, ex.Message);
        else
            Logger.LogError(ex, "{Action} failed", ActionName);

        switch (ex)
        {
            case DomainValidationException validation:
                var modelState = new ModelStateDictionary();
                foreach (var (field, messages) in validation.Errors)
                    foreach (var message in messages)
                        modelState.AddModelError(field, message);
                return ValidationProblem(modelState);
            case UnauthorizedAccessException:
                return Problem(detail: ex.Message, statusCode: StatusCodes.Status403Forbidden);
            case KeyNotFoundException:
                return Problem(detail: ex.Message, statusCode: StatusCodes.Status404NotFound);
            case ConflictException:
                return Problem(detail: ex.Message, statusCode: StatusCodes.Status409Conflict);
            default:
                return StatusCode(500, ex.Message);
        }
    }
}
