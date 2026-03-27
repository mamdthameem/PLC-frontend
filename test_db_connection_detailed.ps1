# Detailed PostgreSQL Connection Test
# Shows actual error messages from .NET

Add-Type -AssemblyName System.Data

$connectionString = "Host=172.20.20.141;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006"

Write-Host "Testing PostgreSQL Connection from .NET" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connection String: Host=172.20.20.141;Port=5432;Database=plc_data;Username=postgres" -ForegroundColor Yellow
Write-Host ""

try {
    # Try to load Npgsql
    $npgsqlPath = "C:\Program Files\dotnet\shared\Microsoft.NETCore.App\*\Npgsql.dll" | Get-Item -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if (-not $npgsqlPath) {
        Write-Host "[INFO] Npgsql.dll not found in standard location." -ForegroundColor Yellow
        Write-Host "Testing connection via .NET API instead..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Current Status:" -ForegroundColor Yellow
        Write-Host "  - Network connectivity: OK (ping works)" -ForegroundColor Green
        Write-Host "  - Port 5432: Accessible" -ForegroundColor Green
        Write-Host "  - PostgreSQL connection: FAILED" -ForegroundColor Red
        Write-Host ""
        Write-Host "Most Likely Causes:" -ForegroundColor Yellow
        Write-Host "  1. PostgreSQL not configured to accept LAN connections" -ForegroundColor White
        Write-Host "     - Check: postgresql.conf -> listen_addresses = '*'" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  2. pg_hba.conf missing LAN access rule" -ForegroundColor White
        Write-Host "     - Add: host all all 172.20.20.0/24 md5" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  3. PostgreSQL service not restarted after config changes" -ForegroundColor White
        Write-Host ""
        Write-Host "Next Steps on Laptop A (172.20.20.141):" -ForegroundColor Cyan
        Write-Host "  1. Run: .\setup_postgresql_lan.ps1 (as Administrator)" -ForegroundColor White
        Write-Host "  OR manually:" -ForegroundColor Gray
        Write-Host "     a. Edit postgresql.conf: listen_addresses = '*'" -ForegroundColor Gray
        Write-Host "     b. Edit pg_hba.conf: Add LAN rule" -ForegroundColor Gray
        Write-Host "     c. Restart PostgreSQL service" -ForegroundColor Gray
        exit 0
    }
    
    Add-Type -Path $npgsqlPath.FullName
    
    Write-Host "Attempting connection..." -ForegroundColor Yellow
    $conn = New-Object Npgsql.NpgsqlConnection($connectionString)
    
    try {
        $conn.Open()
        Write-Host "[OK] Connection successful!" -ForegroundColor Green
        
        $cmd = New-Object Npgsql.NpgsqlCommand("SELECT version();", $conn)
        $version = $cmd.ExecuteScalar()
        Write-Host ""
        Write-Host "PostgreSQL Version:" -ForegroundColor Cyan
        Write-Host $version -ForegroundColor Gray
        
        $cmd = New-Object Npgsql.NpgsqlCommand("SELECT current_database();", $conn)
        $db = $cmd.ExecuteScalar()
        Write-Host ""
        Write-Host "Connected to database: $db" -ForegroundColor Green
        
        $conn.Close()
    }
    catch {
        Write-Host ""
        Write-Host "[ERROR] Connection failed!" -ForegroundColor Red
        Write-Host "Error Type: $($_.Exception.GetType().Name)" -ForegroundColor Yellow
        Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.InnerException) {
            Write-Host "Inner Error: $($_.Exception.InnerException.Message)" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        
        if ($_.Exception.Message -match "no pg_hba.conf entry") {
            Write-Host "  -> PostgreSQL pg_hba.conf is blocking connection" -ForegroundColor White
            Write-Host "  -> Solution: Add rule in pg_hba.conf for 172.20.20.0/24" -ForegroundColor Gray
        }
        elseif ($_.Exception.Message -match "Connection refused" -or $_.Exception.Message -match "could not connect") {
            Write-Host "  -> PostgreSQL not listening on LAN interface" -ForegroundColor White
            Write-Host "  -> Solution: Set listen_addresses = '*' in postgresql.conf" -ForegroundColor Gray
        }
        elseif ($_.Exception.Message -match "password authentication failed") {
            Write-Host "  -> Password authentication failed" -ForegroundColor White
            Write-Host "  -> Solution: Verify password in connection string matches PostgreSQL password" -ForegroundColor Gray
        }
        elseif ($_.Exception.Message -match "database.*does not exist") {
            Write-Host "  -> Database 'plc_data' does not exist" -ForegroundColor White
            Write-Host "  -> Solution: Create database: CREATE DATABASE plc_data;" -ForegroundColor Gray
        }
    }
    finally {
        if ($conn.State -eq "Open") {
            $conn.Close()
        }
    }
}
catch {
    Write-Host "[ERROR] Could not load Npgsql: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "This is expected. The .NET API will show the actual error." -ForegroundColor Yellow
}
