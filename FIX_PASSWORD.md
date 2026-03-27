# Fix Password Authentication Error

## Current Error
```
28P01: password authentication failed for user "postgres"
```

## Quick Fix Steps

### Step 1: Verify Your PostgreSQL Password

Test the password manually:

```powershell
# Set PostgreSQL password as environment variable
$env:PGPASSWORD = "sridhar@2006"

# Test connection
psql -U postgres -d plc_data -h localhost -c "SELECT 1;"
```

**If this works:** The password is correct, proceed to Step 3.

**If this fails:** Your password is different - go to Step 2.

### Step 2: Reset PostgreSQL Password (if wrong)

Connect to PostgreSQL (use a different method or existing connection):

```sql
-- Connect as superuser
ALTER USER postgres WITH PASSWORD 'sridhar@2006';
```

Or use pgAdmin or another PostgreSQL client to change the password.

### Step 3: Update Connection String Format

Try one of these formats in `PlcApi/appsettings.json`:

**Option A - Current format (should work):**
```json
{
  "ConnectionStrings": {
    "PostgresDb": "Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006"
  }
}
```

**Option B - Quoted password:**
```json
{
  "ConnectionStrings": {
    "PostgresDb": "Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=\"sridhar@2006\""
  }
}
```

**Option C - Use environment variable (recommended for production):**

1. Set environment variable:
```powershell
$env:DB_PASSWORD = "sridhar@2006"
```

2. Update code to read from environment (see below)

### Step 4: Restart API

1. **Stop the running API** (Press Ctrl+C in the terminal)
2. **Restart:**
```bash
dotnet run
```

## Alternative: Use Environment Variable

Update `PlcApi/Program.cs` to read password from environment:

```csharp
// In Program.cs, before building the app
var password = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "sridhar@2006";
var connString = $"Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password={password}";
```

Then set environment variable before running:
```powershell
$env:DB_PASSWORD = "sridhar@2006"
dotnet run
```

## Testing Connection

After fixing, test the API:

```bash
curl http://localhost:5200/api/plc/health
```

Should return: `{"status":"healthy",...}`

Then test database connection:

```bash
curl http://localhost:5200/api/plc/latest
```

Should return data or empty array `{"values":[],"total":0}` (if database is empty, that's okay - it means connection works!)

## Most Common Issue

**90% of cases:** The PostgreSQL password is actually different from what's in the connection string.

**Solution:** Either:
1. Change PostgreSQL password to match: `ALTER USER postgres WITH PASSWORD 'sridhar@2006';`
2. Update `appsettings.json` with the correct password

## Still Not Working?

1. Check PostgreSQL service is running
2. Check `pg_hba.conf` allows local connections
3. Verify database `plc_data` exists
4. Try connecting with pgAdmin or DBeaver to verify credentials

