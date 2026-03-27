import type { Machine, Customer, User, PLCParameter } from '../types';

/**
 * Demo data for Short Blast Machine as per client requirements
 */

export const DEMO_USERS: User[] = [
  {
    id: 'admin-1',
    email: 'Admin',
    name: 'Admin',
    password: 'admin123',
    role: 'admin',
    isApproved: true,
    assignedMachineIds: [],
    createdAt: new Date('2024-01-01'),
  },
];



export const DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'customer-1',
    name: 'Customer A',
    email: 'customer@example.com',
    createdAt: new Date('2024-01-01'),
    machineIds: ['machine-short-blast'],
    userIds: ['user-1'],
  },
];

export const DEMO_MACHINES: Machine[] = [
  {
    id: 'machine-short-blast',
    name: 'Short Blast Machine',
    plcAddress: '192.168.1.82',
    location: 'Production Floor',
    line: 'Line 1',
    status: 'Running',
    customerId: 'customer-1', // Assign to customer so it shows in admin dashboard
    parameterCount: 15,
    lastUpdate: new Date(),
  },
];

export const DEMO_PARAMETERS: PLCParameter[] = [
  // 1. Machine status - Tile
  {
    id: 'sb-machine_status',
    machineId: 'machine-short-blast',
    tagName: 'Machine status',
    address: 'DB1.DBX0.0',
    dataType: 'Bool',
    unit: '',
    minValue: 0,
    maxValue: 1,
    description: 'Machine running status',
    displayType: 'Tile',
    currentValue: 1,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(1, 1, 5),
  },
  // 2. Machine utility (%) - Tile & graph
  {
    id: 'sb-machine_utility',
    machineId: 'machine-short-blast',
    tagName: 'Machine utility (%)',
    address: 'DB1.DBD2',
    dataType: 'Real',
    unit: '%',
    minValue: 0,
    maxValue: 100,
    description: 'Machine utility percentage',
    displayType: 'Tile & graph',
    currentValue: 82.5,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(82.5, 100, 10),
  },
  // 3. Production Quantity (kg or Ton) - Tile & graph
  {
    id: 'sb-production_quantity',
    machineId: 'machine-short-blast',
    tagName: 'Production Quantity',
    address: 'DB1.DBD6',
    dataType: 'Real',
    unit: 'kg',
    minValue: 0,
    maxValue: 10000,
    description: 'Production quantity in kg or ton',
    displayType: 'Tile & graph',
    currentValue: 1250,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(1250, 10000, 10),
  },
  // 4. Energy consumption (kW) - Tile & graph
  {
    id: 'sb-energy_consumption',
    machineId: 'machine-short-blast',
    tagName: 'Energy consumption',
    address: 'DB1.DBD10',
    dataType: 'Real',
    unit: 'kW',
    minValue: 0,
    maxValue: 100,
    description: 'Energy consumption in kilowatts',
    displayType: 'Tile & graph',
    currentValue: 48.7,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(48.7, 100, 10),
  },
  // 5. ENERGY PER CASTING (kWh/kg) - Tile & graph
  {
    id: 'sb-energy_per_casting',
    machineId: 'machine-short-blast',
    tagName: 'ENERGY PER CASTING',
    address: 'DB1.DBD14',
    dataType: 'Real',
    unit: 'kWh/kg',
    minValue: 0,
    maxValue: 10,
    description: 'Energy consumption per casting',
    displayType: 'Tile & graph',
    currentValue: 0.92,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(0.92, 10, 10),
  },
  // 6. Tot. Blast time - Tile
  {
    id: 'sb-total_blast_time',
    machineId: 'machine-short-blast',
    tagName: 'Tot. Blast time',
    address: 'DB1.DBD18',
    dataType: 'Int',
    unit: 's',
    minValue: 0,
    maxValue: 86400,
    description: 'Total blast time in seconds',
    displayType: 'Tile',
    currentValue: 3600,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(3600, 86400, 10),
  },
  // 7. Effective Shots Usage (Index) - Tile
  {
    id: 'sb-effective_shots_usage',
    machineId: 'machine-short-blast',
    tagName: 'Effective Shots Usage',
    address: 'DB1.DBD22',
    dataType: 'Real',
    unit: 'Index',
    minValue: 0,
    maxValue: 1,
    description: 'Effective shots usage index',
    displayType: 'Tile',
    currentValue: 0.88,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(0.88, 1, 10),
  },
  // 8. Average Shot refill time - Tile and graph
  {
    id: 'sb-avg_shot_refill_time',
    machineId: 'machine-short-blast',
    tagName: 'Average Shot refill time',
    address: 'DB1.DBD26',
    dataType: 'Int',
    unit: 's',
    minValue: 0,
    maxValue: 300,
    description: 'Average shot refill time in seconds',
    displayType: 'Tile & graph',
    currentValue: 15,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(15, 300, 10),
  },
  // 9. CHAMBER-WISE UTILISATION (Pt. No. 2) - Tile (empty display type, defaulting to Tile)
  {
    id: 'sb-chamber_utilisation_p2',
    machineId: 'machine-short-blast',
    tagName: 'CHAMBER-WISE UTILISATION (Pt. No. 2)',
    address: 'DB1.DBD30',
    dataType: 'Real',
    unit: '%',
    minValue: 0,
    maxValue: 100,
    description: 'Chamber-wise utilisation point number 2',
    displayType: 'Tile',
    currentValue: 75.4,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(75.4, 100, 10),
  },
  // 10. CYCLE COUNT - Tile
  {
    id: 'sb-cycle_count',
    machineId: 'machine-short-blast',
    tagName: 'CYCLE COUNT',
    address: 'DB1.DBD34',
    dataType: 'Int',
    unit: '',
    minValue: 0,
    maxValue: 1000000,
    description: 'Total cycle count',
    displayType: 'Tile',
    currentValue: 245,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(245, 1000000, 10),
  },
  // 11. LAST REFILL TIME - Tile
  {
    id: 'sb-last_refill_time',
    machineId: 'machine-short-blast',
    tagName: 'LAST REFILL TIME',
    address: 'DB1.DBD38',
    dataType: 'String',
    unit: '',
    minValue: 0,
    maxValue: 1,
    description: 'Last refill time',
    displayType: 'Tile',
    currentValue: 1,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(1, 1, 10),
  },
  // 12. POP-UP FOR REGULAR MAINTENANCE (Pt. No. 14) - pop up
  {
    id: 'sb-maintenance_popup',
    machineId: 'machine-short-blast',
    tagName: 'POP-UP FOR REGULAR MAINTENANCE (Pt. No. 14)',
    address: 'DB1.DBX42.0',
    dataType: 'Bool',
    unit: '',
    minValue: 0,
    maxValue: 1,
    description: 'Regular maintenance popup indicator',
    displayType: 'pop up',
    currentValue: 0,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(0, 1, 10),
  },
  // 13. AMPS - VALUE - Tile & graph
  {
    id: 'sb-motor_amps',
    machineId: 'machine-short-blast',
    tagName: 'AMPS - VALUE',
    address: 'DB1.DBD44',
    dataType: 'Real',
    unit: 'A',
    minValue: 0,
    maxValue: 50,
    description: 'Motor current in amps',
    displayType: 'Tile & graph',
    currentValue: 18.6,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(18.6, 50, 10),
  },
  // 14. In Hmi - Consumables Spare-life based on blasting time. (No. 12) Input should be given by operator in HMI. - pop up
  {
    id: 'sb-consumable_spare_life',
    machineId: 'machine-short-blast',
    tagName: 'Consumables Spare-life',
    address: 'DB1.DBD48',
    dataType: 'Int',
    unit: '%',
    minValue: 0,
    maxValue: 100,
    description: 'Consumables spare life based on blasting time (Input by operator in HMI)',
    displayType: 'pop up',
    currentValue: 120,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(120, 100, 10),
  },
  // 15. REWORK* - Tile (empty display type, defaulting to Tile)
  {
    id: 'sb-rework_flag',
    machineId: 'machine-short-blast',
    tagName: 'REWORK*',
    address: 'DB1.DBX52.0',
    dataType: 'Bool',
    unit: '',
    minValue: 0,
    maxValue: 1,
    description: 'Rework flag indicator',
    displayType: 'Tile',
    currentValue: 0,
    currentStatus: 'Normal',
    timestamp: new Date(),
    values: generateTimeSeries(0, 1, 10),
  },
];

