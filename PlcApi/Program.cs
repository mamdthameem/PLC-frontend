using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;
using PlcApi.Services;
using PlcApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Auth database (users table only)
builder.Services.AddDbContext<MasterDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgresDb")));

// JWT Authentication
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

// Data services — thin DB proxy, no business logic
builder.Services.AddScoped<ILifetimeService, LifetimeService>();
builder.Services.AddScoped<IFilterService, FilterService>();
builder.Services.AddScoped<IShotsBreakdownService, ShotsBreakdownService>();
builder.Services.AddScoped<IAmpsService, AmpsService>();
builder.Services.AddScoped<ISpareStatusService, SpareStatusService>();
builder.Services.AddScoped<IMachineStatusService, MachineStatusService>();
builder.Services.AddScoped<IHistoricalService, HistoricalService>();
builder.Services.AddScoped<ICyclesService, CyclesService>();

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials());
});

var app = builder.Build();

// Seed default users on first run
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

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/", () => new
{
    message = "PLC Gateway API",
    version = "2.0.0",
    endpoints = new[]
    {
        "POST /api/auth/login",
        "GET  /api/lifetime",
        "GET  /api/shotsbreakdown",
        "GET  /api/amps",
        "GET  /api/sparestatus",
        "GET  /api/sparestatus/alerts",
        "POST /api/filter",
        "GET  /api/filter/{id}/status",
        "GET  /api/filter/{id}/results",
        "GET  /api/filter/{id}/cycles",
        "GET  /api/filter/{id}/shots"
    }
});

app.Run();
