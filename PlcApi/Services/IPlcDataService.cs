using PlcApi.Models;

namespace PlcApi.Services;

public interface IPlcDataService
{
    Task<List<LatestPlcValueDto>> GetLatestValuesAsync();
    Task<List<TimeSeriesDto>> GetTimeSeriesAsync(string address, int limit = 100);
    Task<(List<PlcValueDto> Values, int Total)> GetAllValuesAsync(int page = 1, int pageSize = 50);
    Task<List<string>> GetUniqueAddressesAsync();
    Task<bool> CheckConnectionAsync();
    Task<object> GetDatabaseSchemaAsync();
    Task<List<Dictionary<string, object>>> GetCalculatedMetricsAsync();
}
