import React from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Chip,
} from '@mui/material';
import type { PLCParameter } from '../types';
import { formatDateTime } from '../utils/formatters';
import { formatNumber } from '../utils/formatters';

interface ParameterTileProps {
  parameter: PLCParameter;
}

export const ParameterTile: React.FC<ParameterTileProps> = ({ parameter }) => {

  const value = parameter.currentValue ?? 0;
  const minValue = parameter.minValue ?? 0;
  const maxValue = parameter.maxValue ?? 100;
  const range = maxValue - minValue;
  const normalizedValue = range > 0
    ? Math.min(Math.max(((value - minValue) / range) * 100, 0), 100)
    : 0;

  const getStatusColor = () => {
    switch (parameter.currentStatus) {
      case 'Critical':
        return { bg: '#ff5470', text: '#ffffff' };
      case 'Warning':
        return { bg: '#fdb022', text: '#ffffff' };
      default:
        return { bg: '#32d583', text: '#ffffff' };
    }
  };

  const statusColors = getStatusColor();
  const progressColor = parameter.currentStatus === 'Critical' 
    ? '#ff5470' 
    : parameter.currentStatus === 'Warning' 
    ? '#fdb022' 
    : '#a48fff';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: (theme) => 
          theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.03)' 
            : '#ffffff',
        border: (theme) => 
          theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 2px 8px rgba(0, 0, 0, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 4px 16px rgba(0, 0, 0, 0.4)'
              : '0 4px 16px rgba(0, 0, 0, 0.12)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      {/* Header with Title and Status */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{
            color: (theme) => theme.palette.text.primary,
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            flex: 1,
          }}
        >
          {parameter.tagName}
        </Typography>
        <Chip
          label={parameter.currentStatus || 'Normal'}
          size="small"
          sx={{
            backgroundColor: statusColors.bg,
            color: statusColors.text,
            fontWeight: 600,
            fontSize: '0.65rem',
            height: 20,
            '& .MuiChip-label': {
              px: 1,
            },
          }}
          icon={
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: statusColors.text,
              }}
            />
          }
        />
      </Box>

      {/* Large Value Display */}
      <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={1.5}>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{
            color: '#a48fff',
            fontSize: '1.25rem',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {typeof value === 'number' 
            ? formatNumber(value, { 
                minimumFractionDigits: parameter.unit === '%' ? 0 : 2,
                maximumFractionDigits: parameter.unit === '%' ? 0 : 2,
              })
            : value}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: (theme) => theme.palette.text.primary,
            fontWeight: 500,
            ml: 1,
            fontSize: '0.75rem',
          }}
        >
          {parameter.unit}
        </Typography>
      </Box>

      {/* Progress Bar */}
      <LinearProgress
        variant="determinate"
        value={normalizedValue}
        sx={{
          height: 6,
          borderRadius: 3,
          backgroundColor: (theme) => 
            theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
          mb: 1.5,
          '& .MuiLinearProgress-bar': {
            backgroundColor: progressColor,
            borderRadius: 3,
          },
        }}
      />

      {/* Min/Max Range */}
      <Box display="flex" justifyContent="space-between" mb={1.5}>
        <Typography
          variant="caption"
          sx={{
            color: (theme) => theme.palette.text.secondary,
            fontSize: '0.65rem',
          }}
        >
          Min: {minValue} {parameter.unit}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: (theme) => theme.palette.text.secondary,
            fontSize: '0.65rem',
          }}
        >
          Max: {maxValue} {parameter.unit}
        </Typography>
      </Box>

      {/* Description */}
      {parameter.description && (
        <Typography
          variant="body2"
          sx={{
            color: (theme) => theme.palette.text.secondary,
            fontStyle: 'italic',
            mb: 1,
            fontSize: '0.7rem',
          }}
        >
          {parameter.description}
        </Typography>
      )}

      {/* Timestamp */}
      {parameter.timestamp && (
        <Typography
          variant="caption"
          sx={{
            color: (theme) => theme.palette.text.secondary,
            fontSize: '0.65rem',
          }}
        >
          Updated: {formatDateTime(parameter.timestamp)}
        </Typography>
      )}
    </Paper>
  );
};
