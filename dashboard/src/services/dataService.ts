import type { Machine, PLCParameter, DashboardData, ParameterStatus, Customer, User } from '../types';
import { parseMachineExcel, parseParameterExcel } from '../utils/excelParser';
import { isUserExpired, daysUntil } from '../utils/formatters';
import { DEMO_MACHINES, DEMO_CUSTOMERS, DEMO_PARAMETERS, DEMO_USERS } from '../utils/demoData';

/**
 * Data Service Layer
 * Handles data loading from Excel files (and can be extended for database)
 */
export class DataService {
  private machines: Machine[] = [];
  private parameters: PLCParameter[] = [];
  private customers: Customer[] = [];
  private users: User[] = [];
  private readonly usersStorageKey = 'plc_gateway_users';

  constructor() {
    // Initialize with demo data
    this.loadDemoData();
  }

  /**
   * Load demo data for development/testing
   */
  private loadDemoData(): void {
    // Initialize machines as templates (no customer assignment initially)
    this.machines = DEMO_MACHINES.map(m => ({ ...m, customerId: undefined }));
    this.parameters = [...DEMO_PARAMETERS];

    // Load users from storage
    const storedUsers = this.loadUsersFromStorage();

    // Always ensure the demo admin exists
    const adminUser = DEMO_USERS.find(u => u.role === 'admin')!;
    if (storedUsers && storedUsers.length > 0) {
      this.users = storedUsers;
      if (!this.users.some(u => u.role === 'admin')) {
        this.users.unshift(adminUser);
      }
      this.customers = []; // Real customers will be synced from users
    } else {
      this.users = [...DEMO_USERS];
      this.customers = [...DEMO_CUSTOMERS];
    }

    // Rebuild/Sync customers from users to ensure dynamic industries are indexed
    this.users.forEach(u => this.syncUserToCustomer(u));

    this.applyUserValidityRules();

    // Update parameter counts and statuses
    this.updateMachineParameterCounts();
    this.parameters.forEach(p => {
      p.currentStatus = this.calculateParameterStatus(p);
    });
    this.updateMachineStatuses();
  }

  /**
   * Load users from localStorage (if available)
   */
  private loadUsersFromStorage(): User[] | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.usersStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Array<User & { createdAt?: string; validUntil?: string }>;

