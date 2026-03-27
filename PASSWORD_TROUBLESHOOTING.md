# Password Authentication Troubleshooting

## Issue
Password authentication failed for user "postgres" - Error code: 28P01

## Solutions

### Solution 1: Verify PostgreSQL Password

The connection string uses: `sridhar@2006`

**Test the password manually:**
```bash
# Test connection with password
psql -U postgres -d plc_data -h localhost
# Enter password when prompted: sridhar@2006
```

If this fails, your PostgreSQL password is different.

### Solution 2: Update PostgreSQL Password (if wrong)

```sql
-- Connect as postgres superuser and change password
ALTER USER postgres WITH PASSWORD 'sridhar@2006';
```

### Solution 3: Use Connection String with Quoted Password

Update `PlcApi/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "PostgresDb": "Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=\"sridhar@2006\""
  }
}
```

### Solution 4: Use Environment Variable (More Secure)

**Set environment variable:**
```powershell
$env:DB_PASSWORD = "sridhar@2006"
```

**Update appsettings.json:**
```json
{
  "ConnectionStrings": {
    "PostgresDb": "Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=${DB_PASSWORD}"
  }
}
```

### Solution 5: Test Connection String Format

Try different formats:

**Format 1 (Current):**
```
Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006
```

**Format 2 (Quoted):**
```
Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password="sridhar@2006"
```

**Format 3 (URL-encoded @):**
```
Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar%402006
```

### Solution 6: Use PostgreSQL URI Format

If you have a PostgreSQL URI: `postgresql://postgres:sridhar@2006@localhost:5432/plc_data`

Convert it to Npgsql format:
```
Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006
```

**Note:** The `@` in the URI is a separator, not part of the password. The actual password is `sridhar@2006`.

## Quick Test

Create a simple test file `test_connection.cs`:

```csharp
using Npgsql;

var connString = "Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006";

try {
    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();
    Console.WriteLine("✓ Connection successful!");
} catch (Exception ex) {
    Console.WriteLine($"✗ Connection failed: {ex.Message}");
}
```

Run: `dotnet run test_connection.cs`

## Most Likely Cause

The password in PostgreSQL is **different** from `sridhar@2006`.

**To find your actual password:**
1. Check your PostgreSQL installation notes
2. Check if you set it during installation
3. Try to reset it (see Solution 2)

## After Fixing

1. Stop the API (Ctrl+C in the terminal where it's running)
2. Update `appsettings.json` with correct password
3. Restart: `dotnet run`

