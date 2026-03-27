using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;
using PlcApi.Services;
using PlcApi.Hubs;
using PlcApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Master Database Context
builder.Services.AddDbContext<MasterDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgresDb")));

// Register Multi-Tenancy Services
builder.Services.AddScoped<TenantContext>();
builder.Services.AddScoped<ITenantConnectionFactory, TenantConnectionFactory>();

// Register SignalR
builder.Services.AddSignalR();

// Register database service
builder.Services.AddSingleton<IDbConnectionState, DbConnectionState>();
builder.Services.AddScoped<IPlcDataService, PlcDataService>();

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "YourSuperSecretKeyWithAtLeast32Chars!!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Register background worker for real-time updates
builder.Services.AddHostedService<PlcDataWorker>();

// Configure CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:5173", "http://localhost:5174" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Ensure master auth tables exist + default users
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MasterDbContext>();
    db.Database.EnsureCreated();

    if (!db.Users.Any())
    {
        db.Users.AddRange(
            new User
            {
                Username = "admin",
                Email = "admin@plc.local",
                FullName = "System Admin",
                PasswordHash = PasswordHasher.Hash("admin123"),
                Role = "admin",
                TenantId = "all",
                SubscriptionStatus = "active",
                IsApproved = true,
                CreatedAtUtc = DateTime.UtcNow
            },
            new User
            {
                Username = "user1",
                Email = "user1@plc.local",
                FullName = "Default User",
                PasswordHash = PasswordHasher.Hash("user123"),
                Role = "user",
                TenantId = "customer-1",
                SubscriptionStatus = "active",
                IsApproved = true,
                ValidUntilUtc = DateTime.UtcNow.AddDays(30),
                CreatedAtUtc = DateTime.UtcNow
            }
        );
        db.SaveChanges();
    }
}

// --- Database Connection Test (Non-blocking) ---
_ = Task.Run(async () =>
{
    // Wait a bit for app to fully initialize
    await Task.Delay(2000);
    
    using (var scope = app.Services.CreateScope())
    {
        var plcDataService = scope.ServiceProvider.GetRequiredService<IPlcDataService>();
        var connectionState = scope.ServiceProvider.GetRequiredService<IDbConnectionState>();
        int maxRetries = 3;
        int delayMs = 1000;

        Console.WriteLine("🔍 Checking database connection in background...");

        for (int i = 1; i <= maxRetries; i++)
        {
            try
            {
                if (await plcDataService.CheckConnectionAsync())
                {
                    Console.WriteLine("✅ PostgreSQL connected over LAN!");
                    break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Database connection attempt {i} failed: {ex.Message}");
            }

            if (i < maxRetries)
            {
                await Task.Delay(delayMs);
            }
        }

        if (!connectionState.HasEverConnected)
        {
            Console.WriteLine("⚠️ Database connection not available. Using mock data fallback.");
            Console.WriteLine("⚠️ API will continue to work - database connection will be retried in background.");
        }
    }
});
// --------------------------------

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

// Custom Multi-Tenancy Middleware
app.UseMiddleware<PlcApi.Middleware.TenantMiddleware>();

app.MapControllers();
app.MapHub<PlcHub>("/plchub");

// Root endpoint
app.MapGet("/", () => new { 
    message = "PLC Gateway API", 
    version = "1.0.0",
    endpoints = new[] 
    {
        "/api/plc/latest",
        "/api/plc/timeseries/{address}",
        "/api/plc/values",
        "/api/plc/addresses",
        "/api/plc/health"
    }
});

app.Run();
