namespace PlcApi.Services;

public interface IDbConnectionState
{
    bool HasEverConnected { get; }
    bool IsCurrentlyConnected { get; }
    void SetConnected(bool isConnected);
}
