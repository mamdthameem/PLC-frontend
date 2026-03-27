# Why Two appsettings.json Files?

## Project Structure

You have **two separate .NET applications**, each serving a different purpose:

```
PLCGateway/
├── appsettings.json          ← Configuration for Background Service
├── Program.cs                ← Background service that collects PLC data
├── GatewayWorker.cs          ← Polls PLCs and writes to database
└── DatabaseService.cs        ← Writes data to PostgreSQL

PlcApi/
├── appsettings.json          ← Configuration for Web API
├── Program.cs                ← REST API server
├── Controllers/              ← API endpoints
└── Services/                 ← Reads from database
```

## Purpose of Each Service

### 1. PLCGateway Service (Background Service)
**Purpose:** Collects real-time data from PLCs and stores it in PostgreSQL

**Configuration (`appsettings.json`):**
- PLC connection settings (IP, Rack, Slot)
- PostgreSQL connection (writes data)
- Scan interval
- Tags to read from PLC

**When it runs:**
- Windows Service (runs in background)
- Continuously polls PLCs
- Writes data to database

**Database:** `plc_data` or `plc_datas` (where data is WRITTEN)

### 2. PlcApi Service (Web API)
**Purpose:** Serves data from PostgreSQL to frontend dashboard

**Configuration (`appsettings.json`):**
- PostgreSQL connection (reads data)
- CORS settings (which frontend URLs allowed)
- JWT settings (authentication)

**When it runs:**
- Web server (listens on port 5200)
- Responds to HTTP requests
- Returns JSON data

**Database:** Same database (`plc_data`) but READS from it

## Data Flow

```
Siemens S7 PLC
    ↓ (S7 Protocol)
PLCGateway Service
    ↓ (Writes)
PostgreSQL Database
    ↓ (Reads)
PlcApi Service
    ↓ (HTTP/JSON)
React Frontend
```

## Configuration Synchronization

**Important:** Both services should use the **SAME database**:

| Service | Database | Purpose |
|---------|----------|---------|
| PLCGateway | `plc_data` | Writes PLC data |
| PlcApi | `plc_data` | Reads PLC data |

## Current Configuration

### PLCGateway/appsettings.json
```json
{
  "ConnectionStrings": {
    "PostgresDb": "Host=localhost;Port=5432;Database=plc_datas;..."
  }
}
```

### PlcApi/appsettings.json  
```json
{
  "ConnectionStrings": {
    "PostgresDb": "Host=localhost;Port=5432;Database=plc_data;..."
  }
}
```

**⚠️ Issue:** Database names don't match! (`plc_datas` vs `plc_data`)

## Recommendation

**Use the same database name in both files:**

```json
"Database=plc_data"  // Use this in BOTH files
```

## Your database.sql File

Your `database.sql` file shows the actual table structure and sample data:

- **Table:** `plc_values` (with `BIGSERIAL` and `TIMESTAMPTZ`)
- **Sample addresses:** `machine_status`, `machine_utility`, `production_quantity`, etc.
- **Database:** Not specified in SQL (but should be `plc_data`)

**Action:** Make sure both services point to the database where you ran this SQL script.
