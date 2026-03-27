import React from 'react';
import { Box, Typography } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PLCParameter } from '../types';
import { formatTime } from '../utils/formatters';
import { useTheme } from '../contexts/ThemeContext';

interface ParameterChartProps {
  parameter: PLCParameter;
  dataPoints?: number;
  theme?: 'light' | 'dark';
  height?: number;
}

export const ParameterChart: React.FC<ParameterChartProps> = ({
  parameter,
  dataPoints = 50, // Balanced for smooth curves and clarity
  theme = 'dark',
  height = 350
}) => {
  const { mode } = useTheme();
  const isLight = theme === 'light' || mode === 'light';

  if (!parameter.values || parameter.values.length === 0) {
    return (
      <Box
        sx={{
          p: 2,
          textAlign: 'center',
          height: height || 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.75rem' }}>
          No historical data available
        </Box>
      </Box>
    );
  }

  const data = parameter.values.length > dataPoints
    ? parameter.values
      .filter((_, index) => index % Math.ceil(parameter.values!.length / dataPoints) === 0)
      .slice(-dataPoints)
    : parameter.values;

  // Convert to recharts format with visible points
  const chartData = data.map((point) => {
    const timestamp = point.timestamp instanceof Date
      ? point.timestamp
      : new Date(point.timestamp);
    const value = typeof point.value === 'number' ? point.value : parseFloat(String(point.value)) || 0;
    return {
      time: formatTime(timestamp, { hour: '2-digit', minute: '2-digit', hour12: true }),
      value: value,
      timestamp: timestamp.getTime(),
    };
  });

  // Get color based on status
  const getStatusColor = () => {
    if (isLight) {
      switch (parameter.currentStatus) {
        case 'Critical': return ['#dc2626'];
        case 'Warning': return ['#ea580c'];
        default: return ['#3b82f6'];
      }
    } else {
      switch (parameter.currentStatus) {
        case 'Critical': return ['#ff5470'];
        case 'Warning': return ['#fdb022'];
        default: return ['#64b5f6'];
      }
    }
  };

  const colorScheme = getStatusColor();

  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: height || 350, 
        position: 'relative',
        p: 2,
        borderRadius: 2,
        backgroundColor: (theme) => 
          theme.palette.mode === 'dark' 
            ? 'rgba(26, 26, 46, 0.6)' 
            : '#ffffff',
        border: (theme) => 
          theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 4px 12px rgba(0, 0, 0, 0.3)'
            : '0 2px 8px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Chart Title */}
      <Typography
        variant="h6"
        fontWeight={600}
        sx={{
          mb: 2,
          color: (theme) => theme.palette.text.primary,
          fontSize: '0.9rem',
          letterSpacing: '0.01em',
        }}
      >
        {parameter.tagName}
      </Typography>
      
      <Box sx={{ height: (height || 350) - 60, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id={`gradient-${parameter.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorScheme[0]} stopOpacity={0.4} />
                <stop offset="50%" stopColor={colorScheme[0]} stopOpacity={0.15} />
                <stop offset="100%" stopColor={colorScheme[0]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)'}
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ 
                fill: isLight ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.5)', 
                fontSize: 10,
                fontWeight: 500
              }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={50}
              dy={8}
            />
            <YAxis
              tick={{ 
                fill: isLight ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.5)', 
                fontSize: 10,
                fontWeight: 500
              }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(value) => {
                if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
                if (value >= 1) return value.toFixed(0);
                return value.toFixed(2);
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.98)',
                border: isLight 
                  ? '1px solid rgba(0, 0, 0, 0.1)' 
                  : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: isLight ? '#000000' : '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '8px 12px',
              }}
              labelStyle={{
                color: isLight ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '11px',
                fontWeight: 500,
                marginBottom: '4px',
              }}
              itemStyle={{
                color: isLight ? '#000000' : '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
              }}
              formatter={(value: number) => [
                `${value.toFixed(2)} ${parameter.unit || ''}`,
                parameter.tagName
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={colorScheme[0]}
              strokeWidth={2.5}
              fill={`url(#gradient-${parameter.id})`}
              dot={false}
              activeDot={{ 
                r: 6, 
                fill: '#ffffff',
                stroke: colorScheme[0], 
                strokeWidth: 2.5,
                strokeOpacity: 1
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

