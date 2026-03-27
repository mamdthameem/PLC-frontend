using Npgsql;
using PlcApi.Models;

namespace PlcApi.Services;

public class PlcDataService : IPlcDataService
{
    private readonly ILogger<PlcDataService> _logger;
    private readonly IDbConnectionState _connectionState;
    private readonly ITenantConnectionFactory _connectionFactory;

    public PlcDataService(
        ILogger<PlcDataService> logger, 
        IDbConnectionState connectionState,
        ITenantConnectionFactory connectionFactory)
    {
        _logger = logger;
        _connectionState = connectionState;
        _connectionFactory = connectionFactory;
    }

    /// <summary>
    /// Get latest value for each PLC address
    /// </summary>
    public async Task<List<LatestPlcValueDto>> GetLatestValuesAsync()
    {
        var results = new List<LatestPlcValueDto>();

        try
        {
            await using var conn = _connectionFactory.GetConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT DISTINCT ON (address)
                    address, 
                    value, 
                    timestamp
                FROM plc_values
                ORDER BY address, timestamp DESC;
            ";

            await using var cmd = new NpgsqlCommand(sql, conn);
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                results.Add(new LatestPlcValueDto
                {
                    Address = reader.GetString(0),
                    Value = reader.GetString(1),
                    Timestamp = reader.GetDateTime(2)
                });
            }

            _connectionState.SetConnected(true);
        }
        catch (Exception ex)
        {
            _connectionState.SetConnected(false);

            if (!_connectionState.HasEverConnected)
            {
                _logger.LogWarning("Initial database connection failed. Falling back to mock data for dashboard visibility. Error: {Message}", ex.Message);
                
                // Short Blast Machine Parameters (as per client requirements)
                results = new List<LatestPlcValueDto>
                {
                    new LatestPlcValueDto { Address = "machine_status", Value = "RUNNING", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "machine_utility", Value = "82.5", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "production_quantity", Value = "1250", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "energy_consumption", Value = "48.7", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "energy_per_casting", Value = "0.92", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "total_blast_time", Value = "3600", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "effective_shots_usage", Value = "0.88", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "avg_shot_refill_time", Value = "15", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "chamber_utilisation_p2", Value = "75.4", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "cycle_count", Value = "245", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "last_refill_time", Value = DateTime.Now.ToString("HH:mm:ss"), Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "maintenance_popup", Value = "FALSE", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "motor_amps", Value = "18.6", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "consumable_spare_life", Value = "120", Timestamp = DateTime.Now },
                    new LatestPlcValueDto { Address = "rework_flag", Value = "FALSE", Timestamp = DateTime.Now }
                };
            }
            else
            {
                _logger.LogError(ex, "Database connection lost during runtime. Real data was previously available.");
                throw; // Throw to let the UI/Worker know that real data is currently unavailable
            }
        }

