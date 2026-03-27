using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json;
using System.Collections.Generic;

public class GatewayWorker : BackgroundService
{
    private readonly ILogger<GatewayWorker> _logger;
    private readonly IConfiguration _configuration;
    private readonly DatabaseService _dbService;
    private readonly PlcService _plcService;
    private List<PlcAddress> _tags = new List<PlcAddress>();
    private int _scanMs = 1000;

    public GatewayWorker(
        ILogger<GatewayWorker> logger,
        IConfiguration configuration,
        DatabaseService dbService,
        PlcService plcService)
    {
        _logger = logger;
        _configuration = configuration;
        _dbService = dbService;
        _plcService = plcService;

        // read scan interval from config (fallback 1000ms)
        _scanMs = _configuration.GetValue<int?>("ScanIntervalMs") ?? 1000;

        LoadTagsFromConfig();
    }

    private void LoadTagsFromConfig()
    {
        try
        {
            var tagsSection = _configuration.GetSection("Tags");
            if (!tagsSection.Exists())
            {
                _logger.LogWarning("No Tags found in configuration (appsettings.json).");
                return;
            }

            _tags = tagsSection.Get<List<PlcAddress>>() ?? new List<PlcAddress>();
            _logger.LogInformation("Loaded {count} tags from configuration.", _tags.Count);
        }
        catch (System.Exception ex)
        {
            _logger.LogError(ex, "Failed to load Tags from configuration.");
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("GatewayWorker starting.");

        // Attempt initial PLC connect
        try
        {
            _plcService.Connect();
            _logger.LogInformation("Connected to PLC.");
        }
        catch (System.Exception ex)
        {
            _logger.LogWarning(ex, "Initial PLC connection failed; worker will retry in loop.");
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Ensure PLC is connected; Connect() method is idempotent
                try
                {
                    _plcService.Connect();
                }
                catch (System.Exception ex)
                {
                    _logger.LogWarning(ex, "PLC connect attempt failed in loop.");
                }

                if (_plcService.IsConnected)
                {
                    foreach (var tag in _tags)
                    {
                        if (tag.Mode == "Read" || tag.Mode == "ReadWrite")
                        {
                            try
                            {
                                var val = _plcService.Read(tag.Address);
                                _logger.LogInformation("Read {name} ({addr}) = {val}", tag.Name, tag.Address, val);
                                // write to Postgres with automatic reconnect/retry
                                await _dbService.InsertDataAsync(tag.Address, val);
                            }
                            catch (System.Exception ex)
                            {
                                _logger.LogWarning(ex, "Failed to read/write tag {addr}", tag.Address);
                            }
                        }
                        // Note: Write-only or ReadWrite writes are not implemented here; implement as needed
                    }
                }
                else
                {
                    _logger.LogWarning("PLC not connected this cycle.");
                }
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception in worker loop.");
            }

            await Task.Delay(_scanMs, stoppingToken);
        }

        _logger.LogInformation("GatewayWorker stopping.");
    }
}
