# Excel File Structure Guide

This document explains how to structure your Excel files for the PLC Gateway Dashboard.

## File 1: Machine Metadata (`College project_with address.xlsx`)

This file should contain information about each machine/PLC in your factory.

### Required Columns

| Column Name | Description | Example | Required |
|------------|-------------|---------|----------|
| Machine Name | Human-readable machine name | "CNC Machine 01" | Yes |
| Machine ID | Unique identifier | "MACHINE_01" | Yes |
| PLC Address | PLC IP address or connection string | "192.168.1.82" | Yes |
| Location | Physical location | "Production Line A" | Yes |
| Line | Production line identifier | "Line 1" | Yes |
| Status | Current status | "Running", "Stopped", "Fault", "Maintenance" | No |

### Example Data

```
Machine Name    | Machine ID  | PLC Address   | Location          | Line   | Status
----------------|-------------|---------------|-------------------|--------|--------
CNC Machine 01  | MACHINE_01  | 192.168.1.82  | Production Line A | Line 1 | Running
Lathe Machine   | MACHINE_02  | 192.168.1.83  | Production Line B | Line 2 | Stopped
Drilling Press  | MACHINE_03  | 192.168.1.84  | Production Line A | Line 1 | Running
```

### Notes

- The parser is case-insensitive for status values
- Status can be: Running, Stopped, Fault, Maintenance, or Unknown (default)
- Machine ID should be unique across all machines

---

## File 2: PLC Parameters (`parameters - College project (1).xlsx`)

This file contains PLC tags/parameters and their historical time-series data.

### Required Columns (First 8 columns)

| Column Name | Description | Example | Required |
|------------|-------------|---------|----------|
| Machine ID | Must match Machine ID from metadata file | "MACHINE_01" | Yes |
| Tag Name | Parameter/tag name | "MotorSpeed" | Yes |
| Address | PLC memory address | "DB1.DBW0" | Yes |
| Data Type | PLC data type | "Int", "Real", "Bool", "Word", "DWord", "String" | Yes |
| Unit | Unit of measurement | "RPM", "°C", "Bar", "V", "A" | No |
| Min | Minimum acceptable value | 0 | Yes |
| Max | Maximum acceptable value | 3000 | Yes |
| Description | Parameter description | "Main motor rotation speed" | No |

### Time-Series Columns (Additional columns)

After the 8 required columns, you can add timestamp columns for historical data:

- **Column headers**: Can be date/time strings (e.g., "2024-01-15 10:30:00") or Excel serial numbers
- **Cell values**: The actual parameter values at that timestamp
- **Format**: Numbers for numeric values, strings for text values

### Example Data Structure

```
Machine ID | Tag Name    | Address   | Data Type | Unit | Min  | Max  | Description          | 2024-01-15 10:00 | 2024-01-15 10:05 | 2024-01-15 10:10
-----------|-------------|-----------|-----------|------|------|------|---------------------|------------------|------------------|------------------
MACHINE_01 | MotorSpeed  | DB1.DBW0  | Int       | RPM  | 0    | 3000 | Main motor speed    | 1500             | 1520             | 1480
MACHINE_01 | Temperature | DB1.DBD4  | Real      | °C   | 20   | 80   | Motor temperature   | 45.5             | 46.2             | 45.8
MACHINE_01 | Pressure    | DB1.DBD8  | Real      | Bar  | 0    | 10   | System pressure     | 5.2              | 5.3              | 5.1
MACHINE_02 | Voltage     | DB2.DBD0  | Real      | V    | 200  | 240  | Supply voltage      | 220.5            | 221.0            | 219.8
```

### Time-Series Column Formats

The parser supports multiple timestamp formats:

1. **Date String**: "2024-01-15 10:30:00", "01/15/2024", "15-01-2024"
2. **Excel Serial Number**: Numeric values (Excel's internal date format)
3. **ISO Format**: "2024-01-15T10:30:00Z"

### Data Type Mapping

| Excel Value | Parsed Type | Description |
|------------|-------------|-------------|
| Int, Integer | Int | 16-bit integer |
| Real, Float, Double | Real | Floating point number |
| Bool, Boolean | Bool | Boolean true/false |
| Word | Word | 16-bit word |
| DWord | DWord | 32-bit double word |
| String | String | Text string |

---

## How Data Maps to UI

### Machine Metadata → Dashboard Cards

- **Machine Name** → Card title
- **PLC Address** → Displayed in card
- **Location & Line** → Displayed as "Location • Line X"
- **Status** → Color-coded status chip (Green=Running, Yellow=Stopped, Red=Fault)
- **Parameter Count** → Calculated from parameter file

### Parameters → Parameter Display

- **Tag Name** → Parameter title
- **Address** → Subtitle
- **Current Value** → Large number display (from last timestamp column)
- **Unit** → Next to value
- **Min/Max** → Progress bar range and labels
- **Description** → Tooltip/description text
- **Current Status** → Calculated from thresholds (Normal/Warning/Critical)

### Time-Series Data → Charts

- **Timestamp columns** → X-axis (time)
- **Parameter values** → Y-axis (value)
- **Min/Max values** → Reference lines on chart
- **Status** → Line color (Blue=Normal, Orange=Warning, Red=Critical)

---

## Status Calculation Logic

### Machine Status

Determined by parameter statuses:
- **Fault**: Any parameter in Critical status
- **Stopped**: Any parameter in Warning status
- **Running**: All parameters Normal
- **Unknown**: No parameters available

### Parameter Status

Calculated from current value vs. thresholds:
- **Critical**: Value < Min + 5% OR Value > Max - 5%
- **Warning**: Value < Min + 10% OR Value > Max - 10%
- **Normal**: Value within 10-90% range

---

## Best Practices

1. **Consistent Machine IDs**: Use the same Machine ID format in both files
2. **Unique Tag Names**: Each tag should be unique per machine
3. **Valid Addresses**: Use standard PLC addressing format (e.g., "DB1.DBW0")
4. **Reasonable Thresholds**: Set Min/Max values based on actual operating ranges
5. **Regular Updates**: Update timestamp columns regularly for accurate trends
6. **Column Order**: Keep required columns in the specified order
7. **No Empty Rows**: Remove blank rows between data entries

---

## Troubleshooting

### "No machines found"
- Check that Machine ID column exists and has values
- Verify file format is .xlsx or .xls

### "Parameters not showing"
- Ensure Machine ID in parameter file matches Machine ID in metadata file
- Check that Tag Name column has values

### "Charts empty"
- Verify timestamp columns are formatted correctly
- Check that cell values contain numeric data (not text)
- Ensure timestamps are in chronological order

### "Status always Unknown"
- Verify Status column exists in machine file
- Check that status values match: Running, Stopped, Fault, Maintenance

