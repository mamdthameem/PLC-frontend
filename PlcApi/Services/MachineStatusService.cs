using Npgsql;
using PlcApi.Models;

namespace PlcApi.Services;

public class MachineStatusService : IMachineStatusService
{
    private readonly string _connectionString;
    private readonly ILogger<MachineStatusService> _logger;

    public MachineStatusService(IConfiguration config, ILogger<MachineStatusService> logger)
    {
        _connectionString = config.GetConnectionString("PostgresDb")
            ?? throw new InvalidOperationException("PostgresDb connection string is required.");
        _logger = logger;
    }

    public async Task<MachineStatusDto?> GetStatusAsync()
    {
        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            const string sql = @"
                SELECT value, last_updated
                FROM plc_current_values
                WHERE address = 'DB60.DBB0'
                LIMIT 1;";

            await using var cmd    = new NpgsqlCommand(sql, conn);
            await using var reader = await cmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync()) return null;
            return new MachineStatusDto
            {
                Value       = reader.GetValue(0)?.ToString() ?? "",
                LastUpdated = reader.GetDateTime(1)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read machine status from plc_current_values");
            throw;
        }
    }
}
