import React from 'react';
import { Card, CardContent, Typography, Box, Paper, useTheme } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { LatestPlcValue } from '../services/apiService';
import { apiService } from '../services/apiService';
import { formatTime } from '../utils/formatters';

interface ParameterTileWithGraphProps {
  parameter: LatestPlcValue;
  timeFilter: 'all' | 'last_hour' | 'current_shift';
}

export const ParameterTileWithGraph: React.FC<ParameterTileWithGraphProps> = ({ parameter, timeFilter }) => {
  const theme = useTheme();
  const [chartData, setChartData] = React.useState<Array<{ time: string; value: number }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadChartData = async () => {
      try {
        setLoading(true);
        const data = await apiService.getTimeSeries(parameter.address, 50);
        const formatted = data.map(d => ({
          time: formatTime(d.timestamp),
          value: parseFloat(d.value) || 0,
        }));
        setChartData(formatted);
      } catch (error) {
        console.error('Error loading chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [parameter.address]);

  return (
    <Card sx={{ height: '100%', transition: 'all 0.3s ease' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ transition: 'color 0.3s ease' }}>
          {parameter.address.replace(/_/g, ' ').toUpperCase()}
        </Typography>
        <Typography variant="h4" sx={{ mt: 1, mb: 2, fontWeight: 700, color: (theme) => theme.palette.text.primary, transition: 'color 0.3s ease' }}>
          {parameter.value}
        </Typography>
        <Box sx={{ height: 150, mt: 2, transition: 'all 0.3s ease' }}>
          {loading ? (
            <Typography variant="caption" color="text.secondary" align="center" sx={{ transition: 'color 0.3s ease' }}>
              Loading chart...
            </Typography>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
                />
                <XAxis 
                  dataKey="time" 
                  stroke={theme.palette.text.secondary}
                  style={{ fontSize: '10px', transition: 'stroke 0.3s ease' }}
                />
                <YAxis 
                  stroke={theme.palette.text.secondary}
                  style={{ fontSize: '10px', transition: 'stroke 0.3s ease' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 4,
                    color: theme.palette.text.primary,
                    transition: 'all 0.3s ease',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Typography variant="caption" color="text.secondary" align="center" sx={{ transition: 'color 0.3s ease' }}>
              No chart data available
            </Typography>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', transition: 'color 0.3s ease' }}>
          Updated: {formatTime(parameter.timestamp)}
        </Typography>
      </CardContent>
    </Card>
  );
};
