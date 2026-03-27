using System.Security.Claims;
using PlcApi.Models;

namespace PlcApi.Middleware;

public class TenantMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantMiddleware> _logger;

    public TenantMiddleware(RequestDelegate next, ILogger<TenantMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, TenantContext tenantContext)
    {
        var user = context.User;
        if (user.Identity?.IsAuthenticated == true)
        {
            tenantContext.TenantId = user.FindFirst("tenant_id")?.Value;
            tenantContext.Role = user.FindFirst(ClaimTypes.Role)?.Value;
            tenantContext.SubscriptionStatus = user.FindFirst("subscription_status")?.Value;

            _logger.LogInformation("Request for Tenant: {TenantId}, Role: {Role}, Subscription: {Status}", 
                tenantContext.TenantId, tenantContext.Role, tenantContext.SubscriptionStatus);

            if (tenantContext.SubscriptionStatus != "active" && tenantContext.Role != "Admin")
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { message = "Subscription inactive or expired." });
                return;
            }
        }

        await _next(context);
    }
}
