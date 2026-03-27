using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using PlcApi.Models;
using PlcApi.Services;

namespace PlcApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;
    private readonly MasterDbContext _dbContext;

    public AuthController(IConfiguration config, ILogger<AuthController> logger, MasterDbContext dbContext)
    {
        _config = config;
        _logger = logger;
        _dbContext = dbContext;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var loginId = request.Username?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(loginId) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }

        var user = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u =>
                u.Username.ToLower() == loginId || u.Email.ToLower() == loginId);

        if (user is null)
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }

        if (!PasswordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }

        if (!user.IsApproved)
        {
            return Unauthorized(new { message = "User is not approved for access" });
        }

        if (user.ValidUntilUtc.HasValue && DateTime.UtcNow > user.ValidUntilUtc.Value)
        {
            return Unauthorized(new { message = "User access has expired" });
        }

        if (string.Equals(user.SubscriptionStatus, "expired", StringComparison.OrdinalIgnoreCase))
        {
            return Unauthorized(new { message = "Subscription has expired" });
        }

        var token = GenerateJwtToken(
            user.Username,
            user.Role,
            user.TenantId ?? "customer-1",
            user.SubscriptionStatus,
            user.Id.ToString()
        );

        return Ok(new { token });
    }

    private string GenerateJwtToken(string username, string role, string tenantId, string subStatus, string userId)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "YourSuperSecretKeyWithAtLeast32Chars!!"));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Role, role),
            new Claim("tenant_id", tenantId),
            new Claim("subscription_status", subStatus),
            new Claim(JwtRegisteredClaimNames.Jti, userId)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddHours(8),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
