import React from 'react';
import { Chip } from '@mui/material';
import type { MachineStatus, ParameterStatus } from '../types';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import BuildIcon from '@mui/icons-material/Build';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface StatusIndicatorProps {
  status: MachineStatus | ParameterStatus;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  size = 'medium',
  variant = 'filled' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'Running':
      case 'Normal':
        return {
          color: 'success' as const,
          icon: <CheckCircleIcon fontSize="small" />,
          label: status
        };
      case 'Warning':
        return {
          color: 'warning' as const,
          icon: <WarningIcon fontSize="small" />,
          label: status
        };
      case 'Critical':
      case 'Fault':
        return {
          color: 'error' as const,
          icon: <ErrorIcon fontSize="small" />,
          label: status
        };
      case 'Stopped':
        return {
          color: 'default' as const,
          icon: <StopCircleIcon fontSize="small" />,
          label: status
        };
      case 'Maintenance':
        return {
          color: 'info' as const,
          icon: <BuildIcon fontSize="small" />,
          label: status
        };
      default:
        return {
          color: 'default' as const,
          icon: <HelpOutlineIcon fontSize="small" />,
          label: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 600,
        '& .MuiChip-icon': {
          color: 'inherit'
        }
      }}
    />
  );
};

