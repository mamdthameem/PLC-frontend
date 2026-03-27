using Microsoft.AspNetCore.SignalR;
using PlcApi.Hubs;
using PlcApi.Services;
using PlcApi.Models;

namespace PlcApi.Services;

public class PlcDataWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IHubContext<PlcHub> _hubContext;
    private readonly ILogger<PlcDataWorker> _logger;
    private readonly IDbConnectionState _connectionState;
    private readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(2);

    public PlcDataWorker(
        IServiceProvider serviceProvider,
        IHubContext<PlcHub> hubContext,
        ILogger<PlcDataWorker> logger,
        IDbConnectionState connectionState)
    {
        _serviceProvider = serviceProvider;
        _hubContext = hubContext;
        _logger = logger;
        _connectionState = connectionState;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PLC Data Worker is starting.");

        // --- Readiness Check (Non-blocking) ---
        // Don't block if database isn't connected - allow mock data fallback
        _logger.LogInformation("PLC Data Worker: Starting polling loop (will use mock data if database unavailable).");
        // -----------------------

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dataService = scope.ServiceProvider.GetRequiredService<IPlcDataService>();
                    var latestValues = await dataService.GetLatestValuesAsync();
                    
                    if (latestValues != null && latestValues.Any())
                    {
                        // Broadcast all latest values to clients
                        await _hubContext.Clients.All.SendAsync("ReceiveLatestValues", latestValues, stoppingToken);
                        _logger.LogDebug("Broadcasted {Count} PLC values.", latestValues.Count);
                    }
                }
            }
            catch (Exception ex)
            {
                // Only log as error if we were previously connected, otherwise it's just a transient failure during startup/mock phase
                if (_connectionState.HasEverConnected)
                {
                    _logger.LogError(ex, "Error occurred while polling PLC data.");
                }
                else
                {
                    _logger.LogDebug("Polling failed: DB not connected. Service will return mock data when queried.");
                    // Continue polling - the service will return mock data via GetLatestValuesAsync
                }
            }

            await Task.Delay(_pollInterval, stoppingToken);
        }

        _logger.LogInformation("PLC Data Worker is stopping.");
    }
}
