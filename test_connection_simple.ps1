# Simple Connection Test - Shows Actual Error
# Run this on Laptop B

$connString = "Host=172.20.20.141;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006"

Write-Host "Testing PostgreSQL Connection..." -ForegroundColor Cyan
Write-Host "Connection String: Host=172.20.20.141;Port=5432;Database=plc_data;Username=postgres" -ForegroundColor Yellow
Write-Host ""

# Check if .NET runtime is available
try {
    Add-Type -TypeDefinition @"
using System;
using System.Data;
public class TestConn {
    public static void Test(string connStr) {
        try {
            var conn = new Npgsql.NpgsqlConnection(connStr);
            conn.Open();
            Console.WriteLine("[OK] Connection successful!");
            var cmd = new Npgsql.NpgsqlCommand("SELECT version();", conn);
            var version = cmd.ExecuteScalar();
            Console.WriteLine("Version: " + version);
            conn.Close();
        } catch (Exception ex) {
            Console.WriteLine("[ERROR] " + ex.GetType().Name);
            Console.WriteLine("Message: " + ex.Message);
            if (ex.InnerException != null) {
                Console.WriteLine("Inner: " + ex.InnerException.Message);
            }
        }
    }
}
"@ -ReferencedAssemblies @(
    "C:\Program Files\dotnet\shared\Microsoft.NETCore.App\*\Npgsql.dll" | 
    Get-Item -ErrorAction SilentlyContinue | 
    Select-Object -First 1 -ExpandProperty FullName
) -ErrorAction Stop
    
    [TestConn]::Test($connString)
}
catch {
    Write-Host "[INFO] Cannot test directly. The .NET API will show the actual error." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common PostgreSQL Connection Errors:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. 'password authentication failed'" -ForegroundColor White
    Write-Host "   -> Password is incorrect" -ForegroundColor Gray
    Write-Host "   -> Solution: Reset password on Laptop A" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. 'no pg_hba.conf entry'" -ForegroundColor White
    Write-Host "   -> pg_hba.conf missing LAN rule" -ForegroundColor Gray
    Write-Host "   -> Solution: Add 172.20.20.0/24 rule (should already be done)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. 'Connection refused' or timeout" -ForegroundColor White
    Write-Host "   -> PostgreSQL not listening or firewall blocking" -ForegroundColor Gray
    Write-Host "   -> Solution: Check postgresql.conf and Windows Firewall" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. 'database does not exist'" -ForegroundColor White
    Write-Host "   -> Database 'plc_data' needs to be created" -ForegroundColor Gray
    Write-Host "   -> Solution: CREATE DATABASE plc_data;" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Check the API console output - it should now show Warning level errors." -ForegroundColor Yellow
}
