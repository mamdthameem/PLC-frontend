# Multi-Tenant Role-Based Access Control Architecture

## Overview

This document describes the multi-tenant, role-based access control (RBAC) architecture for the PLC Gateway Industrial IoT Dashboard. The system enables administrators to monitor all machines across all customers while ensuring customers can only access their own machines.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   AuthContext│      │ ProtectedRoute│                    │
│  │  (RBAC)      │──────│  (Guard)     │                    │
│  └──────────────┘      └──────────────┘                    │
│         │                    │                               │
│         ▼                    ▼                               │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ AdminDashboard│      │ UserDashboard│                    │
│  │ (Full Access) │      │ (Restricted) │                    │
│  └──────────────┘      └──────────────┘                    │
│         │                    │                               │
│         └──────────┬─────────┘                               │
│                    ▼                                         │
│            ┌──────────────┐                                 │
│            │  DataService │                                 │
│            │ (Role Filter) │                                 │
│            └──────────────┘                                 │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────────┐                   │
│  │  PostgreSQL / TimescaleDB (Future)  │                   │
│  │  - Machines                         │                   │
│  │  - Parameters                       │                   │
│  │  - Customers                        │                   │
│  │  - Users                            │                   │
│  │  - Assignments                      │                   │
│  └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### Entity Relationships

```
Admin (User)
  └─ Can see ALL Customers
       └─ Can see ALL Machines
            └─ Can see ALL Parameters

Customer
  └─ Owns Machines (customerId)
       └─ Has Users (userIds)
            └─ Users can see assigned machines

User (Customer User)
  └─ Belongs to Customer (customerId)
       └─ Can see machines where:
            - machine.customerId = user.customerId, OR
            - machine.assignedUserId = user.id
```

### Core Entities

#### User
```typescript
{
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  customerId?: string;  // Only for 'user' role
  createdAt: Date;
}
```

#### Customer
```typescript
{
  id: string;
  name: string;
  email: string;
  companyName?: string;
  machineIds: string[];  // Machines owned by customer
  userIds: string[];     // Users associated with customer
  createdAt: Date;
}
```

#### Machine
```typescript
{
  id: string;
  name: string;
  plcAddress: string;
  location: string;
  line: string;
  status: MachineStatus;
  customerId?: string;      // Tenant isolation
  assignedUserId?: string;  // Specific user assignment
  parameterCount?: number;
}
```

## Role-Based Access Control

### Admin Role

**Permissions:**
- ✅ View all customers
- ✅ View all machines across all customers
- ✅ View all PLC parameters
- ✅ Upload PLC configuration data
- ✅ Assign machines to customers/users
- ✅ Access system analytics
- ✅ Filter machines by customer

**Dashboard Features:**
- Global machine overview with customer filter
- Customer statistics (total customers count)
- All-machine statistics (total, running, stopped, fault)
- Customer name displayed on machine cards
- Full system visibility

### User Role (Customer)

**Permissions:**
- ✅ View only assigned machines (via customerId or assignedUserId)
- ✅ View real-time PLC values for own machines
- ✅ View trends for own machines
- ❌ Cannot see other customers' machines
- ❌ Cannot access admin analytics
- ❌ Cannot upload data

**Dashboard Features:**
- "My Machines" overview
- Only machines assigned to their customer
- No customer filter (only sees own machines)
- Same parameter monitoring capabilities as admin (but restricted scope)

## Component Hierarchy

```
App
├── AuthProvider (Context)
│   └── BrowserRouter
│       ├── /login → Login
│       ├── /dashboard → ProtectedRoute
│       │   └── DashboardRouter
│       │       ├── AdminDashboard (if role === 'admin')
│       │       │   ├── Statistics (5 cards: Customers, Total, Running, Stopped, Fault)
│       │       │   ├── Customer Filter
│       │       │   └── MachineCard[] (with customer names)
│       │       └── UserDashboard (if role === 'user')
│       │           ├── Statistics (4 cards: Total, Running, Stopped, Fault)
│       │           └── MachineCard[] (only user's machines)
│       └── /upload → ProtectedRoute (admin only)
│           └── UploadPage
```

## Key Components

### 1. AuthContext (`src/contexts/AuthContext.tsx`)

**Purpose:** Centralized authentication and authorization state management

**Features:**
- User login/logout
- Session persistence (localStorage)
- Role checking helpers (`isAdmin`, `isUser`)
- Mock authentication (replace with real API in production)

**Usage:**
```typescript
const { user, login, logout, isAdmin, isUser } = useAuth();
```

### 2. ProtectedRoute (`src/components/ProtectedRoute.tsx`)

**Purpose:** Route guard ensuring authentication and role-based access

**Features:**
- Redirects unauthenticated users to `/login`
- Optional `requiredRole` prop for role-specific routes
- Loading state handling

**Usage:**
```typescript
<ProtectedRoute requiredRole="admin">
  <AdminOnlyComponent />
</ProtectedRoute>
```

### 3. AdminDashboard (`src/components/AdminDashboard.tsx`)

**Purpose:** Full-featured dashboard for administrators

