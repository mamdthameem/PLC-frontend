# PLC Gateway Dashboard - Architecture Documentation

## Overview

The PLC Gateway Dashboard is a React-based industrial IoT monitoring system that visualizes PLC data from Excel files (with future database integration).

## Technology Stack

- **Framework**: React 19 with TypeScript
- **UI Library**: Material-UI (MUI) v7
- **Charts**: Recharts v3
- **Excel Parsing**: xlsx (SheetJS) v0.18
- **Build Tool**: Vite v7
- **Date Handling**: date-fns v4

## Project Structure

```
dashboard/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx    # Main dashboard view
│   │   ├── MachineCard.tsx  # Machine overview card
│   │   ├── MachineDetailView.tsx  # Detailed machine view
│   │   ├── ParameterDisplay.tsx   # Parameter value display
│   │   ├── ParameterChart.tsx     # Time-series chart
│   │   ├── StatusIndicator.tsx    # Status chip component
│   │   └── FileUpload.tsx         # File upload component
│   ├── services/            # Business logic layer
│   │   └── dataService.ts   # Data access and business logic
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # All type interfaces
│   ├── utils/               # Utility functions
│   │   └── excelParser.ts   # Excel file parsing
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
```

## Component Hierarchy

```
App
├── ThemeProvider (MUI Dark Theme)
│   ├── Dashboard (Tab 0)
│   │   ├── Statistics Cards (4 cards: Total, Running, Stopped, Fault)
│   │   └── MachineCard[] (Grid of machine cards)
│   │       └── MachineDetailView (when card clicked)
│   │           ├── Machine Info Panel
│   │           ├── Search Bar
│   │           ├── ParameterDisplay[] (Grid of parameters)
│   │           └── ParameterChart (when parameter selected)
│   └── FileUpload[] (Tab 1)
│       ├── Machine Metadata Upload
│       └── Parameter Data Upload
```

## Data Flow

### 1. Data Loading Flow

```
Excel File
    ↓
FileUpload Component
    ↓
excelParser.ts (parseMachineExcel / parseParameterExcel)
    ↓
Data Transformation (Excel rows → TypeScript objects)
    ↓
dataService.ts (loadMachinesFromExcel / loadParametersFromExcel)
    ↓
State Management (React useState)
    ↓
Component Rendering
```

### 2. User Interaction Flow

```
Dashboard View
    ↓
User clicks Machine Card
    ↓
MachineDetailView renders
    ↓
Parameters loaded (cursor-based pagination)
    ↓
User searches/clicks parameter
    ↓
ParameterChart renders with time-series data
```

### 3. Status Calculation Flow

```
Parameter Value
    ↓
Calculate vs. Min/Max thresholds
    ↓
Determine Parameter Status (Normal/Warning/Critical)
    ↓
Aggregate Machine Status
    ↓
Update UI (StatusIndicator components)
```

## Data Models

### Machine
```typescript
interface Machine {
  id: string;              // Unique identifier
  name: string;            // Display name
  plcAddress: string;      // PLC IP/connection string
  location: string;        // Physical location
  line: string;            // Production line
  status: MachineStatus;   // Calculated from parameters
  lastUpdate?: Date;       // Last data update time
  parameterCount?: number; // Number of parameters
}
```

### PLCParameter
```typescript
interface PLCParameter {
  id: string;                    // Unique: machineId_tagName
  machineId: string;             // Links to Machine
  tagName: string;               // Parameter name
  address: string;               // PLC memory address
  dataType: DataType;            // Int, Real, Bool, etc.
  unit: string;                  // Unit of measurement
  minValue: number;              // Minimum threshold
  maxValue: number;              // Maximum threshold
  description: string;           // Human-readable description
  currentValue?: number;         // Latest value
  currentStatus?: ParameterStatus; // Normal/Warning/Critical
  timestamp?: Date;              // Latest value timestamp
  values?: TimeSeriesValue[];    // Historical data points
}
```

## Cursor-Based Pagination

### Why Cursor-Based?

- **Performance**: Load only visible data
- **Scalability**: Handle large datasets efficiently
- **Memory Efficiency**: Don't load all data at once

### Implementation

```typescript
// In dataService.ts
getParametersByMachine(
  machineId: string,
  cursor?: number,      // Start index
  limit: number = 20    // Items per page
): {
  parameters: PLCParameter[];
  nextCursor?: number;  // Next page cursor
  hasMore: boolean;     // More data available?
}
```

### Usage Flow

1. Initial load: `cursor = undefined` → loads first 20 items
2. User clicks "Load More": `cursor = nextCursor` → loads next 20 items
3. Repeat until `hasMore = false`

## State Management

### Local State (React useState)

