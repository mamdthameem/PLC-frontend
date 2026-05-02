using PlcApi.Models;

namespace PlcApi.Services;

public interface IFilterService
{
    Task<int> SubmitRequestAsync(FilterRequestInput input);
    Task<FilterStatusDto?> GetStatusAsync(int requestId);
    Task<List<FilterResultDto>> GetResultsAsync(int requestId);
}
