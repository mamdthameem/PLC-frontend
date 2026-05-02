namespace PlcApi.Models;

public class FilterRequestInput
{
    public DateTime FilterStart { get; set; }
    public DateTime FilterEnd { get; set; }
    public string? PeriodLabel { get; set; }
}

public class FilterStatusDto
{
    public string Status { get; set; } = string.Empty;
    public DateTime? ProcessedAt { get; set; }
}
