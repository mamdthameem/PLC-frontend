# Data Mapping: Excel → JSON → UI

This document shows exactly how Excel data transforms into JSON and then displays in the UI.

## Machine Metadata: Excel → JSON

### Excel Structure
```
| Machine Name    | Machine ID  | PLC Address   | Location          | Line   | Status  |
|-----------------|-------------|---------------|-------------------|--------|---------|
| CNC Machine 01  | MACHINE_01  | 192.168.1.82  | Production Line A | Line 1 | Running |
```

### JSON Output
```json
{
  "id": "MACHINE_01",
  "name": "CNC Machine 01",
  "plcAddress": "192.168.1.82",
  "location": "Production Line A",
  "line": "Line 1",
  "status": "Running",
  "parameterCount": 5
}
```

### UI Display
- **Card Title**: `name` ("CNC Machine 01")
- **Status Chip**: Color based on `status` (Green for Running)
- **Location**: `location` + `line` ("Production Line A • Line 1")
- **PLC Address**: `plcAddress` ("192.168.1.82")
- **Parameter Count**: `parameterCount` (5)

---

## PLC Parameters: Excel → JSON

### Excel Structure
```
| Machine ID | Tag Name    | Address   | Data Type | Unit | Min  | Max  | Description          | 2024-01-15 10:00 | 2024-01-15 10:05 | 2024-01-15 10:10 |
|------------|-------------|-----------|-----------|------|------|------|---------------------|------------------|------------------|------------------|
| MACHINE_01 | MotorSpeed  | DB1.DBW0  | Int       | RPM  | 0    | 3000 | Main motor speed    | 1500             | 1520             | 1480             |
| MACHINE_01 | Temperature | DB1.DBD4  | Real      | °C   | 20   | 80   | Motor temperature   | 45.5             | 46.2             | 45.8             |
```

### JSON Output (Single Parameter)
```json
{
  "id": "MACHINE_01_MotorSpeed",
  "machineId": "MACHINE_01",
  "tagName": "MotorSpeed",
  "address": "DB1.DBW0",
  "dataType": "Int",
  "unit": "RPM",
  "minValue": 0,
  "maxValue": 3000,
  "description": "Main motor speed",
  "currentValue": 1480,
  "currentStatus": "Normal",
  "timestamp": "2024-01-15T10:10:00Z",
  "values": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "value": 1500
    },
    {
      "timestamp": "2024-01-15T10:05:00Z",
      "value": 1520
    },
    {
      "timestamp": "2024-01-15T10:10:00Z",
      "value": 1480
    }
  ]
}
```

### UI Display (ParameterDisplay Component)

```
┌─────────────────────────────────────┐
│ MotorSpeed          [Normal]        │ ← tagName + currentStatus
│ DB1.DBW0                            │ ← address
│                                     │
│ 1480.00 RPM                         │ ← currentValue + unit (large)
│ ████████████░░░░░░░░ 49%            │ ← Progress bar (normalized)
│ Min: 0 RPM    Max: 3000 RPM         │ ← minValue + maxValue
│                                     │
│ Main motor speed                    │ ← description
│ Updated: 1/15/2024, 10:10:00 AM     │ ← timestamp
└─────────────────────────────────────┘
```

### UI Display (ParameterChart Component)

```
┌─────────────────────────────────────┐
│ MotorSpeed Trend                    │
│ Main motor speed                    │
│                                     │
│ 3000 |     ┌─────┐                  │ ← maxValue reference line (red)
│      |     │     │                  │
│ 2000 |  ┌──┘     └──┐               │
│      |  │           │               │ ← values array plotted
│ 1000 |  │           │               │
│    0 |──┘           └──             │ ← minValue reference line (green)
│      10:00  10:05  10:10            │ ← timestamps (X-axis)
│                                     │
│      [MotorSpeed] [Min] [Max]       │ ← Legend
└─────────────────────────────────────┘
```

---

## Status Calculation Flow

### Parameter Status Calculation

```javascript
// Input
currentValue = 1480
minValue = 0
maxValue = 3000

// Calculation
range = 3000 - 0 = 3000
warningThreshold = 3000 * 0.1 = 300  // 10%
criticalThreshold = 3000 * 0.05 = 150 // 5%

// Evaluation
if (1480 < 150 OR 1480 > 2850) {
  status = "Critical"  // Red
} else if (1480 < 300 OR 1480 > 2700) {
  status = "Warning"   // Orange
} else {
  status = "Normal"    // Green ✓
}
```

### Machine Status Aggregation

