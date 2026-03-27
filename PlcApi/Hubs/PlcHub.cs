using Microsoft.AspNetCore.SignalR;
using PlcApi.Models;

namespace PlcApi.Hubs;

public class PlcHub : Hub
{
    public async Task SendLatestValues(List<LatestPlcValueDto> values)
    {
        await Clients.All.SendAsync("ReceiveLatestValues", values);
    }

    public async Task SendValueUpdate(LatestPlcValueDto value)
    {
        await Clients.All.SendAsync("ReceiveValueUpdate", value);
    }
}
