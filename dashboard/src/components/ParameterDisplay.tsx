import React from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';
import type { PLCParameter } from '../types';
import { StatusIndicator } from './StatusIndicator';
import { MachineStatusIndicator } from './MachineStatusIndicator';
import { formatDateTime } from '../utils/formatters';

interface ParameterDisplayProps {
  parameter: PLCParameter;
  showChart?: boolean;
}

export const ParameterDisplay: React.FC<ParameterDisplayProps> = ({
  parameter
}) => {
  // Check if this parameter has filtered stats (from time filter)
  const hasFilteredStats = (parameter as any)._filteredStats;
  const filteredStats = hasFilteredStats ? (parameter as any)._filteredStats : null;
  const originalValue = (parameter as any)._originalValue;

  const value = parameter.currentValue ?? 0;
  const range = parameter.maxValue - parameter.minValue;
  const normalizedValue = range > 0
    ? ((value - parameter.minValue) / range) * 100
    : 0;

  const getProgressColor = () => {
    switch (parameter.currentStatus) {
      case 'Critical':
        return 'error';
      case 'Warning':
        return 'warning';
      default:
        return 'primary';
    }
  };

  if (parameter.address === 'machine_status' || parameter.tagName?.toLowerCase().includes('machine status')) {
    return (
      <Paper
        sx={{
          p: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, color 0.3s ease',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            {parameter.tagName}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="center" alignItems="center" flex={1} py={3}>
          <MachineStatusIndicator
            status={parameter.currentValue === 1}
            parameterStatus={parameter.currentStatus}
          />
        </Box>

        {parameter.description && (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 'auto' }}>
            {parameter.description}
          </Typography>
        )}

        {parameter.timestamp && (
          <Typography variant="caption" color="text.secondary" mt={1} display="block">
            Updated: {formatDateTime(parameter.timestamp)}
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, color 0.3s ease',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            {parameter.tagName}
          </Typography>
        </Box>
        <StatusIndicator status={parameter.currentStatus || 'Normal'} size="small" />
      </Box>

      <Box mt={2}>
        {hasFilteredStats && (
          <Typography variant="caption" color="info.main" sx={{ mb: 0.5, display: 'block', fontWeight: 600 }}>
            ⏱️ Filtered: Avg of {filteredStats.count} readings
          </Typography>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={1}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="primary">
              {typeof value === 'number' ? value.toFixed(2) : value}
            </Typography>
            {hasFilteredStats && originalValue !== undefined && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Original: {typeof originalValue === 'number' ? originalValue.toFixed(2) : originalValue}
              </Typography>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {parameter.unit}
          </Typography>
        </Box>
        {hasFilteredStats && (
          <Box display="flex" gap={1} mb={1}>
            <Typography variant="caption" color="success.main">
              Max: {filteredStats.max.toFixed(2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              |
            </Typography>
            <Typography variant="caption" color="error.main">
              Min: {filteredStats.min.toFixed(2)}
            </Typography>
          </Box>
        )}

        <LinearProgress
          variant="determinate"
          value={Math.min(Math.max(normalizedValue, 0), 100)}
          color={getProgressColor()}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.07)',
            mt: 1,
            transition: 'background-color 0.3s ease',
          }}
        />

        <Box display="flex" justifyContent="space-between" mt={1}>
          <Typography variant="caption" color="text.secondary">
            Min: {parameter.minValue} {parameter.unit}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Max: {parameter.maxValue} {parameter.unit}
          </Typography>
        </Box>
      </Box>

      {parameter.description && (
        <Typography variant="body2" color="text.secondary" mt={2} sx={{ fontStyle: 'italic' }}>
          {parameter.description}
        </Typography>
      )}

      {parameter.timestamp && (
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          Updated: {formatDateTime(parameter.timestamp)}
        </Typography>
      )}
    </Paper>
  );
};