- Component-level state for UI interactions
- Tab selection, search terms, selected items
- File upload progress/status

### Service State (dataService)

- Singleton pattern for data persistence
- Caches loaded Excel data
- Provides data access methods
- Calculates derived data (status, counts)

### Future: Database Integration

The `dataService` is designed to be database-agnostic:

```typescript
// Current: Excel-based
await dataService.loadMachinesFromExcel(file);

// Future: Database-based
await dataService.loadMachinesFromDatabase();
```

The service interface remains the same, only the implementation changes.

## Performance Optimizations

### 1. Data Sampling for Charts

```typescript
// Limit chart data points
const data = parameter.values.length > 100
  ? parameter.values.filter((_, i) => i % step === 0).slice(-100)
  : parameter.values;
```

### 2. Memoization

```typescript
// Use useMemo for expensive computations
const filteredParameters = useMemo(() => {
  return searchTerm 
    ? dataService.searchParameters(machineId, searchTerm)
    : parameters;
}, [parameters, searchTerm, machineId]);
```

### 3. Lazy Loading

- Load parameters only when machine is selected
- Load chart data only when parameter is clicked
- Pagination for large parameter lists

### 4. Virtual Scrolling (Future)

For very large datasets, consider:
- `react-window` or `react-virtualized`
- Render only visible items

## Styling Architecture

### Theme System

- **MUI Theme Provider**: Centralized theme configuration
- **Dark Theme**: Industrial look with custom colors
- **Component Overrides**: Consistent styling across components

### Color Scheme

- **Primary**: Blue (#2196f3) - Interactive elements
- **Success**: Green (#4caf50) - Running/Normal status
- **Warning**: Orange (#ff9800) - Warning status
- **Error**: Red (#f44336) - Fault/Critical status
- **Background**: Dark (#121212) - Main background

### Responsive Design

- **Grid System**: MUI Grid with breakpoints
- **xs**: Mobile (12 columns = full width)
- **sm**: Tablet (6 columns = 2 per row)
- **md**: Desktop (4 columns = 3 per row)
- **lg**: Large desktop (3 columns = 4 per row)

## Error Handling

### File Upload Errors

```typescript
try {
  await dataService.loadMachinesFromExcel(file);
} catch (error) {
  setError(error.message);
  // Show user-friendly error message
}
```

### Data Validation

- Excel parser validates required columns
- Missing data uses defaults (e.g., "Unknown" status)
- Invalid values are filtered out

### Connection Errors (Future)

For database integration:
- Retry logic with exponential backoff
- Connection pooling
- Graceful degradation

## Testing Strategy

### Unit Tests (Recommended)

- `excelParser.ts`: Test Excel parsing logic
- `dataService.ts`: Test data transformation
- `utils`: Test helper functions

### Component Tests (Recommended)

- Render components with mock data
- Test user interactions
- Test status calculations

### Integration Tests (Recommended)

- Full data flow from Excel → UI
- Cursor pagination
- Search functionality

## Scalability Considerations

### Current Limitations

1. **In-Memory Storage**: All data loaded into browser memory
2. **Single User**: No multi-user considerations
3. **No Real-Time Updates**: Static Excel data

### Future Enhancements

1. **Database Backend**: PostgreSQL/TimescaleDB for time-series data
2. **WebSocket Integration**: Real-time updates from PLC Gateway
3. **API Layer**: RESTful API for data access
4. **Caching**: Redis for frequently accessed data
5. **Compression**: Compress large time-series datasets
6. **Data Archival**: Move old data to cold storage

## Security Considerations

### Current (Excel-Based)

- File upload validation
- Client-side processing only

### Future (Database-Based)

- Authentication & Authorization
- SQL injection prevention (parameterized queries)
- HTTPS/TLS for data transmission
- Rate limiting for API endpoints
- Input sanitization

## Deployment

### Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

### Production Deployment

- Build outputs to `dist/` folder
- Serve with nginx, Apache, or cloud hosting
- Configure environment variables for API endpoints (future)

## Best Practices Implemented

1. **Separation of Concerns**: UI, logic, and data layers separated
2. **Type Safety**: Full TypeScript coverage
3. **Component Reusability**: Modular, reusable components
4. **Performance**: Lazy loading, pagination, memoization
5. **User Experience**: Loading states, error handling, responsive design
6. **Maintainability**: Clear structure, documentation, naming conventions
7. **Extensibility**: Easy to add database support, new features

## Future Roadmap

1. **Phase 1**: Database integration (PostgreSQL/TimescaleDB)
2. **Phase 2**: Real-time updates via WebSocket
3. **Phase 3**: Advanced analytics and reporting
4. **Phase 4**: Alert system and notifications
5. **Phase 5**: User management and permissions
6. **Phase 6**: Mobile app support