/**
 * Generate time-series data points with varied historical data
 * Generates data for the last 24 hours with different patterns for different time ranges
 */
function generateTimeSeries(baseValue: number | boolean, maxValue: number, points: number) {
  const now = new Date();
  const values: Array<{ timestamp: Date; value: number | string | boolean }> = [];

  if (typeof baseValue === 'boolean') {
    // For boolean values, generate data for last 24 hours (every 10 minutes)
    const hoursBack = 24;
    const intervalMinutes = 10;
    const totalPoints = (hoursBack * 60) / intervalMinutes;

    for (let i = totalPoints - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMinutes * 60000);
      values.push({
        timestamp,
        value: baseValue,
      });
    }
  } else {
    // For numeric values, generate data for last 24 hours with varying patterns
    const hoursBack = 24;
    const intervalMinutes = 10;
    const totalPoints = (hoursBack * 60) / intervalMinutes;
    const variation = (maxValue - baseValue) * 0.15;
    const minValue = 0; // Default min, can be adjusted per parameter if needed

    // Create different patterns for different time ranges:
    // - Last hour: higher values (100-110% of base) - recent activity
    // - Last 2-8 hours: medium values (90-100% of base) - shift activity  
    // - Older than 8 hours: lower values (70-90% of base) - historical

    for (let i = totalPoints - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMinutes * 60000);
      const hoursAgo = i * intervalMinutes / 60;

      // Calculate base multiplier based on how recent the data is
      let timeMultiplier = 1.0;
      if (hoursAgo <= 1) {
        // Last hour: 100-110% of base (most recent = highest)
        timeMultiplier = 1.0 + (1 - hoursAgo) * 0.1;
      } else if (hoursAgo <= 8) {
        // Last 2-8 hours: 90-100% of base (gradual decrease)
        timeMultiplier = 0.9 + (8 - hoursAgo) / 7 * 0.1;
      } else {
        // Older than 8 hours: 70-90% of base (historical, lower values)
        timeMultiplier = 0.7 + Math.min(1, (24 - hoursAgo) / 16) * 0.2;
      }

      // Add random variation
      const randomVariation = (Math.random() - 0.5) * 2 * variation;
      const adjustedBase = baseValue * timeMultiplier;
      const value = Math.max(minValue, Math.min(maxValue, adjustedBase + randomVariation));

      values.push({
        timestamp,
        value: Number(value.toFixed(2)),
      });
    }
  }

  return values;
}
