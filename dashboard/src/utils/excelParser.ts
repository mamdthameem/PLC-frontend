import * as XLSX from 'xlsx';
import type { Machine, PLCParameter, MachineExcelRow, ParameterExcelRow, MachineStatus, DataType } from '../types';

/**
 * Parse Excel file containing machine metadata
 * Expected columns: Machine Name, Machine ID, PLC Address, Location, Line, Status
 */
export function parseMachineExcel(file: File): Promise<Machine[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Assume first sheet contains machine data
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData: MachineExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

        // Transform to Machine objects
        const machines: Machine[] = jsonData.map((row, index) => {
          const status = normalizeStatus(row.Status);

          return {
            id: row['Machine ID'] || `MACHINE_${index + 1}`,
            name: row['Machine Name'] || `Machine ${index + 1}`,
            plcAddress: row['PLC Address'] || '',
            location: row['Location'] || '',
            line: row['Line'] || '',
            status: status,
          };
        }).filter(m => m.name); // Filter out empty rows

        resolve(machines);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse Excel file containing PLC parameters with time-series data
 * Expected columns: Machine ID, Tag Name, Address, Data Type, Unit, Min, Max, Description
 * Plus timestamp columns for historical values
 */
export function parseParameterExcel(file: File): Promise<PLCParameter[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: ParameterExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

        // Identify timestamp columns (columns that look like dates)
        const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
        const timestampColumns = headerRow.filter((header, idx) => {
          if (idx < 8) return false; // Skip known data columns
          // Check if header looks like a date or is a number (Excel date serial)
          return isDateColumn(header);
        });

        const parameters: PLCParameter[] = jsonData.map((row) => {
          const machineId = row['Machine ID'] || '';
          const tagName = row['Tag Name'] || '';

          // Extract time-series values from timestamp columns
          const timeSeriesValues: Array<{ timestamp: Date; value: number | string }> = [];

          timestampColumns.forEach(colHeader => {
            const cellValue = row[colHeader];
            if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
              const timestamp = parseExcelDate(colHeader, cellValue);
              if (timestamp) {
                timeSeriesValues.push({
                  timestamp,
                  value: typeof cellValue === 'number' ? cellValue : parseFloat(cellValue as string) || cellValue
                });
              }
            }
          });

          // Sort by timestamp
          timeSeriesValues.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          const currentValue = timeSeriesValues.length > 0
            ? (typeof timeSeriesValues[timeSeriesValues.length - 1].value === 'number'
              ? timeSeriesValues[timeSeriesValues.length - 1].value
              : null)
            : null;

          return {
            id: `${machineId}_${tagName}`,
            machineId: machineId,
            tagName: tagName,
            address: row['Address'] || '',
            dataType: normalizeDataType(row['Data Type']),
            unit: row['Unit'] || '',
            minValue: typeof row['Min'] === 'number' ? row['Min'] : parseFloat((row['Min'] ?? '0') as string) || 0,
            maxValue: typeof row['Max'] === 'number' ? row['Max'] : parseFloat((row['Max'] ?? '100') as string) || 100,
            description: row['Description'] || '',
            currentValue: currentValue as number | undefined,
            timestamp: timeSeriesValues.length > 0 ? timeSeriesValues[timeSeriesValues.length - 1].timestamp : undefined,
            values: timeSeriesValues.map(v => ({
              timestamp: v.timestamp,
              value: v.value
            }))
          };
        }).filter(p => p.machineId && p.tagName); // Filter out empty rows

        resolve(parameters);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Helper: Normalize status string to MachineStatus type
 */
function normalizeStatus(status?: string): MachineStatus {
  if (!status) return 'Unknown';
  const normalized = status.trim().toLowerCase();
  if (normalized.includes('run')) return 'Running';
  if (normalized.includes('stop')) return 'Stopped';
  if (normalized.includes('fault') || normalized.includes('error')) return 'Fault';
  if (normalized.includes('maintain')) return 'Maintenance';
  return 'Unknown';
}

/**
 * Helper: Normalize data type string
 */
function normalizeDataType(type?: string): DataType {
  if (!type) return 'Real';
  const normalized = type.trim().toLowerCase();
  if (normalized.includes('int')) return 'Int';
  if (normalized.includes('bool')) return 'Bool';
  if (normalized.includes('word') && normalized.includes('d')) return 'DWord';
  if (normalized.includes('word')) return 'Word';
  if (normalized.includes('string')) return 'String';
  return 'Real';
}

/**
 * Helper: Check if column header looks like a date
 */
function isDateColumn(header: string): boolean {
  if (!header) return false;
  // Check if it's a date string or Excel serial number column
  const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
  return datePattern.test(header) || !isNaN(parseFloat(header));
}

/**
 * Helper: Parse Excel date from column header and cell value
 */
function parseExcelDate(header: string, value: number | string): Date | null {
  try {
    // If value is a number, it might be Excel serial date
    if (typeof value === 'number' && value > 1 && value < 100000) {
      // Excel serial date (days since 1900-01-01)
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      if (!isNaN(date.getTime())) return date;
    }

    // Try parsing header as date
    const headerDate = new Date(header);
    if (!isNaN(headerDate.getTime())) return headerDate;

    // Try parsing value as date string
    if (typeof value === 'string') {
      const valueDate = new Date(value);
      if (!isNaN(valueDate.getTime())) return valueDate;
    }

    return null;
  } catch {
    return null;
  }
}

