# Quick Start Guide - PLC Gateway Dashboard

## 🚀 Getting Started in 3 Steps

### Step 1: Install Dependencies

```bash
cd dashboard
npm install
```

### Step 2: Start Development Server

```bash
npm run dev
```

The dashboard will open at: http://localhost:5173

### Step 3: Upload Your Excel Files

1. Click on the **"Upload Data"** tab
2. Upload your machine metadata file (e.g., `College project_with address.xlsx`)
3. Upload your parameters file (e.g., `parameters - College project (1).xlsx`)
4. Switch back to **"Dashboard"** tab to see your machines

## 📋 Excel File Requirements

### Machine Metadata File

**Required Columns:**
- Machine Name
- Machine ID
- PLC Address
- Location
- Line
- Status (optional)

### Parameters File

**Required Columns (first 8):**
- Machine ID (must match Machine ID from metadata file)
- Tag Name
- Address
- Data Type (Int, Real, Bool, Word, DWord, String)
- Unit
- Min (minimum value)
- Max (maximum value)
- Description

**Time-Series Columns:**
- Additional columns with timestamp headers (e.g., "2024-01-15 10:00")
- Cell values contain the parameter values at those timestamps

See `EXCEL_STRUCTURE.md` for detailed format specifications.

## 🎯 Key Features

### Dashboard View
- **Statistics**: Total machines, Running, Stopped, Fault counts
- **Machine Cards**: Click any card to view machine details

### Machine Detail View
- **Parameter Grid**: All PLC parameters with current values
- **Search**: Filter parameters by name or description
- **Load More**: Pagination for large parameter lists
- **Charts**: Click a parameter to view its trend chart

### Status Colors
- 🟢 **Green**: Running / Normal
- 🟠 **Orange**: Warning
- 🔴 **Red**: Fault / Critical
- ⚫ **Gray**: Stopped / Maintenance

## 📊 How Data Maps

| Excel Column | Shows Up As |
|-------------|-------------|
| Machine Name | Card title on dashboard |
| Status | Color-coded chip |
| Tag Name | Parameter title |
| Current Value | Large number display |
| Min/Max | Progress bar range |
| Timestamps | X-axis on charts |
| Values | Y-axis on charts |

## 🔧 Troubleshooting

**"No machines found"**
→ Check that Excel has "Machine ID" and "Machine Name" columns

**"Parameters not showing"**
→ Verify Machine ID matches between both files

**"Charts empty"**
→ Check timestamp columns are date-formatted and values are numbers

## 📚 More Information

- **Excel Format**: See `EXCEL_STRUCTURE.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Full Docs**: See `README.md`

## 🎨 Customization

### Change Theme Colors

Edit `src/App.tsx`:

```typescript
const darkTheme = createTheme({
  palette: {
    primary: { main: '#2196f3' }, // Change primary color
    // ... other colors
  },
});
```

### Adjust Status Thresholds

Edit `src/services/dataService.ts`:

```typescript
// Change these percentages
const warningThreshold = range * 0.1; // 10% = warning
const criticalThreshold = range * 0.05; // 5% = critical
```

## 💡 Tips

1. **Use consistent Machine IDs** across both Excel files
2. **Set realistic Min/Max values** for accurate status calculation
3. **Keep timestamp columns in chronological order** for better charts
4. **Use descriptive Tag Names** for easier identification
5. **Limit time-series data** to recent history (last 100-1000 points) for performance

## 🔄 Next Steps

After testing with Excel files:

1. **Database Integration**: Connect to PostgreSQL/TimescaleDB (see `ARCHITECTURE.md`)
2. **Real-Time Updates**: Integrate with PLC Gateway WebSocket
3. **Custom Dashboards**: Create machine-specific views
4. **Alerts**: Set up notification system

---

**Need Help?** Check the documentation files or browser console for error messages.

