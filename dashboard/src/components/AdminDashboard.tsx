import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Autocomplete,
  TextField,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Machine, Customer, ParameterStatus, PLCParameter } from '../types';
import { MachineCard } from './MachineCard';
import { dataService } from '../services/dataService';
import { useUI } from '../contexts/UIContext';
import { signalRService } from '../services/signalRService';
import { formatNumber } from '../utils/formatters';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { searchTerm } = useUI();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');

  const loadData = () => {
    setCustomers(dataService.getCustomers());
    // Get all machines (including those without customers for admin view)
    let allMachines = dataService.getMachines();

    // Filter by customer
    if (selectedCustomer !== 'all') {
      allMachines = allMachines.filter(m => m.customerId === selectedCustomer);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      allMachines = allMachines.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.location?.toLowerCase().includes(term) ||
        m.line?.toLowerCase().includes(term)
      );
    }

    setMachines(allMachines);
  };

  useEffect(() => {
    loadData();

    // Start SignalR
    signalRService.start();

    // Subscribe to real-time updates
    const handleUpdate = () => {
      loadData(); // Reload data when any PLC value changes
    };

    signalRService.subscribe(handleUpdate);

    // Polling as fallback
    const interval = setInterval(loadData, 10000);

    return () => {
      clearInterval(interval);
      signalRService.unsubscribe(handleUpdate);
    };
  }, [selectedCustomer, searchTerm]);

  // Listen for dashboard reset event (when Dashboard button is clicked)
  useEffect(() => {
    const handleResetView = () => {
      // Navigate back to dashboard if we're on a machine detail page
      if (window.location.pathname.startsWith('/dashboard/machine/')) {
        navigate('/dashboard');
      }
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('dashboard-reset', handleResetView);
    return () => {
      window.removeEventListener('dashboard-reset', handleResetView);
    };
  }, [navigate]);

  const handleMachineClick = (machine: Machine) => {
    navigate(`/dashboard/machine/${machine.id}`);
  };

  const handleStatusCounterClick = (status: ParameterStatus) => {
    const shortBlast =
      dataService.getMachineById('machine-short-blast') ||
      machines.find(m => m.name.toLowerCase().includes('short blast')) ||
      machines[0];
    if (!shortBlast) return;
    navigate(`/dashboard/machine/${shortBlast.id}?status=${status}`);
  };

  const getParameterStatus = (parameter: PLCParameter): ParameterStatus => {
    if (parameter.currentValue === undefined || parameter.currentValue === null) {
      return parameter.currentStatus || 'Normal';
    }

    const value = typeof parameter.currentValue === 'number'
      ? parameter.currentValue
      : parseFloat(String(parameter.currentValue));
    if (isNaN(value)) return parameter.currentStatus || 'Normal';

    const range = parameter.maxValue - parameter.minValue;
    const warningThreshold = parameter.minValue + (range * 0.8);
    const criticalThreshold = parameter.minValue + (range * 0.9);

    if (value >= criticalThreshold) return 'Critical';
    if (value >= warningThreshold) return 'Warning';
    return 'Normal';
  };

  const parameterCounts = useMemo(() => {
    if (machines.length === 0) {
      return { normal: 0, warning: 0, critical: 0 };
    }

    let normal = 0;
    let warning = 0;
    let critical = 0;

    machines.forEach(machine => {
      const { parameters } = dataService.getParametersByMachine(machine.id, 0, 10000);
      parameters.forEach(param => {
        const status = getParameterStatus(param);
        if (status === 'Critical') critical += 1;
        else if (status === 'Warning') warning += 1;
        else normal += 1;
      });
    });

    return { normal, warning, critical };
  }, [machines]);

  const stats = {
    totalMachines: dataService.getMachines().length,
    totalCustomers: customers.length,
    normalParameters: parameterCounts.normal,
    warningParameters: parameterCounts.warning,
    criticalParameters: parameterCounts.critical,
  };

  const statCards: Array<{
    label: string;
    value: number;
    isWarning?: boolean;
    isActive?: boolean;
    isCritical?: boolean;
    onClick?: () => void;
  }> = [
      {
        label: 'TOTAL CUSTOMERS',
        value: stats.totalCustomers,
        onClick: () => navigate('/users?filter=approved'),
      },
      { label: 'TOTAL MACHINES', value: stats.totalMachines },
    ];

  if (selectedCustomer !== 'all') {
    statCards.push(
      {
        label: 'NORMAL',
        value: stats.normalParameters,
        isActive: true,
        onClick: () => handleStatusCounterClick('Normal'),
      },
      {
        label: 'WARNING',
        value: stats.warningParameters,
        isWarning: true,
        onClick: () => handleStatusCounterClick('Warning'),
      },
      {
        label: 'CRITICAL',
        value: stats.criticalParameters,
        isCritical: true,
        onClick: () => handleStatusCounterClick('Critical'),
      }
    );
  }

  return (
    <Container maxWidth="xl" sx={{ backgroundColor: (theme) => theme.palette.background.default, minHeight: '100vh', py: 3 }}>
      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: `repeat(${Math.min(2, statCards.length)}, 1fr)`, md: `repeat(${statCards.length}, 1fr)` }, gap: 2, mb: 3 }}>
        {statCards.map((stat, idx) => (
          <Paper
            key={idx}
            onClick={stat.onClick}
            sx={{
              p: 1.5,
              textAlign: 'center',
              borderRadius: 2,
              cursor: stat.onClick ? 'pointer' : 'default',
              userSelect: 'none',
              '& *': { userSelect: 'none' },
              transition: 'all 0.2s ease',
              '&:hover': stat.onClick ? {
                borderColor: (theme) => theme.palette.divider,
                backgroundColor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.02)'
                  : 'rgba(0,0,0,0.02)',
                transform: 'translateY(-1px)'
              } : {}
            }}
          >
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                fontSize: '1.75rem',
                color: (theme) => {
                  if (stat.isCritical && stat.value > 0) return '#ef5350';
                  if (stat.isWarning && stat.value > 0) return '#ffb74d';
                  if (stat.isActive) return theme.palette.text.primary;
                  return theme.palette.text.secondary;
                }
              }}
            >
              {formatNumber(stat.value)}
            </Typography>
            <Typography variant="caption" sx={{ color: (theme) => theme.palette.text.secondary, fontWeight: 600, letterSpacing: '0.05em', fontSize: '0.7rem' }}>{stat.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Dashboard Header */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
        <Typography variant="h6" fontWeight={700} sx={{ color: (theme) => theme.palette.text.primary, fontSize: '1.25rem' }}>
          Machine Monitoring
        </Typography>
        <Box display="flex" gap={1.5} alignItems="center">
          <Autocomplete
            size="small"
            sx={{ minWidth: 280 }}
            options={['all', ...customers.map(c => c.id)]}
            getOptionLabel={(option) => {
              if (option === 'all') return 'All Customers';
              const customer = customers.find(c => c.id === option);
              return customer ? customer.name : option;
            }}
            value={selectedCustomer}
            onChange={(_, newValue) => {
              setSelectedCustomer(newValue || 'all');
            }}
            autoHighlight
            selectOnFocus
            handleHomeEndKeys
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Customer"
                placeholder="Search or select industry..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(0,0,0,0.02)',
                  }
                }}
              />
            )}
          />
        </Box>
      </Box>

      {/* Machine Cards Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
        {machines.map((machine) => (
          <MachineCard
            key={machine.id}
            machine={machine}
            onClick={() => handleMachineClick(machine)}
            showCustomerName={true}
          />
        ))}
      </Box>
    </Container>
  );
};
