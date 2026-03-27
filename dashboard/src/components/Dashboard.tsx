import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Container,
  Paper,
  Alert,
} from '@mui/material';
import type { Machine } from '../types';
import { MachineCard } from './MachineCard';
import { MachineDetailView } from './MachineDetailView';
import { dataService } from '../services/dataService';

interface DashboardProps {
  onLoadData: () => Promise<void>;
  dataLoaded: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onLoadData, 
  dataLoaded 
}) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dataLoaded) {
      loadMachines();
    }
  }, [dataLoaded]);

  const loadMachines = () => {
    const loadedMachines = dataService.getMachines();
    setMachines(loadedMachines);
    // Update machine statuses based on parameter values
    dataService.updateMachineStatuses();
  };

  const handleMachineClick = (machine: Machine) => {
    setSelectedMachine(machine);
  };

  const handleBack = () => {
    setSelectedMachine(null);
    loadMachines(); // Refresh data when returning
  };

  if (!dataLoaded) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          Please upload machine metadata and parameter Excel files to begin.
        </Alert>
      </Container>
    );
  }

  if (selectedMachine) {
    return <MachineDetailView machine={selectedMachine} onBack={handleBack} />;
  }

  // Calculate statistics
  const stats = {
    total: machines.length,
    running: machines.filter(m => m.status === 'Running').length,
    stopped: machines.filter(m => m.status === 'Stopped').length,
    fault: machines.filter(m => m.status === 'Fault').length,
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Industrial IoT Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time PLC monitoring and analytics
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        <Paper
          sx={{
            p: 2,
            textAlign: 'center',
            backgroundColor: 'rgba(30, 30, 30, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography variant="h4" fontWeight={700} color="primary">
            {stats.total}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Machines
          </Typography>
        </Paper>
        <Paper
          sx={{
            p: 2,
            textAlign: 'center',
            backgroundColor: 'rgba(30, 30, 30, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography variant="h4" fontWeight={700} color="success.main">
            {stats.running}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Running
          </Typography>
        </Paper>
        <Paper
          sx={{
            p: 2,
            textAlign: 'center',
            backgroundColor: 'rgba(30, 30, 30, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography variant="h4" fontWeight={700} color="warning.main">
            {stats.stopped}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stopped
          </Typography>
        </Paper>
        <Paper
          sx={{
            p: 2,
            textAlign: 'center',
            backgroundColor: 'rgba(30, 30, 30, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography variant="h4" fontWeight={700} color="error.main">
            {stats.fault}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fault
          </Typography>
        </Paper>
      </Box>

      {/* Machine Cards */}
      {machines.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
          {machines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              onClick={() => handleMachineClick(machine)}
            />
          ))}
        </Box>
      ) : (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            backgroundColor: 'rgba(30, 30, 30, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography color="text.secondary">
            No machines found. Please upload machine data.
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

