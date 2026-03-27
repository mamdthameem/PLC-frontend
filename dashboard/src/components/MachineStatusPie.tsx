import React from 'react';
import { Box, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Machine } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface MachineStatusPieProps {
  machines: Machine[];
}

export const MachineStatusPie: React.FC<MachineStatusPieProps> = ({ machines }) => {
  const { mode } = useTheme();
  const isLight = mode === 'light';
  
  // Count online vs offline machines
  // Online = Running status, Offline = all other statuses
  const statusCounts = machines.reduce((acc, machine) => {
    const isOnline = machine.status === 'Running';
    const status = isOnline ? 'Online' : 'Offline';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = {
    'Online': '#32d583',   // Green for online
    'Offline': '#6b7280',  // Gray for offline
  };

  const getColor = (name: string) => COLORS[name as keyof typeof COLORS] || '#6b7280';

  if (data.length === 0) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">No machine data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="50%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number | undefined, name: string | undefined) => {
              const val = value ?? 0;
              const label = name ?? 'Unknown';
              return [`${val} machines`, label];
            }}
            contentStyle={{
              backgroundColor: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.95)',
              border: isLight 
                ? '1px solid rgba(0, 0, 0, 0.1)' 
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: isLight ? '#1a1a1a' : '#ffffff',
              boxShadow: isLight 
                ? '0 4px 12px rgba(0, 0, 0, 0.15)' 
                : '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Custom Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5, mt: 1 }}>
        {data.map((entry) => (
          <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: getColor(entry.name),
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: (theme) => theme.palette.text.primary,
                fontSize: '0.7rem',
                fontWeight: 500,
              }}
            >
              {entry.name}: {entry.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
