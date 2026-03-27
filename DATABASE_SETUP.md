# Database Setup Guide

## Connection Configuration

The PLC Gateway is configured to connect to PostgreSQL database with the following settings:

```
Database: plc_data
Host: localhost
Port: 5432
Username: postgres
Password: sridhar@2006
```

## Setup Steps

### 1. Create Database (if it doesn't exist)

Connect to PostgreSQL as superuser and run:

```sql
CREATE DATABASE plc_data;
```

### 2. Create Required Tables

Run the setup script:

```bash
psql -h localhost -U postgres -d plc_data -f setup_database.sql
```

Or manually run the SQL in `setup_database.sql`.

### 3. Verify Connection

Test the connection using PowerShell:

```powershell
.\test_connection.ps1
```

Or manually test:

```bash
psql -h localhost -p 5432 -U postgres -d plc_data
```

### 4. Update Configuration

The connection string is already configured in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "PostgresDb": "Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006"
  }
}
```

## Table Structure

### plc_values Table

Stores all PLC parameter values with timestamps:

```sql
CREATE TABLE plc_values (
    id SERIAL PRIMARY KEY,
    address VARCHAR(255) NOT NULL,      -- PLC tag address (e.g., "DB1.DBW0")
    value TEXT,                          -- Parameter value
    direction VARCHAR(50) NOT NULL,      -- "Read" or "Write"
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Indexes

- `idx_plc_values_address` - Fast lookups by PLC address
- `idx_plc_values_timestamp` - Time-based queries
- `idx_plc_values_address_timestamp` - Composite index for filtered time-series queries

## Testing the Connection

### From C# Application

When you run the PLC Gateway service, it will automatically:
1. Connect to the database on startup
2. Retry with exponential backoff if connection fails
3. Log connection status to console

### Manual Test Query

```sql
-- Test insert
INSERT INTO plc_values (address, value, direction) 
VALUES ('DB1.DBW0', '1500', 'Read');

-- Verify
SELECT * FROM plc_values ORDER BY timestamp DESC LIMIT 10;
```

## Troubleshooting

### Connection Failed

1. **Check PostgreSQL is running:**
   ```bash
   # Windows
   Get-Service -Name postgresql*

   # Start if stopped
   Start-Service postgresql-x64-XX
   ```

2. **Verify database exists:**
   ```sql
   \l  -- List all databases in psql
   ```

3. **Check credentials:**
   - Verify username: `postgres`
   - Verify password: `sridhar@2006`
   - Verify database: `plc_data`

4. **Check pg_hba.conf:**
   - Ensure local connections are allowed
   - Should have: `host all all 127.0.0.1/32 md5`

### Table Not Found

Run the setup script:
```bash
psql -h localhost -U postgres -d plc_data -f setup_database.sql
```

### Permission Issues

Grant necessary permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE plc_data TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

## Connection String Format

The connection string follows this format:
```
Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006
```

**Note:** Special characters in passwords (like `@`) should work as-is in connection strings, but if you encounter issues, you may need to URL-encode them or use quotes.

## Production Recommendations

For production environments:

1. **Use environment variables** for sensitive data:
   ```json
   "ConnectionString": "${DB_CONNECTION_STRING}"
   ```

2. **Use connection pooling:**
   - Npgsql automatically pools connections
   - Configure max pool size if needed

3. **Enable SSL/TLS:**
   ```
   Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=***;SSL Mode=Require
   ```

4. **Monitor connection health:**
   - Check logs for connection failures
   - Set up database monitoring

