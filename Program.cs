using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

// Build Host
var host = Host.CreateDefaultBuilder(args)
    .ConfigureAppConfiguration((context, cfg) =>
    {
        cfg.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
    })
    .ConfigureServices((context, services) =>
    {
        var config = context.Configuration;

        // Read PLC config
        var plcIp = config.GetValue<string>("PLC:IpAddress") ?? throw new InvalidOperationException("PLC:IpAddress is required");
        var plcRack = config.GetValue<short>("PLC:Rack");
        var plcSlot = config.GetValue<short>("PLC:Slot");

        // Read Postgres connection string (try ConnectionStrings:PostgresDb first, then PostgreSQL:ConnectionString for backward compatibility)
        var pgConn = config.GetConnectionString("PostgresDb") 
            ?? config.GetValue<string>("PostgreSQL:ConnectionString") 
            ?? throw new InvalidOperationException("PostgreSQL connection string is required in ConnectionStrings:PostgresDb or PostgreSQL:ConnectionString");

        // Register services
        services.AddSingleton(new PlcService(plcIp, plcRack, plcSlot));
        services.AddSingleton<DatabaseService>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<DatabaseService>>();
            return new DatabaseService(pgConn, logger);
        });

        services.AddHostedService<GatewayWorker>();
    })
    .ConfigureLogging(logging =>
    {
        logging.ClearProviders();
        logging.AddConsole();
    })
    .UseWindowsService()   // <-- support Windows Service (run on boot)
    .Build();

await host.RunAsync();
