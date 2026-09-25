using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SimpleTabletopMap.API.Extensions;
using SimpleTabletopMap.Domain.Exceptions;

namespace SimpleTabletopMap.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    protected long CurrentUserId => User.GetUserId();

    protected IActionResult HandleException(Exception ex)
    {
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
