using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using PlcApi.Models;
using PlcApi.Services;

namespace PlcApi.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PlcController : ControllerBase
{
    private readonly IPlcDataService _service;
    private readonly ILogger<PlcController> _logger;

    public PlcController(IPlcDataService service, ILogger<PlcController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>
    /// Get latest value for each PLC address
    /// </summary>
    [HttpGet("latest")]
    public async Task<ActionResult<PlcValuesResponse>> GetLatestValues()
    {
        try
        {
            var values = await _service.GetLatestValuesAsync();
            return Ok(new PlcValuesResponse
            {
                Values = values,
                Total = values.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetLatestValues");
            return StatusCode(500, new { error = "Failed to fetch latest values", message = ex.Message });
        }
    }

    /// <summary>
    /// Get time-series data for a specific PLC address
    /// </summary>
    [HttpGet("timeseries/{address}")]
    public async Task<ActionResult<List<TimeSeriesDto>>> GetTimeSeries(string address, [FromQuery] int limit = 100)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(address))
            {
                return BadRequest(new { error = "Address is required" });
            }

            var data = await _service.GetTimeSeriesAsync(address, limit);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetTimeSeries for address {Address}", address);
            return StatusCode(500, new { error = "Failed to fetch time-series data", message = ex.Message });
        }
    }

    /// <summary>
    /// Get all PLC values with pagination
    /// </summary>
    [HttpGet("values")]
    public async Task<ActionResult> GetAllValues([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 1000) pageSize = 50;

            var (values, total) = await _service.GetAllValuesAsync(page, pageSize);
            
            return Ok(new
            {
                values,
                pagination = new
                {
                    page,
                    pageSize,
                    total,
                    totalPages = (int)Math.Ceiling(total / (double)pageSize)
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAllValues");
            return StatusCode(500, new { error = "Failed to fetch values", message = ex.Message });
        }
    }

    /// <summary>
    /// Get list of unique PLC addresses
    /// </summary>
    [HttpGet("addresses")]
    public async Task<ActionResult<List<string>>> GetAddresses()
    {
        try
        {
            var addresses = await _service.GetUniqueAddressesAsync();
            return Ok(addresses);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetAddresses");
            return StatusCode(500, new { error = "Failed to fetch addresses", message = ex.Message });
        }
    }

    /// <summary>
    /// Debug endpoint to check database schema
    /// </summary>
    [HttpGet("debug/schema")]
    public async Task<ActionResult> DebugSchema()
    {
        var schema = await _service.GetDatabaseSchemaAsync();
        return Ok(schema);
    }

    /// <summary>
    /// Get data from calculated_metrics table
    /// </summary>
    [HttpGet("metrics")]
    public async Task<ActionResult> GetCalculatedMetrics()
    {
        var data = await _service.GetCalculatedMetricsAsync();
        return Ok(data);
    }

    /// <summary>
    /// Health check endpoint with database status
    /// </summary>
    [HttpGet("health")]
    public async Task<ActionResult> Health()
    {
        var isConnected = await _service.CheckConnectionAsync();
        return Ok(new { 
            status = "healthy", 
            database = isConnected ? "connected" : "disconnected",
            timestamp = DateTime.UtcNow 
        });
    }
}
