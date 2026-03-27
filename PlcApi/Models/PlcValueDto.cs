namespace PlcApi.Models;

public class PlcValueDto
{
    public int Id { get; set; }
    public string Address { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Direction { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class LatestPlcValueDto
{
    public string Address { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class TimeSeriesDto
{
    public DateTime Timestamp { get; set; }
    public string Value { get; set; } = string.Empty;
}

public class PlcValuesResponse
{
    public List<LatestPlcValueDto> Values { get; set; } = new();
    public int Total { get; set; }
}

