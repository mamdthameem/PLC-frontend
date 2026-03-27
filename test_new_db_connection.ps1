# Test PostgreSQL Connection to New Database Server
# Database Server: 192.168.0.200
# Backend Server: 192.168.0.201

$dbHost = "192.168.0.200"
$dbPort = 5432
$database = "sreesakthi_gateway"
$username = "postgres"
$password = "Pass"

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Testing PostgreSQL Connection" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database Server: ${dbHost}:${dbPort}" -ForegroundColor Yellow
Write-Host "Database: $database" -ForegroundColor Yellow
Write-Host "Username: $username" -ForegroundColor Yellow
Write-Host ""

# Test 1: Ping database server
Write-Host "[1/4] Testing network connectivity..." -ForegroundColor Cyan
$pingResult = Test-Connection -ComputerName $dbHost -Count 2 -Quiet
if ($pingResult) {
    Write-Host "   [OK] Can ping $dbHost" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Cannot ping $dbHost" -ForegroundColor Red
    Write-Host "   -> Check network connection and firewall" -ForegroundColor Gray
    exit 1
}

# Test 2: Check if PostgreSQL port is open
Write-Host "[2/4] Testing PostgreSQL port..." -ForegroundColor Cyan
$portTest = Test-NetConnection -ComputerName $dbHost -Port $dbPort -WarningAction SilentlyContinue
if ($portTest.TcpTestSucceeded) {
    Write-Host "   [OK] Port $dbPort is open on $dbHost" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Port $dbPort is not accessible" -ForegroundColor Red
    Write-Host "   -> Check PostgreSQL is running and firewall allows port $dbPort" -ForegroundColor Gray
    exit 1
}

# Test 3: Test database connection using psql (if available)
Write-Host "[3/4] Testing database connection..." -ForegroundColor Cyan
$env:PGPASSWORD = $password
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    try {
        $result = & psql -h $dbHost -p $dbPort -U $username -d $database -c "SELECT version();" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] Database connection successful!" -ForegroundColor Green
            Write-Host "   PostgreSQL Version:" -ForegroundColor Gray
            $result | Select-String "PostgreSQL" | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
        } else {
            Write-Host "   [ERROR] Database connection failed" -ForegroundColor Red
            Write-Host "   Error: $result" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "   [WARNING] psql command failed: $_" -ForegroundColor Yellow
        Write-Host "   -> Install PostgreSQL client tools or test manually" -ForegroundColor Gray
    }
} else {
    Write-Host "   [INFO] psql not found - skipping direct DB test" -ForegroundColor Yellow
    Write-Host "   -> Install PostgreSQL client or test from API" -ForegroundColor Gray
}

# Test 4: Check if plc_value table exists
Write-Host "[4/4] Checking database table..." -ForegroundColor Cyan
if ($psqlPath) {
    try {
        $tableCheck = & psql -h $dbHost -p $dbPort -U $username -d $database -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'plc_value';" -t 2>&1
        if ($LASTEXITCODE -eq 0) {
            $tableExists = ($tableCheck -match '\d+') -and ([int]($tableCheck -replace '\D','')) -gt 0
            if ($tableExists) {
                Write-Host "   [OK] Table 'plc_value' exists" -ForegroundColor Green
            } else {
                Write-Host "   [WARNING] Table 'plc_value' does not exist" -ForegroundColor Yellow
                Write-Host "   -> Run setup_database_with_data.sql to create the table" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "   [INFO] Could not check table (psql error)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [INFO] Skipping table check (psql not available)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Connection Test Complete" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Ensure PostgreSQL on $dbHost allows connections from 192.168.0.0/24" -ForegroundColor White
Write-Host "2. Update pg_hba.conf: host all all 192.168.0.0/24 md5" -ForegroundColor White
Write-Host "3. Restart PostgreSQL service" -ForegroundColor White
Write-Host "4. Restart API server to use new connection" -ForegroundColor White
Write-Host ""
