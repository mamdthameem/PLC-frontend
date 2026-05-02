// Auth & user management
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  industryName?: string;
  state?: string;
  password?: string;
  role: UserRole;
  customerId?: string;
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
  machineIds: string[];
  userIds: string[];
}

// Section 1 — plc_lifetime_parameters
export interface LifetimeParameter {
  parameterName: string;
  value: string;
  updatedAt: string;
}

// Section 2 — calculation_requests + plc_filtered_parameters
export interface FilterRequest {
  filterStart: string;   // ISO datetime string
  filterEnd: string;     // ISO datetime string
  periodLabel?: string | null;
}

export interface FilterStatus {
  status: 'pending' | 'processing' | 'done' | 'error';
  processedAt?: string | null;
}

export interface FilterResult {
  parameterName: string;
  value: string;
}

export type PeriodLabel = 'hour' | 'shift' | 'day' | 'week' | 'month' | 'year';
