import React from 'react';
import { Card, Typography, Box, Chip, Divider } from '@mui/material';
import type { Machine } from '../types';
import { StatusIndicator } from './StatusIndicator';
import FactoryIcon from '@mui/icons-material/Factory';
import BusinessIcon from '@mui/icons-material/Business';
import { dataService } from '../services/dataService';
import { formatTime } from '../utils/formatters';

interface MachineCardProps {
  machine: Machine;
  onClick?: () => void;
  showCustomerName?: boolean;
}

export const MachineCard: React.FC<MachineCardProps> = ({ machine, onClick, showCustomerName = false }) => {
  const customer = showCustomerName && machine.customerId
    ? dataService.getCustomerById(machine.customerId)
    : null;

  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          borderColor: (theme) => theme.palette.divider,
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 12px 24px rgba(0,0,0,0.4)'
            : '0 12px 24px rgba(0,0,0,0.15)',
        } : {},
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <FactoryIcon sx={{ color: (theme) => theme.palette.text.secondary }} />
            <Typography variant="h6" component="div" fontWeight={700} sx={{ letterSpacing: '-0.01em', color: (theme) => theme.palette.text.primary }}>
              {machine.name}
            </Typography>
          </Box>
          <StatusIndicator status={machine.status} />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box display="flex" flexDirection="column" gap={1.5}>
          {showCustomerName && customer && (
            <Box display="flex" alignItems="center" gap={1}>
              <BusinessIcon sx={{ fontSize: 18, color: (theme) => theme.palette.text.secondary }} />
              <Typography variant="body2" color="primary" fontWeight={700} sx={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                {customer.name.toUpperCase()}
              </Typography>
            </Box>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center" mt={showCustomerName && customer ? 0 : 1}>
            {machine.parameterCount !== undefined && (
              <Chip
                label={`${machine.parameterCount} TAGS`}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  borderRadius: 1,
                  backgroundColor: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.05)',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  color: (theme) => theme.palette.text.secondary
                }}
              />
            )}

            {machine.lastUpdate && (
              <Typography variant="caption" sx={{ color: (theme) => theme.palette.text.secondary, fontWeight: 600 }}>
                {formatTime(machine.lastUpdate)}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Card>
  );
};