**Features:**
- Customer count statistic
- Global machine statistics
- Customer filter dropdown
- Machine cards with customer names
- Full machine detail access

### 4. UserDashboard (`src/components/UserDashboard.tsx`)

**Purpose:** Restricted dashboard for customer users

**Features:**
- User's machine statistics only
- No customer filter (restricted scope)
- Machine cards without customer names
- Same detail views but filtered data

### 5. DataService (`src/services/dataService.ts`)

**Purpose:** Business logic layer with role-based data filtering

**Key Methods:**
- `getMachinesByUserId(userId)` - Returns machines visible to specific user
- `getCustomers()` - Returns all customers (admin only)
- `assignMachineToCustomer()` - Admin function
- `assignMachineToUser()` - Admin function

**Filtering Logic:**
```typescript
// Admin: sees all machines
if (user.role === 'admin') return allMachines;

// User: sees only assigned machines
return machines.filter(m => 
  m.assignedUserId === userId || 
  m.customerId === user.customerId
);
```

## Routing Structure

```
/login          → Public (redirects to /dashboard if authenticated)
/dashboard      → Protected (role-based: AdminDashboard or UserDashboard)
/upload         → Protected, Admin only
/               → Redirects to /dashboard
```

## Data Flow

### Admin Flow
1. Admin logs in → AuthContext stores user with `role: 'admin'`
2. Navigate to `/dashboard` → ProtectedRoute checks auth
3. DashboardRouter renders `AdminDashboard`
4. AdminDashboard calls `dataService.getMachines()` → Returns ALL machines
5. Admin can filter by customer
6. Admin sees customer names on machine cards

### User Flow
1. User logs in → AuthContext stores user with `role: 'user'` and `customerId`
2. Navigate to `/dashboard` → ProtectedRoute checks auth
3. DashboardRouter renders `UserDashboard`
4. UserDashboard calls `dataService.getMachinesByUserId(user.id)`
5. DataService filters: `m.customerId === user.customerId || m.assignedUserId === user.id`
6. User sees only their assigned machines

## Security Considerations

### Current Implementation (Mock)
- Authentication stored in localStorage
- Mock users defined in AuthContext
- Client-side filtering only

### Production Recommendations
1. **Backend Authentication**
   - JWT tokens with refresh mechanism
   - Secure HTTP-only cookies
   - Password hashing (bcrypt)

2. **API-Level Authorization**
   - All data queries filtered on backend
   - Never trust client-side filtering
   - Role-based API endpoints:
     - `GET /api/admin/machines` (admin only)
     - `GET /api/user/machines` (filtered by customerId)

3. **Database-Level Security**
   - Row-level security (PostgreSQL RLS)
   - Tenant isolation at database level
   - SQL injection prevention (parameterized queries)

4. **Additional Security**
   - Rate limiting
   - CSRF protection
   - XSS prevention
   - Input validation/sanitization

## Scalability Considerations

### Multi-Tenancy
- Each customer is a tenant
- Machines are tenant-isolated via `customerId`
- Users belong to tenants
- Admin transcends tenant boundaries

### Database Design (Future)
```sql
-- Tenant isolation
CREATE TABLE machines (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  assigned_user_id UUID REFERENCES users(id),
  ...
  INDEX idx_customer_id (customer_id),
  INDEX idx_assigned_user_id (assigned_user_id)
);

-- Row-level security
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON machines
  FOR ALL
  USING (
    customer_id IN (
      SELECT customer_id FROM users WHERE id = current_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_user_id() AND role = 'admin'
    )
  );
```

### Performance Optimizations
- Database indexing on `customerId` and `assignedUserId`
- Pagination for large machine lists
- Caching frequently accessed data
- Lazy loading of parameters
- Data aggregation for statistics

## Testing Strategy

### Unit Tests
- AuthContext: login/logout, role checking
- DataService: filtering logic for different roles
- ProtectedRoute: authentication checks

### Integration Tests
- Admin can see all machines
- User can only see assigned machines
- User cannot access admin routes
- Customer filter works correctly

### E2E Tests
- Complete admin workflow
- Complete user workflow
- Authentication flow
- Route protection

## Migration from Single-Tenant

If migrating from existing single-tenant code:

1. **Add customer assignment** to machine upload process
2. **Update Excel parser** to include customer mapping
3. **Backfill existing machines** with default customer
4. **Create user accounts** and link to customers
5. **Test role-based filtering** thoroughly

## Demo Credentials

```
Admin:
Email: admin@plcgateway.com
Password: (any password accepted in mock)

User:
Email: user@customer.com
Password: (any password accepted in mock)
```

## Future Enhancements

1. **Advanced Permissions**
   - Granular permissions (read-only, write, admin per machine)
   - Role inheritance
   - Custom roles

2. **Customer Portal**
   - Customer self-registration
   - Customer-specific branding
   - Customer-admin sub-roles

3. **Audit Logging**
   - Track all data access by user/role
   - Compliance reporting
   - Access history

4. **Multi-Level Hierarchy**
   - Organizations → Customers → Machines
   - Regional admin roles
   - Department-level access

