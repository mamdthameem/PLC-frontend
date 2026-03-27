# Test PostgreSQL LAN Connection
# Run this script on Laptop B (Application Server - 172.20.20.142)

$dbHost = "172.20.20.141"
$dbPort = 5432
$dbName = "plc_data"
$dbUser = "postgres"
$dbPassword = "sridhar@2006"

Write-Host "Testing PostgreSQL LAN Connection" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target: ${dbHost}:${dbPort}" -ForegroundColor Yellow
Write-Host "Database: $dbName" -ForegroundColor Yellow
Write-Host "User: $dbUser" -ForegroundColor Yellow
Write-Host ""

# Test 1: Network Connectivity
Write-Host "1. Testing Network Connectivity..." -ForegroundColor Yellow
try {
    $pingResult = Test-Connection -ComputerName $dbHost -Count 2 -ErrorAction Stop
    $avgTime = ($pingResult.ResponseTime | Measure-Object -Average).Average
    Write-Host "   [OK] Ping successful - Average: $([math]::Round($avgTime, 2))ms" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Ping failed: $_" -ForegroundColor Red
    Write-Host "   [WARNING] Check network connectivity and firewall" -ForegroundColor Yellow
    exit 1
}

# Test 2: Port Connectivity
Write-Host ""
Write-Host "2. Testing Port Connectivity..." -ForegroundColor Yellow
try {
    $portTest = Test-NetConnection -ComputerName $dbHost -Port $dbPort -WarningAction SilentlyContinue
    if ($portTest.TcpTestSucceeded) {
        Write-Host "   [OK] Port $dbPort is accessible" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Port $dbPort is not accessible" -ForegroundColor Red
        Write-Host "   [WARNING] Check PostgreSQL service and Windows Firewall on Laptop A" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   [ERROR] Port test failed: $_" -ForegroundColor Red
    exit 1
}

# Test 3: PostgreSQL Connection (if psql is available)
Write-Host ""
Write-Host "3. Testing PostgreSQL Connection..." -ForegroundColor Yellow

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlPath) {
    $env:PGPASSWORD = $dbPassword
    try {
        $query = "SELECT version();"
        $result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $query 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   [OK] PostgreSQL connection successful!" -ForegroundColor Green
            Write-Host "   Database Version:" -ForegroundColor Cyan
            $result | Where-Object { $_ -match "PostgreSQL" } | ForEach-Object {
                Write-Host "      $_" -ForegroundColor Gray
            }
        } else {
            Write-Host "   [ERROR] PostgreSQL connection failed!" -ForegroundColor Red
            Write-Host "   Error output:" -ForegroundColor Yellow
            $result | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
            exit 1
        }
    } catch {
        Write-Host "   [ERROR] Connection test error: $_" -ForegroundColor Red
        exit 1
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "   [INFO] psql not found. Skipping direct connection test." -ForegroundColor Cyan
    Write-Host "   [WARNING] Install PostgreSQL client tools or test from .NET application" -ForegroundColor Yellow
}

# Test 4: Check Database Exists
Write-Host ""
Write-Host "4. Checking Database..." -ForegroundColor Yellow
if ($psqlPath) {
    $env:PGPASSWORD = $dbPassword
    try {
        $checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = '$dbName';"
        $checkDb = psql -h $dbHost -p $dbPort -U $dbUser -d postgres -c $checkDbQuery -t 2>&1
        
        if ($checkDb -match "1") {
            Write-Host "   [OK] Database '$dbName' exists" -ForegroundColor Green
        } else {
            Write-Host "   [WARNING] Database '$dbName' does not exist" -ForegroundColor Yellow
            Write-Host "   Create it with: CREATE DATABASE plc_data;" -ForegroundColor Cyan
        }
        
        # Check table
        $checkTableQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'plc_values';"
        $checkTable = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $checkTableQuery -t 2>&1
        
        if ($checkTable -match "1") {
            Write-Host "   [OK] Table 'plc_values' exists" -ForegroundColor Green
            
            # Count records
            $countQuery = "SELECT COUNT(*) FROM plc_values;"
            $countResult = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $countQuery -t 2>&1
            $countMatch = $countResult | Where-Object { $_ -match "\d+" } | Select-Object -First 1
            if ($countMatch) {
                $count = $countMatch.Trim()
                Write-Host "   Records in table: $count" -ForegroundColor Cyan
            }
        } else {
            Write-Host "   [WARNING] Table 'plc_values' does not exist" -ForegroundColor Yellow
            Write-Host "   Run: psql -h $dbHost -U $dbUser -d $dbName -f setup_database.sql" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "   [WARNING] Could not check database: $_" -ForegroundColor Yellow
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "   [INFO] Skipping database check (psql not available)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[OK] Connection Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   Network: Checked" -ForegroundColor Green
Write-Host "   Port: Checked" -ForegroundColor Green
Write-Host "   Database: Verify manually or from application" -ForegroundColor Cyan
