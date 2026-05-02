using Npgsql;
using PlcApi.Models;

namespace PlcApi.Services;

public class FilterService : IFilterService
{
    private readonly string _connectionString;
    private readonly ILogger<FilterService> _logger;

    public FilterService(IConfiguration config, ILogger<FilterService> logger)
    {
        _connectionString = config.GetConnectionString("PostgresDb")
            ?? throw new InvalidOperationException("PostgresDb connection string is required.");
        _logger = logger;
    }

    public async Task<int> SubmitRequestAsync(FilterRequestInput input)
    {
        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            const string sql = @"
                INSERT INTO calculation_requests (filter_start, filter_end, period_label)
                VALUES (@start, @end, @label)
                RETURNING id;";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("start", input.FilterStart);
            cmd.Parameters.AddWithValue("end",   input.FilterEnd);
            cmd.Parameters.AddWithValue("label",
                input.PeriodLabel is null ? DBNull.Value : (object)input.PeriodLabel);

            var id = await cmd.ExecuteScalarAsync();
            return Convert.ToInt32(id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to insert calculation_request");
            throw;
        }
    }

    public async Task<FilterStatusDto?> GetStatusAsync(int requestId)
    {
        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            const string sql = @"
                SELECT status, processed_at
                FROM calculation_requests
                WHERE id = @id;";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("id", requestId);
            await using var reader = await cmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync()) return null;

            return new FilterStatusDto
            {
                Status      = reader.GetString(0),
                ProcessedAt = reader.IsDBNull(1) ? null : reader.GetDateTime(1)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read status for request {Id}", requestId);
            throw;
        }
    }

    public async Task<List<FilterResultDto>> GetResultsAsync(int requestId)
    {
        var results = new List<FilterResultDto>();

        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            const string sql = @"
                SELECT parameter_name, value
                FROM plc_filtered_parameters
                WHERE request_id = @id
                ORDER BY parameter_name;";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("id", requestId);
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                results.Add(new FilterResultDto
                {
                    ParameterName = reader.GetString(0),
                    Value         = reader.IsDBNull(1) ? "" : reader.GetValue(1)?.ToString() ?? ""
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read results for request {Id}", requestId);
            throw;
        }

        return results;
    }
}
