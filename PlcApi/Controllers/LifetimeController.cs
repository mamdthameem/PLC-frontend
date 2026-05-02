using Microsoft.AspNetCore.Mvc;
using PlcApi.Services;

namespace PlcApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LifetimeController : ControllerBase
{
    private readonly ILifetimeService _service;
    private readonly ILogger<LifetimeController> _logger;

    public LifetimeController(ILifetimeService service, ILogger<LifetimeController> logger)
    {
        _service = service;
        _logger  = logger;
    }

    /// <summary>
    /// Returns all rows from plc_lifetime_parameters.
    /// Poll this every 60 seconds — the backend updates it every minute.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var data = await _service.GetAllAsync();
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch lifetime parameters");
            return StatusCode(500, new { error = "Failed to fetch lifetime parameters" });
        }
    }
}
