using System;
using System.Threading.Tasks;
using Npgsql;
using Microsoft.Extensions.Logging;

public class DatabaseService
{
    private readonly string _connectionString;
    private readonly ILogger<DatabaseService> _logger;
    private readonly int _maxRetries = 5;
    private readonly int _baseDelayMs = 500; // exponential backoff base

    public DatabaseService(string connectionString, ILogger<DatabaseService> logger)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
        _logger = logger;
    }

    /// <summary>
    /// Insert a record into Postgres with automatic reconnect/retry on transient failures.
    /// </summary>
    public async Task InsertDataAsync(string tagName, object value)
    {
        if (string.IsNullOrEmpty(tagName)) throw new ArgumentNullException(nameof(tagName));
        string val = value?.ToString() ?? "";

        int attempt = 0;
        while (true)
        {
            attempt++;
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync(); // will throw if unable to connect

                const string sql = @"
                    INSERT INTO plc_value (address, value, direction, timestamp)
                    VALUES (@address, @value, @direction, NOW())";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("address", tagName);
                cmd.Parameters.AddWithValue("value", val);
                cmd.Parameters.AddWithValue("direction", "Read");

                await cmd.ExecuteNonQueryAsync();
                return; // success
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Postgres write attempt {attempt} failed for {tag}", attempt, tagName);

                if (attempt >= _maxRetries)
                {
                    _logger?.LogError(ex, "Postgres write failed after {attempts} attempts. Giving up for now.", attempt);
                    return; // give up this cycle; worker will attempt again on next loop
                }

                // exponential backoff with jitter
                int delay = _baseDelayMs * (int)Math.Pow(2, attempt - 1);
                var jitter = new Random().Next(0, 200);
                await Task.Delay(delay + jitter);
                // loop retries
            }
        }
    }
}
