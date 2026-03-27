# PowerShell script to test PostgreSQL connection
# This script tests if the database connection works

$connectionString = "Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006"

Write-Host "Testing PostgreSQL connection..." -ForegroundColor Yellow
Write-Host "Connection String: Host=localhost;Port=5432;Database=plc_data;Username=postgres" -ForegroundColor Gray

try {
    # Try to connect using psql if available
    $env:PGPASSWORD = "sridhar@2006"
    
    $query = "SELECT version();"
    $result = psql -h localhost -p 5432 -U postgres -d plc_data -c $query 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Connection successful!" -ForegroundColor Green
        Write-Host $result
    } else {
        Write-Host "`n✗ Connection failed!" -ForegroundColor Red
        Write-Host $result
        
        Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
        Write-Host "1. Make sure PostgreSQL is running" -ForegroundColor Gray
        Write-Host "2. Verify database 'plc_data' exists" -ForegroundColor Gray
        Write-Host "3. Check username and password" -ForegroundColor Gray
        Write-Host "4. Ensure PostgreSQL allows connections from localhost" -ForegroundColor Gray
    }
} catch {
    Write-Host "`n✗ Error: $_" -ForegroundColor Red
    Write-Host "`nMake sure psql is installed and in your PATH" -ForegroundColor Yellow
}

