using Microsoft.AspNetCore.Mvc;
using PlcApi.Models;
using PlcApi.Services;

namespace PlcApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FilterController : ControllerBase
{
    private readonly IFilterService _service;
    private readonly ILogger<FilterController> _logger;

    public FilterController(IFilterService service, ILogger<FilterController> logger)
    {
        _service = service;
        _logger  = logger;
    }

    /// <summary>
    /// Submit a filter request. Inserts a row into calculation_requests and returns the id.
    /// The backend picks it up within 5 seconds and sets status = 'done'.
    /// Poll GET /api/filter/{id}/status every 2–3 seconds until done.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] FilterRequestInput input)
    {
        try
        {
            if (input.FilterStart >= input.FilterEnd)
                return BadRequest(new { error = "filter_start must be before filter_end" });

            var id = await _service.SubmitRequestAsync(input);
            return Ok(new { requestId = id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to submit filter request");
            return StatusCode(500, new { error = "Failed to submit filter request" });
        }
    }

    /// <summary>
    /// Poll the status of a calculation request.
    /// Status lifecycle: pending → processing → done (or error).
    /// Stop polling when status is 'done' or 'error'.
    /// </summary>
    [HttpGet("{id}/status")]
    public async Task<IActionResult> GetStatus(int id)
    {
        try
        {
            var status = await _service.GetStatusAsync(id);
            if (status is null)
                return NotFound(new { error = $"Request {id} not found" });

            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch status for request {Id}", id);
            return StatusCode(500, new { error = "Failed to fetch request status" });
        }
    }

    /// <summary>
    /// Read the results from plc_filtered_parameters once status is 'done'.
    /// Returns one row per parameter for the requested time window.
    /// </summary>
    [HttpGet("{id}/results")]
    public async Task<IActionResult> GetResults(int id)
    {
        try
        {
            var results = await _service.GetResultsAsync(id);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch results for request {Id}", id);
            return StatusCode(500, new { error = "Failed to fetch results" });
        }
    }
}