```javascript
// Get all parameters for machine
parameters = [param1, param2, param3]

// Check for critical
if (parameters.some(p => p.status === "Critical")) {
  machineStatus = "Fault"     // Red
}
// Check for warnings
else if (parameters.some(p => p.status === "Warning")) {
  machineStatus = "Stopped"   // Yellow
}
// All normal
else {
  machineStatus = "Running"   // Green ✓
}
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  Excel File     │
│  (Machine Data) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ excelParser.ts  │
│ parseMachine    │
│ Excel()         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  JSON Array     │
│  Machine[]      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ dataService.ts  │
│ loadMachines    │
│ FromExcel()     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ React State     │
│ machines[]      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dashboard.tsx   │
│ MachineCard[]   │
└─────────────────┘
```

---

## Example: Complete Data Flow

### 1. Excel Input
```
Machine Metadata:
Machine Name: "Lathe Machine"
Machine ID: "MACHINE_02"
PLC Address: "192.168.1.83"
Location: "Production Line B"
Line: "Line 2"
Status: "Stopped"

Parameters:
Machine ID: "MACHINE_02"
Tag Name: "Voltage"
Address: "DB2.DBD0"
Data Type: "Real"
Unit: "V"
Min: 200
Max: 240
Description: "Supply voltage"
2024-01-15 10:00: 220.5
2024-01-15 10:05: 221.0
2024-01-15 10:10: 219.8
```

### 2. Parsed JSON
```json
{
  "machine": {
    "id": "MACHINE_02",
    "name": "Lathe Machine",
    "plcAddress": "192.168.1.83",
    "location": "Production Line B",
    "line": "Line 2",
    "status": "Stopped"
  },
  "parameter": {
    "id": "MACHINE_02_Voltage",
    "machineId": "MACHINE_02",
    "tagName": "Voltage",
    "address": "DB2.DBD0",
    "dataType": "Real",
    "unit": "V",
    "minValue": 200,
    "maxValue": 240,
    "description": "Supply voltage",
    "currentValue": 219.8,
    "currentStatus": "Normal",
    "timestamp": "2024-01-15T10:10:00Z",
    "values": [
      {"timestamp": "2024-01-15T10:00:00Z", "value": 220.5},
      {"timestamp": "2024-01-15T10:05:00Z", "value": 221.0},
      {"timestamp": "2024-01-15T10:10:00Z", "value": 219.8}
    ]
  }
}
```

### 3. UI Rendering

**Dashboard View:**
```
┌────────────────────────────────┐
│ [Statistics Cards]             │
│ Total: 2 | Running: 1 | ...    │
└────────────────────────────────┘
┌────────────────────────────────┐
│ Lathe Machine    [Stopped]     │
│ Production Line B • Line 2     │
│ PLC: 192.168.1.83              │
│ 1 Parameters                   │
└────────────────────────────────┘
```

**Machine Detail View:**
```
┌────────────────────────────────┐
│ ← Lathe Machine                │
│                                 │
│ Location: Production Line B     │
│ Line: Line 2                    │
│ PLC Address: 192.168.1.83      │
│                                 │
│ [Search parameters...]          │
│                                 │
│ ┌──────────────────────────┐   │
│ │ Voltage      [Normal]    │   │
│ │ DB2.DBD0                 │   │
│ │ 219.80 V                 │   │
│ │ ████████████░░░░ 49%     │   │
│ │ Min: 200 V  Max: 240 V   │   │
│ │ Supply voltage           │   │
│ └──────────────────────────┘   │
│                                 │
│ [Chart: Voltage Trend]          │
└────────────────────────────────┘
```

---

## Key Transformations

### Column Name Normalization
- Excel: "Machine Name" → JSON: `name`
- Excel: "Machine ID" → JSON: `id`
- Excel: "PLC Address" → JSON: `plcAddress`

### Status Normalization
- Excel: "running", "Running", "RUNNING" → JSON: `"Running"`
- Excel: "fault", "error", "Fault" → JSON: `"Fault"`

### Data Type Normalization
- Excel: "Int", "Integer", "INT" → JSON: `"Int"`
- Excel: "Real", "Float", "Double" → JSON: `"Real"`

### Timestamp Parsing
- Excel: Date string "2024-01-15 10:00" → JSON: `Date("2024-01-15T10:00:00Z")`
- Excel: Serial number 45310.5 → JSON: `Date` (converted from Excel serial)

### Value Extraction
- Last timestamp column value → `currentValue`
- All timestamp columns → `values[]` array
- Latest timestamp → `timestamp`

---

## Best Practices

1. **Consistent IDs**: Machine ID must match exactly in both files
2. **Valid Dates**: Timestamp columns should be parseable dates
3. **Numeric Values**: Parameter values should be numbers (not text)
4. **Reasonable Ranges**: Min/Max should reflect actual operating limits
5. **Ordered Data**: Timestamp columns should be in chronological order

