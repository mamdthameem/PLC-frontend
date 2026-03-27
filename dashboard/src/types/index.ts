// Type definitions for PLC Gateway Dashboard

// Type definitions (must be declared before interfaces that use them)
export type MachineStatus = 'Running' | 'Stopped' | 'Fault' | 'Maintenance' | 'Unknown';
export type UserRole = 'admin' | 'user';
export type ParameterStatus = 'Normal' | 'Warning' | 'Critical';
export type DataType = 'Int' | 'Real' | 'Bool' | 'Word' | 'DWord' | 'String';
export type DisplayType = 'Tile' | 'Tile & graph' | 'pop up';

// Authentication & Authorization
export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  industryName?: string;
  state?: string;
  password?: string; // For mock auth
  role: UserRole;
  customerId?: string; // Only for 'user' role - links to their customer account
  isApproved: boolean;
  unapprovedReason?: string;
  validUntil?: Date;
  assignedMachineIds: string[];
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  address?: string;
  phone?: string;
  createdAt: Date;
  machineIds: string[]; // Machines assigned to this customer
  userIds: string[]; // Users associated with this customer
}

export interface Machine {
  id: string;
  name: string;
  plcAddress: string; // IP address or connection string
  location: string;
  line: string;
  status: MachineStatus;
  customerId?: string; // Tenant isolation - which customer owns this machine
  assignedUserId?: string; // Specific user assigned to monitor (optional)
  lastUpdate?: Date;
  parameterCount?: number;
}

export interface PLCParameter {
  id: string;
  machineId: string;
  tagName: string;
  address: string; // PLC address (e.g., "DB1.DBW0")
  dataType: DataType;
  unit: string;
  minValue: number;
  maxValue: number;
  description: string;
  displayType?: DisplayType; // How this parameter should be displayed
  currentValue?: number;
  currentStatus?: ParameterStatus;
  timestamp?: Date;
  values?: TimeSeriesValue[];
}


export interface TimeSeriesValue {
  timestamp: Date;
  value: number | string | boolean;
}

export interface MachineMetadata {
  machines: Machine[];
}

export interface ParameterData {
  parameters: PLCParameter[];
}

export interface DashboardData {
  machines: Machine[];
  parameters: PLCParameter[];
}

// Excel column mappings
export interface MachineExcelRow {
  'Machine Name'?: string;
  'Machine ID'?: string;
  'PLC Address'?: string;
  'Location'?: string;
  'Line'?: string;
  'Status'?: string;
}

export interface ParameterExcelRow {
  'Machine ID'?: string;
  'Tag Name'?: string;
  'Address'?: string;
  'Data Type'?: string;
  'Unit'?: string;
  'Min'?: number;
  'Max'?: number;
  'Description'?: string;
  [key: string]: string | number | undefined; // For timestamp columns
}

