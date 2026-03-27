namespace PlcApi.Services;

public class DbConnectionState : IDbConnectionState
{
    public bool HasEverConnected { get; private set; }
    public bool IsCurrentlyConnected { get; private set; }

    public void SetConnected(bool isConnected)
    {
        IsCurrentlyConnected = isConnected;
        if (isConnected)
        {
            HasEverConnected = true;
        }
    }
}
