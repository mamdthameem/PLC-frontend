# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **PLC Gateway Industrial IoT system** with three components:

1. **PLCGateway** (root `.csproj`) — .NET 8 background service that reads Siemens S7 PLC tags over TCP and stores data to PostgreSQL.
2. **PlcApi/** — .NET 8 Web API that exposes PLC data via REST + SignalR hub, with JWT auth and multi-tenant middleware.
3. **dashboard/** — React 19 / TypeScript / Vite frontend that visualizes PLC data with role-based access.

## Commands

### Frontend (dashboard/)
```bash
cd dashboard
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:5173
npm run build        # TypeScript compile + Vite build → dist/
npm run lint         # ESLint check
npm run preview      # Preview production build
```

### API (PlcApi/)
```bash
cd PlcApi
dotnet run           # Start API at http://localhost:5200, Swagger at /swagger
dotnet watch run     # Hot-reload dev mode
dotnet build         # Compile only
dotnet publish -c Release   # Production build
```

### Gateway (root)
```bash
dotnet build         # Build PLCGateway
dotnet run           # Run PLC polling background service
```

### Database
```bash
psql -U postgres -d sreesakthi_gateway -f create_table.sql    # Create tables
psql -U postgres -d sreesakthi_gateway -f view_data.sql        # Inspect data
```

## Architecture

### Data Flow
```
Siemens S7 PLC → PLCGateway (S7.Net) → PostgreSQL (plc_values table)
                                              ↓
                              PlcApi (REST + SignalR /plchub)
                                              ↓
                              React Dashboard (apiService + signalRService)
```

### Frontend Architecture

**Path alias:** `@` maps to `dashboard/src/`

**Context providers** (layered in `App.tsx` outermost → innermost):
- `ThemeContext` → MUI dark theme
- `AuthContext` → JWT auth + local user fallback
- `NotificationContext` → toast notifications
- `UIContext` → sidebar open/close state

**Role-based routing:** `DashboardRouter` renders `AdminDashboard` or `UserDashboard` based on `useAuth().isAdmin`. Admins see all machines across all customers; users see only machines where `customerId` or `assignedUserId` matches.

**Authentication flow** (`AuthContext`): Tries backend API first (`POST /api/auth/login`), falls back to users stored in `dataService` (in-memory, loaded from Excel uploads). JWT payload decoded client-side to extract role and `tenant_id`.

**Data services (singletons):**
- `dataService.ts` — in-memory store for machines, parameters, users, customers loaded from Excel or API
- `apiService.ts` — REST client for `/api/plc/*` endpoints; reads `VITE_API_URL` env var (default: `http://localhost:5200`)
- `signalRService.ts` — SignalR client connecting to `/plchub` with JWT auth and exponential-backoff reconnect

### API Architecture

**Multi-tenancy:** `TenantMiddleware` extracts `tenant_id` from JWT claim and populates `TenantContext`. `TenantConnectionFactory` resolves per-tenant database connection strings.

**Auth:** JWT Bearer tokens. Default credentials seeded at startup: `admin / admin123` and `user1 / user123`.

**Background worker:** `PlcDataWorker` (hosted service) broadcasts live PLC values to SignalR clients via `PlcHub`.

**Database fallback:** If PostgreSQL is unreachable at startup, the API continues with mock data; connection is retried in background.

## Configuration

### Frontend environment variable
Create `dashboard/.env.local`:
```
VITE_API_URL=http://localhost:5200
```

### API (`PlcApi/appsettings.json`)
- `ConnectionStrings.PostgresDb` — PostgreSQL connection string
- `Jwt.Key` — must be ≥ 32 characters
- `Jwt.Issuer` / `Jwt.Audience` — must match token claims
- `Cors.AllowedOrigins` — add `http://localhost:5173` for frontend dev

### Gateway (`appsettings.json` at root)
- PLC IP address (default: `192.168.1.82`), rack, slot
- PostgreSQL connection string
- Scan interval (milliseconds)
- Tags list (PLC addresses to poll)

## Key Database Table

```sql
CREATE TABLE plc_values (
    id        SERIAL PRIMARY KEY,
    address   VARCHAR(255) NOT NULL,   -- e.g. "DB1.DBW0"
    value     TEXT,
    direction VARCHAR(50) NOT NULL,    -- "Read" or "Write"
    timestamp TIMESTAMP NOT NULL
);
```
