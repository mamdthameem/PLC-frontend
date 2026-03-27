using Npgsql;
using PlcApi.Models;

namespace PlcApi.Services;

public interface ITenantConnectionFactory
{
    NpgsqlConnection GetConnection();
    string GetConnectionString();
}

public class TenantConnectionFactory : ITenantConnectionFactory
{
    private readonly TenantContext _tenantContext;
    private readonly IConfiguration _config;
    private readonly ILogger<TenantConnectionFactory> _logger;

    public TenantConnectionFactory(TenantContext tenantContext, IConfiguration config, ILogger<TenantConnectionFactory> logger)
    {
        _tenantContext = tenantContext;
        _config = config;
        _logger = logger;
    }

    public string GetConnectionString()
    {
        if (string.IsNullOrEmpty(_tenantContext.TenantId))
        {
            // Default to master/mock if no tenant context (e.g. during startup or public endpoints)
            return _config.GetConnectionString("PostgresDb") ?? "";
        }

        // In a real production system, you would look this up in a Master DB.
        // For this implementation, we'll assume connection strings are named "Tenant_{TenantId}" in appsettings.
        var connString = _config.GetConnectionString($"Tenant_{_tenantContext.TenantId}");
        
        if (string.IsNullOrEmpty(connString))
        {
            _logger.LogWarning("No connection string found for tenant: {TenantId}. Falling back to default.", _tenantContext.TenantId);
            return _config.GetConnectionString("PostgresDb") ?? "";
        }

        return connString;
    }

    public NpgsqlConnection GetConnection()
    {
        return new NpgsqlConnection(GetConnectionString());
    }
}
