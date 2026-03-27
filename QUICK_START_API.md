# Quick Start - API Connection

## 🚀 Connect Frontend to PostgreSQL via API

### Step 1: Start PostgreSQL Database

Make sure PostgreSQL is running and database `plc_data` exists:

```bash
psql -U postgres -d plc_data -f setup_database.sql
```

### Step 2: Start Backend API

```bash
cd PlcApi
dotnet run
```

**Expected output:**
```
info: Now listening on: http://localhost:5200
info: Now listening on: https://localhost:7193
```

**Verify API is running:**
- Open: http://localhost:5200/api/plc/health
- Should return: `{"status":"healthy",...}`

**Swagger UI:**
- Open: http://localhost:5200/swagger
- Test all endpoints interactively

### Step 3: Start Frontend

```bash
cd dashboard
npm run dev
```

**Frontend will start at:** http://localhost:5173

### Step 4: Verify Connection

Open browser console (F12) and test:

```javascript
fetch('http://localhost:5200/api/plc/latest')
  .then(res => res.json())
  .then(data => console.log('API Response:', data));
```

## 📊 API Endpoints Available

| Endpoint | Description | Example |
|----------|-------------|---------|
| `GET /api/plc/latest` | Latest values for all addresses | `http://localhost:5200/api/plc/latest` |
| `GET /api/plc/timeseries/{address}` | Historical data for address | `/api/plc/timeseries/DB1.DBW0` |
| `GET /api/plc/addresses` | List of all addresses | `/api/plc/addresses` |
| `GET /api/plc/health` | Health check | `/api/plc/health` |

## 🔧 Configuration

### Backend (PlcApi/appsettings.json)
```json
{
  "ConnectionStrings": {
    "PostgresDb": "Host=localhost;Port=5432;Database=plc_data;Username=postgres;Password=sridhar@2006"
  }
}
```

### Frontend (dashboard/.env)
```env
VITE_API_URL=http://localhost:5200
```

## ✅ Success Indicators

1. ✅ API responds to `/api/plc/health`
2. ✅ Swagger UI loads at `/swagger`
3. ✅ Frontend can fetch data (check browser network tab)
4. ✅ No CORS errors in browser console

## 🐛 Troubleshooting

**API won't start:**
- Check if port 5200 is available
- Verify .NET SDK is installed: `dotnet --version`

**CORS errors:**
- Verify frontend URL in `appsettings.json` CORS section
- Check API is running on correct port

**Database connection failed:**
- Verify PostgreSQL is running
- Check connection string in `appsettings.json`
- Test connection: `psql -U postgres -d plc_data`

**No data returned:**
- Database might be empty (run PLC Gateway service to collect data)
- Check: `SELECT COUNT(*) FROM plc_values;`

## 🎯 Next Steps

1. ✅ API is connected
2. ⏭️ Update frontend components to use API instead of demo data
3. ⏭️ Add real-time updates (polling or WebSocket)
4. ⏭️ Add error handling and loading states

