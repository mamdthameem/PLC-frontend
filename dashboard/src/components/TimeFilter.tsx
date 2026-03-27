import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export type TimeFilterType = 'all' | 'last_hour' | 'current_shift';

interface TimeFilterProps {
  value: TimeFilterType;
  onChange: (value: TimeFilterType) => void;
  /** When true, label is hidden (e.g. when a custom label is shown above) */
  hideLabel?: boolean;
}

export const TimeFilter: React.FC<TimeFilterProps> = ({ value, onChange, hideLabel = false }) => {

  // Get current shift name
  const getCurrentShift = (): string => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 'Morning (06:00-14:00)';
    if (hour >= 14 && hour < 22) return 'Afternoon (14:00-22:00)';
    return 'Night (22:00-06:00)';
  };

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      {!hideLabel && (
        <InputLabel sx={{ color: (theme) => theme.palette.text.secondary }}>Time Range</InputLabel>
      )}
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as TimeFilterType)}
        label={hideLabel ? undefined : 'Time Range'}
        sx={{
          backgroundColor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(0,0,0,0.02)',
          borderRadius: 2,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: (theme) => theme.palette.divider },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: (theme) => theme.palette.divider },
        }}
      >
        <MenuItem value="all">All Time</MenuItem>
        <MenuItem value="last_hour">Last Hour</MenuItem>
        <MenuItem value="current_shift">Current Shift ({getCurrentShift()})</MenuItem>
      </Select>
    </FormControl>
  );
};
