import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { MachineDetailView } from './MachineDetailView';
import { dataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import type { ParameterStatus } from '../types';

export const MachineDetailRoute: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Get status filter from URL query parameter
  const statusFilterParam = searchParams.get('status') as ParameterStatus | null;
  const statusFilter = statusFilterParam && ['Normal', 'Warning', 'Critical'].includes(statusFilterParam)
    ? statusFilterParam
    : null;

  // Redirect to dashboard if machineId is missing or invalid
  useEffect(() => {
    if (!machineId) {
      setIsRedirecting(true);
      const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 500);
      return () => clearTimeout(timer);
    }

    const machine = dataService.getMachineById(machineId);

    if (!machine) {
      setIsRedirecting(true);
      const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 500);
      return () => clearTimeout(timer);
    }
  }, [machineId, navigate]);

  if (isRedirecting) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Redirecting to dashboard...
        </Typography>
      </Box>
    );
  }

  const machine = dataService.getMachineById(machineId!);

  if (!machine) {
    return null;
  }

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <MachineDetailView
      machine={machine}
      onBack={handleBack}
      showCustomerInfo={isAdmin}
      statusFilter={statusFilter}
    />
  );
};
