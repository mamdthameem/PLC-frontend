# Diagnose Database Connection Issues
# This script helps identify why the connection to 192.168.0.200:5432 is failing

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Database Connection Diagnostics" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$dbHost = "192.168.0.200"
$dbPort = 5432

# Check 1: Network adapter priority
Write-Host "[1] Checking network adapters..." -ForegroundColor Yellow
Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {
    $ip = (Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue).IPAddress
    Write-Host "   $($_.Name): $ip (Metric: $((Get-NetIPInterface -InterfaceIndex $_.ifIndex -AddressFamily IPv4).InterfaceMetric))" -ForegroundColor Gray
}

# Check 2: Routing to database server
Write-Host "`n[2] Checking route to $dbHost..." -ForegroundColor Yellow
$route = Get-NetRoute -DestinationAddress $dbHost -ErrorAction SilentlyContinue
if ($route) {
    Write-Host "   Route found via interface: $($route.InterfaceAlias)" -ForegroundColor Green
} else {
    Write-Host "   No specific route found (using default)" -ForegroundColor Yellow
}

# Check 3: ICMP Ping (may be blocked)
Write-Host "`n[3] Testing ICMP ping to $dbHost..." -ForegroundColor Yellow
$ping = Test-Connection -ComputerName $dbHost -Count 2 -Quiet
if ($ping) {
    Write-Host "   [OK] Ping successful" -ForegroundColor Green
} else {
    Write-Host "   [INFO] Ping failed (may be blocked by firewall - this is OK)" -ForegroundColor Yellow
}

# Check 4: TCP Port Test
Write-Host "`n[4] Testing PostgreSQL port $dbPort..." -ForegroundColor Yellow
$tcpTest = Test-NetConnection -ComputerName $dbHost -Port $dbPort -WarningAction SilentlyContinue
if ($tcpTest.TcpTestSucceeded) {
    Write-Host "   [OK] Port $dbPort is OPEN and accessible!" -ForegroundColor Green
    Write-Host "   PostgreSQL server is reachable!" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Port $dbPort is CLOSED or not accessible" -ForegroundColor Red
    Write-Host "   This is the main issue preventing connection." -ForegroundColor Red
}

# Check 5: ARP table (check if MAC address is known)
Write-Host "`n[5] Checking ARP table..." -ForegroundColor Yellow
$arp = Get-NetNeighbor -IPAddress $dbHost -ErrorAction SilentlyContinue
if ($arp) {
    Write-Host "   MAC Address: $($arp.LinkLayerAddress) (State: $($arp.State))" -ForegroundColor Green
} else {
    Write-Host "   No ARP entry found (device may be offline or unreachable)" -ForegroundColor Yellow
}

Write-Host "`n=================================" -ForegroundColor Cyan
Write-Host "Troubleshooting Recommendations" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

if (-not $tcpTest.TcpTestSucceeded) {
    Write-Host "Port $dbPort is not accessible. Check on DATABASE SERVER (192.168.0.200):" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. PostgreSQL Service Status:" -ForegroundColor White
    Write-Host "   - Open Services (services.msc)" -ForegroundColor Gray
    Write-Host "   - Check 'postgresql-x64-XX' service is Running" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. PostgreSQL Configuration:" -ForegroundColor White
    Write-Host "   - Edit postgresql.conf: listen_addresses = '0.0.0.0'" -ForegroundColor Gray
    Write-Host "   - Edit pg_hba.conf: Add line 'host all all 192.168.0.0/24 md5'" -ForegroundColor Gray
    Write-Host "   - Restart PostgreSQL service after changes" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Windows Firewall:" -ForegroundColor White
    Write-Host "   Run as Administrator:" -ForegroundColor Gray
    Write-Host "   New-NetFirewallRule -DisplayName 'PostgreSQL' -Direction Inbound -LocalPort $dbPort -Protocol TCP -Action Allow" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Verify PostgreSQL is listening:" -ForegroundColor White
    Write-Host "   netstat -an | findstr :5432" -ForegroundColor Gray
    Write-Host "   Should show: 0.0.0.0:5432 or :::5432" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "5. Network Connectivity:" -ForegroundColor White
Write-Host "   - Ensure both servers are on the same LAN (192.168.0.x)" -ForegroundColor Gray
Write-Host "   - Check Ethernet cable is connected" -ForegroundColor Gray
Write-Host "   - Try disabling Wi-Fi temporarily to force Ethernet routing" -ForegroundColor Gray
Write-Host ""

Write-Host "After fixing issues, run this script again to verify." -ForegroundColor Green