        return results;
    }

    /// <summary>
    /// Get time-series data for a specific PLC address
    /// </summary>
    public async Task<List<TimeSeriesDto>> GetTimeSeriesAsync(string address, int limit = 100)
    {
        var results = new List<TimeSeriesDto>();

        try
        {
            await using var conn = _connectionFactory.GetConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT timestamp, value
                FROM plc_values
                WHERE address = @address
                ORDER BY timestamp DESC
                LIMIT @limit;
            ";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("address", address);
            cmd.Parameters.AddWithValue("limit", limit);

            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                results.Add(new TimeSeriesDto
                {
                    Timestamp = reader.GetDateTime(0),
                    Value = reader.GetString(1)
                });
            }

            // Reverse to get chronological order
            results.Reverse();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching time-series data for address {Address}", address);
            throw;
        }

        return results;
    }

    /// <summary>
    /// Get all PLC values with pagination
    /// </summary>
    public async Task<(List<PlcValueDto> Values, int Total)> GetAllValuesAsync(int page = 1, int pageSize = 50)
    {
        var results = new List<PlcValueDto>();
        int total = 0;

        try
        {
            await using var conn = _connectionFactory.GetConnection();
            await conn.OpenAsync();

            // Get total count
            var countSql = "SELECT COUNT(*) FROM plc_values";
            await using var countCmd = new NpgsqlCommand(countSql, conn);
            var countResult = await countCmd.ExecuteScalarAsync();
            total = countResult != null ? Convert.ToInt32(countResult) : 0;

            // Get paginated results
            var sql = @"
                SELECT id, address, value, direction, timestamp
                FROM plc_values
                ORDER BY timestamp DESC
                LIMIT @limit OFFSET @offset;
            ";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("limit", pageSize);
            cmd.Parameters.AddWithValue("offset", (page - 1) * pageSize);

            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                results.Add(new PlcValueDto
                {
                    Id = reader.GetInt32(0),
                    Address = reader.GetString(1),
                    Value = reader.GetString(2),
                    Direction = reader.GetString(3),
                    Timestamp = reader.GetDateTime(4)
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching PLC values");
            throw;
        }

        return (results, total);
    }

    /// <summary>
    /// Get unique PLC addresses
    /// </summary>
    public async Task<List<string>> GetUniqueAddressesAsync()
    {
        var results = new List<string>();

        try
        {
            await using var conn = _connectionFactory.GetConnection();
            await conn.OpenAsync();

            var sql = "SELECT DISTINCT address FROM plc_values ORDER BY address";

            await using var cmd = new NpgsqlCommand(sql, conn);
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                results.Add(reader.GetString(0));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching unique addresses");
            throw;
        }

        return results;
    }

    /// <summary>
    /// Performs a real connection check without mock fallback
    /// </summary>
    public async Task<bool> CheckConnectionAsync()
    {
        try
        {
            await using var conn = _connectionFactory.GetConnection();
            await conn.OpenAsync();
            
            // Simple query to verify DB access
            await using var cmd = new NpgsqlCommand("SELECT 1", conn);
            await cmd.ExecuteScalarAsync();
            
            _connectionState.SetConnected(true);
            return true;
        }
        catch (Exception ex)
        {
            _connectionState.SetConnected(false);
            _logger.LogWarning(ex, "Database connection check failed: {Message}", ex.Message);
            return false;
        }
    }

    public async Task<object> GetDatabaseSchemaAsync()
    {
        try
        {
            var tables = new List<object>();
            await using var conn = _connectionFactory.GetConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE';
            ";

            await using var cmd = new NpgsqlCommand(sql, conn);
            await using var reader = await cmd.ExecuteReaderAsync();

            var tableNames = new List<string>();
            while (await reader.ReadAsync())
            {
                tableNames.Add(reader.GetString(0));
            }
            await reader.CloseAsync();

            var schemaInfo = new List<object>();

            foreach (var tableName in tableNames)
            {
                var columns = new List<object>();
                var colSql = @"
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = @tableName
                    AND table_schema = 'public';
                ";
                await using var colCmd = new NpgsqlCommand(colSql, conn);
                colCmd.Parameters.AddWithValue("tableName", tableName);
                await using var colReader = await colCmd.ExecuteReaderAsync();
                
                while (await colReader.ReadAsync())
                {
                    columns.Add(new { 
                        Name = colReader.GetString(0), 
                        Type = colReader.GetString(1), 
                        Nullable = colReader.GetString(2) 
                    });
                }
                await colReader.CloseAsync();

                schemaInfo.Add(new { Table = tableName, Columns = columns });
            }

            return schemaInfo;
        }
        catch (Exception ex)
        {
            return new { error = ex.Message };
        }
    }

    public async Task<List<Dictionary<string, object>>> GetCalculatedMetricsAsync()
    {
        var results = new List<Dictionary<string, object>>();

        try
        {
            await using var conn = _connectionFactory.GetConnection();
            await conn.OpenAsync();

            var sql = "SELECT * FROM calculated_metrics ORDER BY timestamp DESC LIMIT 50;";

            await using var cmd = new NpgsqlCommand(sql, conn);
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var name = reader.GetName(i);
                    var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    row[name] = value ?? "";
                }
                results.Add(row);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching calculated metrics. Table might not exist or connection failed.");
            // Return dummy data if table doesn't exist yet, to show structure in UI
            if (results.Count == 0) {
                 results.Add(new Dictionary<string, object> { 
                     { "Status", "Wait" }, 
                     { "Message", "Table 'calculated_metrics' not found or empty" },
                     { "Error", ex.Message }
                 });
            }
        }

        return results;
    }
}

