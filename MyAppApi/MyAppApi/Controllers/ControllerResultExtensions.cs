using Microsoft.AspNetCore.Mvc;
using MyAppApi.Services;

namespace MyAppApi.Controllers
{
    internal static class ControllerResultExtensions
    {
        public static IActionResult ToActionResult<T>(this ControllerBase controller, ServiceResult<T> result)
        {
            return result.Status switch
            {
                ServiceResultStatus.Ok => controller.Ok(result.Value),
                ServiceResultStatus.Created => controller.StatusCode(StatusCodes.Status201Created, result.Value),
                ServiceResultStatus.NoContent => controller.NoContent(),
                ServiceResultStatus.BadRequest => controller.BadRequest(new { message = result.Message }),
                ServiceResultStatus.Unauthorized => controller.Unauthorized(new { message = result.Message }),
                ServiceResultStatus.Forbidden => controller.Forbid(),
                ServiceResultStatus.NotFound => controller.NotFound(new { message = result.Message }),
                _ => controller.StatusCode(StatusCodes.Status500InternalServerError)
            };
        }
    }
}
