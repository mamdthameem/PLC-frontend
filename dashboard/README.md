# Industrial IoT Dashboard - PLC Gateway

A modern, real-time-like industrial monitoring dashboard for PLC data visualization, built with React and TypeScript.

## Features

- 🏭 **Machine Overview**: Dashboard with machine status cards (Running/Stopped/Fault)
- 📊 **Parameter Monitoring**: Real-time-like display of PLC parameters (temperature, pressure, voltage, etc.)
- 📈 **Trend Charts**: Interactive time-series charts with Recharts
- ⚠️ **Status Indicators**: Color-coded alerts based on threshold values (Normal/Warning/Critical)
- 🔍 **Search & Navigation**: Cursor-based pagination and parameter search
- 🎨 **Industrial UI**: Dark theme optimized for factory environments
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Excel files with machine metadata and parameter data (see `EXCEL_STRUCTURE.md`)

### Installation

```bash
cd dashboard
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Usage

### 1. Upload Data Files

1. Navigate to the "Upload Data" tab
2. Upload **Machine Metadata** Excel file (e.g., `College project_with address.xlsx`)
3. Upload **PLC Parameters** Excel file (e.g., `parameters - College project (1).xlsx`)

### 2. View Dashboard

1. Switch to the "Dashboard" tab
2. View machine overview cards with status indicators
3. Click on any machine card to see detailed parameters

### 3. Explore Parameters

1. In the machine detail view, browse all parameters
2. Use search to filter parameters by name or description
3. Click on a parameter card to view its trend chart
4. Use "Load More" for pagination (cursor-based)

## Excel File Structure

See [EXCEL_STRUCTURE.md](./EXCEL_STRUCTURE.md) for detailed information about:

- Required columns for machine metadata
- Required columns for PLC parameters
- Time-series data format
- Status calculation logic

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for:

- Component hierarchy
- Data flow diagrams
- Cursor-based pagination explanation
- Performance optimizations
- Future scalability plans

## Project Structure

```
dashboard/
├── src/
│   ├── components/       # React UI components
│   ├── services/         # Business logic & data access
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions (Excel parsing)
│   ├── App.tsx           # Main application
│   └── main.tsx          # Entry point
├── EXCEL_STRUCTURE.md    # Excel file format documentation
├── ARCHITECTURE.md       # System architecture documentation
└── README.md            # This file
```

## Key Components

### Dashboard
Main view showing all machines with status overview and statistics.

### MachineCard
Individual machine card displaying name, location, status, and parameter count.

### MachineDetailView
Detailed view of a single machine with all its parameters, search, and pagination.

### ParameterDisplay
Shows current parameter value, unit, min/max range, and status indicator.

### ParameterChart
Interactive time-series chart with threshold lines for min/max values.

### StatusIndicator
Color-coded status chip (Green=Normal/Running, Orange=Warning, Red=Critical/Fault).

## Data Mapping

### Excel → UI Mapping

| Excel Column | UI Component | Display |
|-------------|--------------|---------|
| Machine Name | MachineCard | Card Title |
| PLC Address | MachineCard | Subtitle |
| Location & Line | MachineCard | Location info |
| Status | StatusIndicator | Color-coded chip |
| Tag Name | ParameterDisplay | Parameter title |
| Address | ParameterDisplay | Subtitle |
| Current Value | ParameterDisplay | Large number |
| Unit | ParameterDisplay | Next to value |
| Min/Max | ParameterDisplay | Progress bar range |
| Timestamp Columns | ParameterChart | X-axis (time) |
| Parameter Values | ParameterChart | Y-axis (value) |

## Status Calculation

### Parameter Status

- **Critical**: Value < Min + 5% OR Value > Max - 5%
- **Warning**: Value < Min + 10% OR Value > Max - 10%
- **Normal**: Value within safe range (10-90%)

### Machine Status

- **Fault**: Any parameter in Critical status
- **Stopped**: Any parameter in Warning status
- **Running**: All parameters Normal
- **Unknown**: No parameters available

## Technologies Used

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Material-UI (MUI)** - Component library
- **Recharts** - Charting library
- **xlsx (SheetJS)** - Excel file parsing
- **date-fns** - Date formatting
- **Vite** - Build tool and dev server

## Performance Features

- **Cursor-based Pagination**: Load data incrementally
- **Data Sampling**: Limit chart data points for large datasets
- **Memoization**: Optimize expensive computations
- **Lazy Loading**: Load data only when needed

## Future Enhancements

- PostgreSQL/TimescaleDB integration for time-series storage
- Real-time WebSocket updates from PLC Gateway
- Advanced analytics and reporting
- Alert system with notifications
- User authentication and permissions
- Mobile app support

## Troubleshooting

### "No machines found"
- Verify Excel file has "Machine ID" and "Machine Name" columns
- Check file format is .xlsx or .xls

### "Parameters not showing"
- Ensure Machine ID in parameter file matches metadata file
- Verify "Tag Name" column exists and has values

### "Charts empty"
- Check timestamp columns are formatted correctly
- Verify cell values are numeric (not text)
- Ensure timestamps are in chronological order

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

## Contributing

1. Follow TypeScript best practices
2. Use functional components with hooks
3. Maintain component separation of concerns
4. Add TypeScript types for all data structures
5. Document complex logic with comments

## License

This project is part of the PLC Gateway system.

## Support

For issues or questions:
1. Check `EXCEL_STRUCTURE.md` for file format requirements
2. Review `ARCHITECTURE.md` for system understanding
3. Check browser console for error messages
