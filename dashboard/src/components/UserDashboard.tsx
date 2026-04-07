import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import type { Machine, ParameterStatus, PLCParameter } from '../types';
import { MachineCard } from './MachineCard';
import { dataService } from '../services/dataService';
import { signalRService } from '../services/signalRService';
import { formatDate, formatNumber } from '../utils/formatters';

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { searchTerm } = useUI();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);

  const loadData = () => {
    // Get all machines
    let allMachines = dataService.getMachines();

    // Filter by user's customer ID or assigned machine IDs
    const assignedSet = new Set(user?.assignedMachineIds || []);
    allMachines = allMachines.filter(m =>
      (user?.customerId && m.customerId === user.customerId) ||
      assignedSet.has(m.id)
    );

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

  const assignedIdsKey = (user?.assignedMachineIds || []).join('|');

  useEffect(() => {
    loadData();

    // Start SignalR
    signalRService.start();

    // Subscribe to real-time updates
    const handleUpdate = () => {
      loadData(); // Reload data when any PLC value changes
    };

    signalRService.subscribe(handleUpdate);

    return () => {
      signalRService.unsubscribe(handleUpdate);
    };
  }, [user?.customerId, assignedIdsKey, searchTerm]);

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
    const shortBlast =
      dataService.getMachineById('machine-short-blast') ||
      machines.find(m => m.name.toLowerCase().includes('short blast')) ||
      machines[0];
    if (!shortBlast) {
      return { normal: 0, warning: 0, critical: 0 };
    }

    const { parameters } = dataService.getParametersByMachine(shortBlast.id, 0, 10000);
    let normal = 0;
    let warning = 0;
    let critical = 0;
    parameters.forEach(param => {
      const status = getParameterStatus(param);
      if (status === 'Critical') critical += 1;
      else if (status === 'Warning') warning += 1;
      else normal += 1;
    });

    return { normal, warning, critical };
  }, [machines]);

  const stats = {
    totalMachines: machines.length,
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
      { label: 'TOTAL MACHINES', value: stats.totalMachines },
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
      },
    ];

  const validityInfo = user?.validUntil
    ? (() => {
      const expiry = new Date(user.validUntil);
      const now = new Date();
      const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { expiry, daysLeft, isExpired: daysLeft <= 0 };
    })()
    : null;

  const showValidityAlert = validityInfo ? validityInfo.daysLeft <= 7 : false;

  // Get customer name for display
  const customerName = user?.customerId
    ? dataService.getCustomerById(user.customerId)?.name
    : null;


  return (
    <Container maxWidth="xl" sx={{ backgroundColor: (theme) => theme.palette.background.default, minHeight: '100vh', py: 3 }}>
      {/* Welcome Section */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5, color: (theme) => theme.palette.text.primary, fontSize: '1.25rem' }}>
          Welcome, {user?.name}
        </Typography>
        {customerName && (
          <Typography variant="body2" sx={{ color: (theme) => theme.palette.text.secondary, fontSize: '0.875rem' }}>
            {customerName}
          </Typography>
        )}
        {showValidityAlert && validityInfo && (
          <Alert
            severity={validityInfo.isExpired ? 'error' : 'warning'}
            sx={{ mt: 1.5, fontSize: '0.8rem', py: 0.5 }}
          >
            {validityInfo.isExpired
              ? `Your access expired on ${formatDate(validityInfo.expiry)}. Please contact the administrator.`
              : `Your access expires in ${validityInfo.daysLeft} day(s) on ${formatDate(validityInfo.expiry)}.`}
          </Alert>
        )}
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
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

      {/* Your Machines heading */}
      <Box mb={3}>
        <Typography variant="h6" fontWeight={700} sx={{ color: (theme) => theme.palette.text.primary, fontSize: '1.25rem' }}>
          Your Machines
        </Typography>
      </Box>

      {/* Machine cards */}
      {machines.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
          {machines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              onClick={() => handleMachineClick(machine)}
              showCustomerName={false}
            />
          ))}
        </Box>
      ) : (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.02)'
              : 'rgba(0, 0, 0, 0.02)',
            border: (theme) => `1px dashed ${theme.palette.divider}`,
            borderRadius: 2,
            transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
          }}
        >
          <Typography color="text.secondary" fontWeight={600}>
            NO MACHINES ASSIGNED
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Contact your administrator to assign machines to your account.
          </Typography>
        </Paper>
      )}
    </Container>
  );
};
