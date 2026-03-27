# PowerShell script to configure PostgreSQL for LAN access
# Run this script on Laptop A (Database Server - 172.20.20.141)
# Run as Administrator

Write-Host "🔧 PostgreSQL LAN Configuration Script" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Find PostgreSQL installation
$pgPaths = @(
    "C:\Program Files\PostgreSQL\*\data",
    "C:\Program Files (x86)\PostgreSQL\*\data"
)

$pgDataPath = $null
foreach ($path in $pgPaths) {
    $resolved = Resolve-Path $path -ErrorAction SilentlyContinue
    if ($resolved) {
        $pgDataPath = $resolved[0].Path
        break
    }
}

if (-not $pgDataPath) {
    Write-Host "❌ PostgreSQL data directory not found!" -ForegroundColor Red
    Write-Host "Please specify PostgreSQL data directory path:" -ForegroundColor Yellow
    $pgDataPath = Read-Host "Enter path"
}

Write-Host "📁 PostgreSQL Data Path: $pgDataPath" -ForegroundColor Green

# 1. Configure postgresql.conf
Write-Host "`n1️⃣  Configuring postgresql.conf..." -ForegroundColor Yellow
$pgConfPath = Join-Path $pgDataPath "postgresql.conf"

if (Test-Path $pgConfPath) {
    $content = Get-Content $pgConfPath -Raw
    
    # Update listen_addresses
    if ($content -match "listen_addresses\s*=") {
        $content = $content -replace "listen_addresses\s*=\s*['\`"].*?['\`"]", "listen_addresses = '*'"
        Write-Host "   ✅ Updated listen_addresses = '*'" -ForegroundColor Green
    } else {
        # Add if not exists
        $content += "`n# LAN Configuration`nlisten_addresses = '*'`n"
        Write-Host "   ✅ Added listen_addresses = '*'" -ForegroundColor Green
    }
    
    # Uncomment if commented
    $content = $content -replace "#\s*listen_addresses\s*=", "listen_addresses ="
    $content = $content -replace "#listen_addresses\s*=", "listen_addresses ="
    
    Set-Content -Path $pgConfPath -Value $content -NoNewline
    Write-Host "   ✅ postgresql.conf updated" -ForegroundColor Green
} else {
    Write-Host "   ❌ postgresql.conf not found at $pgConfPath" -ForegroundColor Red
}

# 2. Configure pg_hba.conf
Write-Host "`n2️⃣  Configuring pg_hba.conf..." -ForegroundColor Yellow
$pgHbaPath = Join-Path $pgDataPath "pg_hba.conf"

if (Test-Path $pgHbaPath) {
    $hbaContent = Get-Content $pgHbaPath
    
    # Check if LAN rule already exists
    $hasLanRule = $hbaContent | Select-String -Pattern "172\.20\.20\.0/24"
    
    if (-not $hasLanRule) {
        # Add LAN access rule at the beginning (after header comments)
        $newRule = "# LAN Access - Allow connections from 172.20.20.0/24 subnet`nhost`tall`tall`t172.20.20.0/24`tmd5`n"
        
        # Find first non-comment, non-blank line
        $insertIndex = 0
        for ($i = 0; $i -lt $hbaContent.Length; $i++) {
            $line = $hbaContent[$i].Trim()
            if ($line -and -not $line.StartsWith('#')) {
                $insertIndex = $i
                break
            }
        }
        
        $hbaContent = $hbaContent[0..($insertIndex-1)] + $newRule.Split("`n") + $hbaContent[$insertIndex..($hbaContent.Length-1)]
        Set-Content -Path $pgHbaPath -Value $hbaContent
        Write-Host "   ✅ Added LAN access rule (172.20.20.0/24)" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  LAN access rule already exists" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ❌ pg_hba.conf not found at $pgHbaPath" -ForegroundColor Red
}

# 3. Configure Windows Firewall
Write-Host "`n3️⃣  Configuring Windows Firewall..." -ForegroundColor Yellow

try {
    $rule = Get-NetFirewallRule -DisplayName "PostgreSQL Server" -ErrorAction SilentlyContinue
    
    if (-not $rule) {
        New-NetFirewallRule `
            -DisplayName "PostgreSQL Server" `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 5432 `
            -Action Allow `
            -Description "Allow PostgreSQL connections from LAN" | Out-Null
        Write-Host "   ✅ Created firewall rule for port 5432" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  Firewall rule already exists" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ⚠️  Failed to configure firewall: $_" -ForegroundColor Yellow
    Write-Host "   Please configure manually: Allow TCP port 5432" -ForegroundColor Yellow
}

# 4. Restart PostgreSQL Service
Write-Host "`n4️⃣  Restarting PostgreSQL Service..." -ForegroundColor Yellow

$pgServices = Get-Service | Where-Object { $_.Name -like "postgresql*" }

if ($pgServices) {
    foreach ($service in $pgServices) {
        Write-Host "   Restarting $($service.Name)..." -ForegroundColor Cyan
        Restart-Service -Name $service.Name -Force
        Write-Host "   ✅ $($service.Name) restarted" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  PostgreSQL service not found. Please restart manually." -ForegroundColor Yellow
}

# 5. Verify Configuration
Write-Host "`n5️⃣  Verifying Configuration..." -ForegroundColor Yellow

# Check if listening on port 5432
$listening = netstat -an | Select-String "5432" | Select-String "LISTENING"
if ($listening) {
    Write-Host "   ✅ PostgreSQL is listening on port 5432" -ForegroundColor Green
    Write-Host "   Listening addresses:" -ForegroundColor Cyan
    $listening | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
} else {
    Write-Host "   ⚠️  Could not verify if PostgreSQL is listening" -ForegroundColor Yellow
}

Write-Host "`n✅ Configuration Complete!" -ForegroundColor Green
Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Test connection from Laptop B: psql -h 172.20.20.141 -U postgres -d plc_data" -ForegroundColor White
Write-Host "   2. Verify database exists: CREATE DATABASE plc_data;" -ForegroundColor White
Write-Host "   3. Run setup script: psql -h 172.20.20.141 -U postgres -d plc_data -f setup_database.sql" -ForegroundColor White
