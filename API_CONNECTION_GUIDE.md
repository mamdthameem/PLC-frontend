# API Connection Guide - Frontend to Backend

## Overview

This guide explains how the React frontend connects to the .NET Web API backend to fetch real-time PLC data from PostgreSQL.

## Architecture Flow

```
React Frontend (Dashboard)
    ↓ HTTP/HTTPS
.NET Web API (PlcApi)
    ↓ Npgsql Driver
PostgreSQL Database (plc_data)
    ↑ Data Collection
C# Background Service (PLCGateway)
    ↑ Industrial Network
Siemens S7 PLCs
```

## Backend API (C# .NET)

### Setup

1. **Navigate to API project:**
   ```bash
   cd PlcApi
   ```

2. **Run the API:**
   ```bash
   dotnet run
   ```

   API will start at: `http://localhost:5000` (or `https://localhost:5001`)

3. **Verify API is running:**
   - Open: `http://localhost:5000/api/plc/health`
   - Should return: `{"status":"healthy","timestamp":"..."}`

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/plc/latest` | GET | Get latest value for each PLC address |
| `/api/plc/timeseries/{address}` | GET | Get time-series data for specific address |
| `/api/plc/values` | GET | Get all values with pagination |
| `/api/plc/addresses` | GET | Get list of unique addresses |
| `/api/plc/health` | GET | Health check |

### Example API Calls

**Get Latest Values:**
```bash
curl http://localhost:5000/api/plc/latest
```

**Get Time-Series:**
```bash
curl http://localhost:5000/api/plc/timeseries/DB1.DBW0?limit=100
```

**Swagger UI:**
- Open: `http://localhost:5000/swagger`
- Interactive API documentation and testing

## Frontend Configuration

### 1. Set API URL

Create/update `.env` file in `dashboard/` directory:

```env
VITE_API_URL=http://localhost:5000
```

**For production:**
```env
VITE_API_URL=https://api.yourdomain.com
```

### 2. Frontend API Service

The frontend uses `apiService.ts` located in `dashboard/src/services/apiService.ts`

**Usage in components:**
```typescript
import { apiService } from '../services/apiService';

// Get latest values
const data = await apiService.getLatestValues();

// Get time-series
const timeSeries = await apiService.getTimeSeries('DB1.DBW0', 100);
```

### 3. Update Data Service

To use real API data instead of demo data, update `dataService.ts`:

```typescript
import { apiService } from './apiService';

// Replace demo data loading with API calls
async loadFromApi() {
  const apiData = await apiService.getLatestValues();
  // Transform API data to your internal format
}
```

## CORS Configuration

The API is configured to allow requests from:
- `http://localhost:5173` (Vite default)
- `http://localhost:3000` (Alternative)
- `http://localhost:5174` (Alternative port)

To add more origins, update `PlcApi/appsettings.json`:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://yourdomain.com"
    ]
  }
}
```

## Testing the Connection

### 1. Start Backend API

```bash
cd PlcApi
dotnet run
```

**Expected output:**
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: https://localhost:5001
```

### 2. Start Frontend

```bash
cd dashboard
npm run dev
```

**Expected output:**
```
  VITE v7.3.0  ready in 553 ms

  ➜  Local:   http://localhost:5173/
```

### 3. Test API from Browser

Open browser console and run:
```javascript
fetch('http://localhost:5000/api/plc/latest')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 4. Test from Frontend

The frontend will automatically connect when components mount and call API methods.

## Database Connection

### Connection String

The API uses this connection string (configured in `appsettings.json`):

```
Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006
```

### Verify Database

1. **Check if database exists:**
   ```bash
   psql -U postgres -l
   ```

2. **Verify table exists:**
   ```bash
   psql -U postgres -d plc_data -c "\d plc_values"
   ```

3. **Check for data:**
   ```bash
   psql -U postgres -d plc_data -c "SELECT COUNT(*) FROM plc_values;"
   ```

## Troubleshooting

### API Connection Failed

**Error:** `Failed to fetch` or `CORS error`

**Solutions:**
1. ✅ Check API is running: `http://localhost:5000/api/plc/health`
2. ✅ Verify CORS origins in `appsettings.json`
3. ✅ Check browser console for specific error
4. ✅ Verify API URL in `.env` file

### Database Connection Failed

**Error:** `Failed to connect to database`

**Solutions:**
1. ✅ Verify PostgreSQL is running
2. ✅ Check connection string in `appsettings.json`
3. ✅ Verify database `plc_data` exists
4. ✅ Check credentials (username/password)
5. ✅ Ensure `plc_values` table exists

### No Data Returned

**Possible causes:**
1. ✅ Database is empty (no PLC data collected yet)
2. ✅ PLC Gateway service not running
3. ✅ Check API response: `http://localhost:5000/api/plc/latest`

**Solution:** Run the PLC Gateway service to collect data:
```bash
cd ..
dotnet run
```

## Production Deployment

### Backend API

1. **Build for production:**
   ```bash
   dotnet publish -c Release -o ./publish
   ```

2. **Deploy to server:**
   - Copy `publish/` folder to server
   - Configure `appsettings.json` with production connection string
   - Run as Windows Service or Docker container

3. **Configure firewall:**
   - Allow port 5000 (HTTP) or 5001 (HTTPS)
   - Or use reverse proxy (Nginx/IIS)

### Frontend

1. **Build for production:**
   ```bash
   npm run build
   ```

2. **Deploy static files:**
   - Copy `dist/` folder to web server
   - Update `.env.production` with production API URL
   - Configure web server (Nginx/Apache)

### Environment Variables

**Development:**
```env
VITE_API_URL=http://localhost:5000
```

**Production:**
```env
VITE_API_URL=https://api.yourdomain.com
```

## Security Considerations

### Current (Development)
- ✅ CORS enabled for localhost
- ✅ Connection string in appsettings.json
- ⚠️ No authentication (add JWT in production)

### Production Recommendations

1. **Add Authentication:**
   - JWT tokens
   - API keys
   - OAuth2

2. **Use HTTPS:**
   - SSL/TLS certificates
   - Secure connection strings

3. **Environment Variables:**
   - Store connection strings in environment variables
   - Use Azure Key Vault or similar

4. **Rate Limiting:**
   - Prevent API abuse
   - Limit requests per IP

## Next Steps

1. ✅ Test API endpoints
2. ✅ Update frontend to use API
3. ⏭️ Add authentication
4. ⏭️ Add real-time updates (WebSocket)
5. ⏭️ Add error handling and retries
6. ⏭️ Add data caching

## Summary

- **Backend:** `.NET Web API` provides REST endpoints
- **Frontend:** `React` consumes API via `apiService.ts`
- **Database:** `PostgreSQL` stores PLC data
- **Connection:** HTTP/HTTPS with CORS enabled

The system is now ready for real-time data visualization! 🚀