      return parsed.map(user => ({
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        validUntil: user.validUntil ? new Date(user.validUntil) : undefined,
        assignedMachineIds: user.assignedMachineIds || [],
      }));
    } catch (error) {
      console.error('Failed to load users from storage', error);
      return null;
    }
  }

  /**
   * Persist users to localStorage
   */
  private saveUsersToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const serializable = this.users.map(user => ({
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
        validUntil: user.validUntil ? new Date(user.validUntil).toISOString() : undefined,
      }));
      localStorage.setItem(this.usersStorageKey, JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to save users to storage', error);
    }
  }

  /**
   * Load machine metadata from Excel file
   */
  async loadMachinesFromExcel(file: File): Promise<Machine[]> {
    this.machines = await parseMachineExcel(file);
    // Update parameter counts for each machine
    this.updateMachineParameterCounts();
    return this.machines;
  }

  /**
   * Load parameters from Excel file
   */
  async loadParametersFromExcel(file: File): Promise<PLCParameter[]> {
    this.parameters = await parseParameterExcel(file);
    // Calculate current status for each parameter
    this.parameters.forEach(p => {
      p.currentStatus = this.calculateParameterStatus(p);
    });
    return this.parameters;
  }

  /**
   * Load both machine and parameter data
   */
  async loadAllData(machineFile: File, parameterFile: File): Promise<DashboardData> {
    const [machines, parameters] = await Promise.all([
      this.loadMachinesFromExcel(machineFile),
      this.loadParametersFromExcel(parameterFile)
    ]);

    return { machines, parameters };
  }

  /**
   * Get all machines
   */
  getMachines(): Machine[] {
    // Return all machines that have been assigned to a customer
    // This includes both demo clones and real industry clones.
    return this.machines.filter(m => m.customerId !== undefined);
  }

  /**
   * Get machine by ID
   */
  getMachineById(id: string): Machine | undefined {
    // First try exact ID match
    let machine = this.machines.find(m => m.id === id);
    
    // If not found, try matching by name (fallback for URL issues)
    if (!machine && id.toLowerCase().includes('machine')) {
      machine = this.machines.find(m => 
        m.name.toLowerCase() === id.toLowerCase() || 
        m.id.includes(id.split('-').slice(0, 3).join('-')) // Match first 3 parts of hyphenated ID
      );
    }
    
    return machine;
  }

  /**
   * Get parameters for a specific machine (cursor-based pagination)
   */
  getParametersByMachine(
    machineId: string,
    cursor?: number,
    limit: number = 20
  ): { parameters: PLCParameter[]; nextCursor?: number; hasMore: boolean } {
    const allParams = this.parameters.filter(p => p.machineId === machineId);
    const startIndex = cursor || 0;
    const endIndex = startIndex + limit;
    const paginatedParams = allParams.slice(startIndex, endIndex);

    return {
      parameters: paginatedParams,
      nextCursor: endIndex < allParams.length ? endIndex : undefined,
      hasMore: endIndex < allParams.length
    };
  }

  /**
   * Get parameter by ID
   */
  getParameterById(id: string): PLCParameter | undefined {
    return this.parameters.find(p => p.id === id);
  }

  /**
   * Search parameters by machine and tag name
   */
  searchParameters(machineId: string, searchTerm: string): PLCParameter[] {
    return this.parameters.filter(p =>
      p.machineId === machineId &&
      (p.tagName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  /**
   * Update machine status based on parameter values
   */
  updateMachineStatuses(): void {
    this.machines.forEach(machine => {
      const machineParams = this.parameters.filter(p => p.machineId === machine.id);

      if (machineParams.length === 0) {
        machine.status = 'Unknown';
        return;
      }

      // Check for critical parameters
      const hasCritical = machineParams.some(p => p.currentStatus === 'Critical');
      if (hasCritical) {
        machine.status = 'Fault';
        return;
      }

      // Check for warnings
      const hasWarnings = machineParams.some(p => p.currentStatus === 'Warning');
      if (hasWarnings) {
        machine.status = 'Stopped';
        return;
      }

      // Default to Running if all parameters are normal
      machine.status = 'Running';
    });
  }

  /**
   * Calculate parameter status based on thresholds
   */
  private calculateParameterStatus(parameter: PLCParameter): ParameterStatus {
    if (parameter.currentValue === undefined || parameter.currentValue === null) {
      return 'Normal';
    }

    const value = typeof parameter.currentValue === 'number' ? parameter.currentValue : parseFloat(String(parameter.currentValue));
    if (isNaN(value)) return 'Normal';

    const range = parameter.maxValue - parameter.minValue;

    // Calculate thresholds as percentages of the range from minValue
    // Warning: 80% of the way from min to max
    // Critical: 90% of the way from min to max
    const warningThreshold = parameter.minValue + (range * 0.8);
    const criticalThreshold = parameter.minValue + (range * 0.9);

    // Check if value exceeds critical threshold (90% of max)
    if (value >= criticalThreshold) {
      return 'Critical';
    }

    // Check if value exceeds warning threshold (80% of max)
    if (value >= warningThreshold) {
      return 'Warning';
    }

    return 'Normal';
  }

  /**
   * Update parameter counts for each machine
   */
  private updateMachineParameterCounts(): void {
    this.machines.forEach(machine => {
      machine.parameterCount = this.parameters.filter(p => p.machineId === machine.id).length;
    });
  }

  /**
   * Get time-series data for a parameter (with cursor-based pagination)
   */
  getParameterTimeSeries(
    parameterId: string,
    cursor?: number,
    limit: number = 100
  ): { values: Array<{ timestamp: Date; value: number | string | boolean }>; nextCursor?: number; hasMore: boolean } {
    const parameter = this.getParameterById(parameterId);
    if (!parameter || !parameter.values) {
      return { values: [], hasMore: false };
    }

    const startIndex = cursor || 0;
    const endIndex = startIndex + limit;
    const paginatedValues = parameter.values.slice(startIndex, endIndex);

    return {
      values: paginatedValues.map(v => ({
        timestamp: v.timestamp,
        value: v.value
      })),
      nextCursor: endIndex < parameter.values.length ? endIndex : undefined,
      hasMore: endIndex < parameter.values.length
    };
  }

  /**
   * Get machines assigned to a specific user (role-based filtering)
   */
  getMachinesByUserId(userId: string): Machine[] {
    const user = this.users.find(u => u.id === userId);
    if (!user) return [];

    if (user.role === 'admin') {
      // Admin sees all customer machines (no "My Machines" section anymore)
      return this.machines.filter(m => m.customerId !== undefined);
    }

    // User sees ONLY machines explicitly assigned to them
    return this.machines.filter(m =>
      user.assignedMachineIds.includes(m.id)
    );
  }

  /**
   * Get all customer machines (for admin to view customers)
   */
  getCustomerMachines(): Machine[] {
    // Return all machines (templates + clones) so they can be assigned in User Management
    return this.machines;
  }

  /**
   * Get only template machines (one per logical machine type) for assigning in User Management.
   * Avoids duplicate names caused by customer-specific clones.
   */
  getMachineTemplates(): Machine[] {
    return this.machines.filter(m => !m.customerId);
  }

  /**
   * Get all customers
   */
  getCustomers(): Customer[] {
    // Don't show demo "Customer A" if real customers exist
    const hasRealCustomers = this.customers.some(c => c.id !== 'customer-1');
    if (hasRealCustomers) {
      return this.customers.filter(c => c.id !== 'customer-1');
    }
    return this.customers;
  }

  /**
   * Get customer by ID
   */
  getCustomerById(customerId: string): Customer | undefined {
    return this.customers.find(c => c.id === customerId);
  }

  /**
   * Add customer (for admin)
   */
  addCustomer(customer: Customer): void {
    this.customers.push(customer);
  }

  /**
   * Assign machine to customer
   */
  assignMachineToCustomer(machineId: string, customerId: string): void {
    const machine = this.machines.find(m => m.id === machineId);
    if (machine) {
      machine.customerId = customerId;

      // Update customer's machine list
      const customer = this.customers.find(c => c.id === customerId);
      if (customer && !customer.machineIds.includes(machineId)) {
        customer.machineIds.push(machineId);
      }
    }
  }

  /**
   * Get all users
   */
  getUsers(): User[] {
    this.applyUserValidityRules();
    return this.users;
  }

  /**
   * Get non-admin users whose access expires within the next N days (and not yet expired).
   */
  getUsersExpiringWithinDays(days: number): User[] {
    this.applyUserValidityRules();
    return this.users.filter(u => {
      if (u.role === 'admin' || !u.validUntil || !u.isApproved) return false;
      if (isUserExpired(u.validUntil)) return false;
      const d = daysUntil(u.validUntil);
      return d !== null && d >= 0 && d <= days;
    });
  }

  /**
   * Add a new user
   */
  addUser(user: User): void {
    this.users.push(user);
    this.syncUserToCustomer(user);
    this.applyUserValidityRules();
    this.saveUsersToStorage();
  }

  /**
   * Update an existing user
   */
  updateUser(updatedUser: User): void {
    const index = this.users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      this.users[index] = updatedUser;
      this.syncUserToCustomer(updatedUser);
      this.applyUserValidityRules();
      this.saveUsersToStorage();
    }
  }

  /**
   * Ensure user's industry/company exists in customers list
   */
  private syncUserToCustomer(user: User): void {
    if (!user.industryName) return;

    // Check if customer with this name exists
    let customer = this.customers.find(c => c.name === user.industryName);

    if (!customer) {
      // Create new customer
      customer = {
        id: `customer-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: user.industryName,
        email: user.email,
        createdAt: new Date(),
        machineIds: [],
        userIds: [user.id]
      };
      this.customers.push(customer);
    } else {
      // Update existing customer association
      if (!customer.userIds.includes(user.id)) {
        customer.userIds.push(user.id);
      }
    }

    // Link user to customer ID
    user.customerId = customer.id;

    // Ensure machines assigned to user exist for this customer
    // We clone the "template" machines for each customer to ensure isolation
    const specificMachineIds: string[] = [];
    (user.assignedMachineIds || []).forEach(mId => {
      // Find the source template for this machine ID
      // It could be the direct ID (if template) or the prefix of a cloned ID
      const sourceMachine = this.machines.find(m =>
        m.id === mId || (mId.startsWith(m.id + '-') && !m.customerId)
      );

      if (!sourceMachine) {
        specificMachineIds.push(mId);
        return;
      }

      // If it's already a customer-specific clone in memory, just keep it
      if (sourceMachine.customerId === customer?.id) {
        specificMachineIds.push(sourceMachine.id);
        return;
      }

      // Otherwise, we need to clone (or re-clone from template)
      const clonedId = `${sourceMachine.id}-${customer!.id}`;
      specificMachineIds.push(clonedId);

      if (!this.machines.some(m => m.id === clonedId)) {
        // Clone the machine
        const clonedMachine: Machine = {
          ...sourceMachine,
          id: clonedId,
          customerId: customer!.id
        };
        this.machines.push(clonedMachine);

        // Clone the parameters for this machine
        const sourceParams = this.parameters.filter(p => p.machineId === sourceMachine.id);
        sourceParams.forEach(p => {
          this.parameters.push({
            ...p,
            id: `${p.id}-${customer!.id}`,
            machineId: clonedId
          });
        });
      }
    });

    // Update user's assigned IDs to point to clones
    user.assignedMachineIds = specificMachineIds;

    // Sync back to customer
    customer.machineIds = Array.from(new Set([...customer.machineIds, ...specificMachineIds]));
  }

  /**
   * Delete a user
   */
  deleteUser(userId: string): void {
    this.users = this.users.filter(u => u.id !== userId);
    this.saveUsersToStorage();
  }

  /**
   * Assign machines to a user
   */
  assignMachinesToUser(userId: string, machineIds: string[]): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.assignedMachineIds = machineIds;
      this.applyUserValidityRules();
      this.saveUsersToStorage();
    }
  }

  /**
   * Auto-unapprove users whose validity has expired
   */
  private applyUserValidityRules(): void {
    let updated = false;
    this.users = this.users.map(user => {
      if (isUserExpired(user.validUntil) && user.isApproved) {
        updated = true;
        return { ...user, isApproved: false };
      }
      return user;
    });

    if (updated) {
      this.saveUsersToStorage();
    }
  }
}

// Singleton instance
export const dataService = new DataService();

