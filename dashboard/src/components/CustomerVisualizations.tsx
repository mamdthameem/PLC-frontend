import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import type { Machine, Customer, PLCParameter } from '../types';
import { ParameterChart } from './ParameterChart';
import { MachineStatusIndicator } from './MachineStatusIndicator';
import { useTheme } from '../contexts/ThemeContext';
import { dataService } from '../services/dataService';

// Parameter display type mapping (as per client requirements)
const PARAMETER_DISPLAY_TYPES: Record<string, 'Tile' | 'Tile & graph' | 'pop up'> = {
  'machine_status': 'Tile',
  'machine_utility': 'Tile & graph',
  'production_quantity': 'Tile & graph',
  'energy_consumption': 'Tile & graph',
  'energy_per_casting': 'Tile & graph',
  'total_blast_time': 'Tile',
  'effective_shots_usage': 'Tile',
  'avg_shot_refill_time': 'Tile & graph',
  'chamber_utilisation_p2': 'Tile',
  'cycle_count': 'Tile',
  'last_refill_time': 'Tile',
  'maintenance_popup': 'pop up',
  'motor_amps': 'Tile & graph',
  'consumable_spare_life': 'pop up',
  'rework_flag': 'Tile',
};

interface CustomerVisualizationsProps {
  customers: Customer[];
  machines: Machine[];
  showCustomerName?: boolean;
}

export const CustomerVisualizations: React.FC<CustomerVisualizationsProps> = ({
  customers,
  machines,
  showCustomerName = true,
}) => {
  const { mode } = useTheme();

  // Group machines by customer
  const machinesByCustomer = useMemo(() => {
    const grouped: Record<string, { customer: Customer; machines: Machine[] }> = {};

    // Add machines with customers
    machines.forEach(machine => {
      if (machine.customerId) {
        const customer = customers.find(c => c.id === machine.customerId);
        if (customer) {
          if (!grouped[customer.id]) {
            grouped[customer.id] = { customer, machines: [] };
          }
          grouped[customer.id].machines.push(machine);
        }
      }
    });

    // Add machines without customers to "Unassigned" group
    const unassignedMachines = machines.filter(m => !m.customerId);
    if (unassignedMachines.length > 0) {
      grouped['unassigned'] = {
        customer: {
          id: 'unassigned',
          name: 'Unassigned Machines',
          email: '',
          createdAt: new Date(),
          machineIds: [],
          userIds: [],
        },
        machines: unassignedMachines,
      };
    }

    return grouped;
  }, [machines, customers]);

  // Get parameters for a machine
  const getMachineParameters = (machineId: string): PLCParameter[] => {
    const { parameters } = dataService.getParametersByMachine(machineId, 0, 10000);
    // Filter out "pop up" type parameters as they shouldn't be displayed on dashboard
    return parameters.filter(p => {
      const displayType = p.displayType || PARAMETER_DISPLAY_TYPES[p.address] || 'Tile';
      return displayType !== 'pop up';
    });
  };

  // Get display type for parameter
  const getDisplayType = (parameter: PLCParameter): 'Tile' | 'Tile & graph' => {
    return (parameter.displayType || PARAMETER_DISPLAY_TYPES[parameter.address] || 'Tile') as 'Tile' | 'Tile & graph';
  };

  if (Object.keys(machinesByCustomer).length === 0) {
    return (
      <Paper
        sx={{
          p: 2,
          textAlign: 'center',
          backgroundColor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(255, 255, 255, 0.02)'
            : 'rgba(0, 0, 0, 0.02)',
          border: (theme) => `1px dashed ${theme.palette.divider}`,
          borderRadius: 5,
        }}
      >
        <Typography color="text.secondary" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
          NO MACHINES AVAILABLE
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {Object.values(machinesByCustomer).map(({ customer, machines: customerMachines }) => (
        <Box key={customer.id} sx={{ mb: 4 }}>
          {/* Customer Header */}
          {showCustomerName && (
            <>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  mb: 2,
                  color: (theme) => theme.palette.text.primary,
                  letterSpacing: '0.02em',
                  fontSize: '1.25rem',
                }}
              >
                {customer.name.toUpperCase()}
              </Typography>
              <Divider sx={{ mb: 3 }} />
            </>
          )}

          {/* Machines for this customer */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                lg: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {customerMachines.map((machine) => {
              const parameters = getMachineParameters(machine.id);

              if (parameters.length === 0) {
                return null;
              }

              const statusParam = parameters.find(p =>
                p.address === 'machine_status' ||
                p.tagName?.toLowerCase().includes('machine status')
              );

              const displayParams = parameters.filter(p => {
                const displayType = getDisplayType(p);
                return displayType === 'Tile' &&
                  p.address !== 'machine_status' &&
                  !p.tagName?.toLowerCase().includes('machine status');
              }).slice(0, 4);

              const chartParam = parameters.find(p => getDisplayType(p) === 'Tile & graph');

              return (
                <Paper
                  key={machine.id}
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    borderRadius: 4,
                    backgroundColor: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(30, 41, 59, 0.4)'
                      : '#ffffff',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: (theme) => theme.palette.mode === 'dark'
                        ? '0 12px 24px rgba(0,0,0,0.4)'
                        : '0 12px 24px rgba(0,0,0,0.08)',
                    }
                  }}
                >
                  {/* Card Header: Name + Animated Status */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                    <Box>
                      <Typography variant="h6" fontWeight={700} color="text.primary">
                        {machine.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {machine.location || 'N/A'} • {machine.line || 'N/A'}
                      </Typography>
                    </Box>
                    <MachineStatusIndicator
                      status={statusParam ? (statusParam.currentValue === 1) : (machine.status === 'Running')}
                    />
                  </Box>

                  <Divider sx={{ mb: 2, borderStyle: 'dashed' }} />

                  {/* Key Parameters Mini-Grid */}
                  {displayParams.length > 0 && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                      {displayParams.map(param => (
                        <Box key={param.id}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>
                            {param.tagName.toUpperCase()}
                          </Typography>
                          <Typography variant="body1" fontWeight={700} color="primary">
                            {param.currentValue}{param.unit}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Primary Visualization (Speedometer or Graph) */}
                  {chartParam ? (
                    <Box sx={{ height: 200, width: '100%' }}>
                      <ParameterChart parameter={chartParam} theme={mode} height={200} />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: 180,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                        borderRadius: 2
                      }}
                    >
                      <Typography variant="caption" color="text.disabled">
                        No live charts available
                      </Typography>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
