# PLC Gateway API

RESTful Web API for accessing PLC data from PostgreSQL database.

## Quick Start

### 1. Configure Connection String

Update `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "PostgresDb": "Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006"
  }
}
```

### 2. Run the API

```bash
dotnet run
```

API starts at:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`
- Swagger: `http://localhost:5000/swagger`

### 3. Test API

**Health Check:**
```bash
curl http://localhost:5000/api/plc/health
```

**Get Latest Values:**
```bash
curl http://localhost:5000/api/plc/latest
```

## API Endpoints

### `GET /api/plc/latest`
Get latest value for each PLC address.

**Response:**
```json
{
  "values": [
    {
      "address": "DB1.DBW0",
      "value": "1500",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### `GET /api/plc/timeseries/{address}?limit=100`
Get time-series data for a specific address.

**Example:**
```
GET /api/plc/timeseries/DB1.DBW0?limit=100
```

**Response:**
```json
[
  {
    "timestamp": "2024-01-15T10:00:00Z",
    "value": "1500"
  },
  {
    "timestamp": "2024-01-15T10:05:00Z",
    "value": "1520"
  }
]
```

### `GET /api/plc/values?page=1&pageSize=50`
Get all values with pagination.

### `GET /api/plc/addresses`
Get list of unique PLC addresses.

### `GET /api/plc/health`
Health check endpoint.

## CORS Configuration

API allows requests from frontend origins configured in `appsettings.json`:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000"
    ]
  }
}
```

## Project Structure

```
PlcApi/
├── Controllers/
│   └── PlcController.cs      # API endpoints
├── Services/
│   └── PlcDataService.cs     # Database access layer
├── Models/
│   └── PlcValueDto.cs        # Data transfer objects
├── Program.cs                # Application setup
└── appsettings.json          # Configuration
```

## Dependencies

- **.NET 8.0** - Framework
- **Npgsql** - PostgreSQL driver
- **Swagger** - API documentation

## Development

**Run in development:**
```bash
dotnet watch run
```

**Run in production:**
```bash
dotnet publish -c Release
cd bin/Release/net8.0/publish
dotnet PlcApi.dll
```

## Next Steps

1. Add authentication (JWT)
2. Add rate limiting
3. Add caching (Redis)
4. Add WebSocket for real-time updates

