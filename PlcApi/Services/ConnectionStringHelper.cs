namespace PlcApi.Services;

/// <summary>
/// Helper class to build PostgreSQL connection strings with special character handling
/// </summary>
public static class ConnectionStringHelper
{
    /// <summary>
    /// Builds a PostgreSQL connection string, handling special characters in password
    /// </summary>
    public static string BuildConnectionString(string host, int port, string database, string username, string password)
    {
        // Escape special characters in password for Npgsql connection string
        // Npgsql handles most special characters, but @ needs special attention
        var escapedPassword = EscapePassword(password);
        
        return $"Host={host};Port={port};Database={database};Username={username};Password={escapedPassword}";
    }
    
    private static string EscapePassword(string password)
    {
        // For Npgsql, if password contains semicolons or special chars, wrap in quotes
        // However, @ character should work as-is in most cases
        // If it doesn't work, we can URL-encode it
        
        // Check if password needs escaping
        if (password.Contains(';') || password.Contains(' '))
        {
            // Wrap in quotes and escape quotes
            return "\"" + password.Replace("\"", "\"\"") + "\"";
        }
        
        // Return as-is (Npgsql should handle @ normally)
        return password;
    }
}

