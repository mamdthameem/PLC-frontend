import React, { useState, useRef } from 'react';
import {
  Box, Typography, Button, ButtonGroup, TextField, Alert,
  Divider, LinearProgress,
} from '@mui/material';
import { submitFilterRequest, pollFilterStatus, fetchFilterResults } from '../services/filterService';
import { ParameterCard } from './ParameterCard';
import type { FilterResult, PeriodLabel } from '../types';

const PERIOD_BUTTONS: { label: string; value: PeriodLabel }[] = [
  { label: 'Hour',  value: 'hour'  },
  { label: 'Shift', value: 'shift' },
  { label: 'Day',   value: 'day'   },
  { label: 'Week',  value: 'week'  },
  { label: 'Month', value: 'month' },
  { label: 'Year',  value: 'year'  },
];

function periodToRange(period: PeriodLabel): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 16);

  const from = new Date(now);
  switch (period) {
    case 'hour':  from.setHours(now.getHours() - 1);       break;
    case 'shift': from.setHours(now.getHours() - 8);       break;
    case 'day':   from.setDate(now.getDate() - 1);         break;
    case 'week':  from.setDate(now.getDate() - 7);         break;
    case 'month': from.setMonth(now.getMonth() - 1);       break;
    case 'year':  from.setFullYear(now.getFullYear() - 1); break;
  }
  return { start: from.toISOString().slice(0, 16), end };
}

type State = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

export const FilterSection: React.FC = () => {
  const [activePeriod, setActivePeriod] = useState<PeriodLabel | 'custom'>('day');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd]     = useState('');

  const [state, setState]   = useState<State>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<FilterResult[]>([]);
  const [filterContext, setFilterContext] = useState<{ start: string; end: string; label: string } | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const handleSubmit = async () => {
    let filterStart: string;
    let filterEnd: string;
    let periodLabel: string | null;

    if (activePeriod === 'custom') {
      if (!customStart || !customEnd) {
        setMessage('Please fill in both start and end dates.');
        return;
      }
      if (customStart >= customEnd) {
        setMessage('Start date must be before end date.');
        return;
      }
      filterStart  = new Date(customStart).toISOString();
      filterEnd    = new Date(customEnd).toISOString();
      periodLabel  = null;
    } else {
      const range  = periodToRange(activePeriod);
      filterStart  = new Date(range.start).toISOString();
      filterEnd    = new Date(range.end).toISOString();
      periodLabel  = activePeriod;
    }

    setMessage(null);
    setResults([]);
    setFilterContext({
      start: filterStart,
      end:   filterEnd,
      label: activePeriod === 'custom' ? 'Custom range' : activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1),
    });
    setState('submitting');
    stopPolling();

    try {
      const requestId = await submitFilterRequest({ filterStart, filterEnd, periodLabel });
      setState('polling');

      pollRef.current = setInterval(async () => {
        try {
          const status = await pollFilterStatus(requestId);
          if (status.status === 'done') {
            stopPolling();
            const data = await fetchFilterResults(requestId);
            setResults(data);
            setState('done');
          } else if (status.status === 'error') {
            stopPolling();
            setState('error');
            setMessage('Backend reported an error processing this request. Please try again.');
          }
        } catch (err) {
          stopPolling();
          setState('error');
          setMessage(err instanceof Error ? err.message : 'Polling failed');
        }
      }, 2500);
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Failed to submit filter request');
    }
  };

  return (
    <Box>
      {/* Section header */}
      <Box mb={2}>
        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>
          Filtered Parameters
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Select a time window to calculate parameters for that period
        </Typography>
      </Box>

      {/* Period selector */}
      <Box display="flex" flexWrap="wrap" gap={1} mb={2} alignItems="center">
        <ButtonGroup size="small" variant="outlined">
          {PERIOD_BUTTONS.map(p => (
            <Button
              key={p.value}
              variant={activePeriod === p.value ? 'contained' : 'outlined'}
              onClick={() => setActivePeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
          <Button
            variant={activePeriod === 'custom' ? 'contained' : 'outlined'}
            onClick={() => setActivePeriod('custom')}
          >
            Custom
          </Button>
        </ButtonGroup>
      </Box>

      {/* Custom date pickers */}
      {activePeriod === 'custom' && (
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <TextField
            label="Start"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="End"
            type="datetime-local"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            sx={{ minWidth: 220 }}
          />
        </Box>
      )}

      {/* Submit */}
      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={state === 'submitting' || state === 'polling'}
        sx={{ mb: 2 }}
      >
        {state === 'submitting' || state === 'polling' ? 'Calculating…' : 'Calculate'}
      </Button>

      {/* Progress bar while polling */}
      {(state === 'submitting' || state === 'polling') && (
        <Box mb={2}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
            {state === 'submitting' ? 'Submitting request…' : 'Waiting for backend calculation…'}
          </Typography>
        </Box>
      )}

      {message && (
        <Alert severity={state === 'error' ? 'error' : 'warning'} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {/* Results */}
      {state === 'done' && results.length > 0 && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Box mb={1.5}>
            <Typography variant="body2" fontWeight={600}>
              {filterContext?.label}
            </Typography>
            {filterContext && (
              <Typography variant="caption" color="text.secondary">
                {new Date(filterContext.start).toLocaleString()} → {new Date(filterContext.end).toLocaleString()}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 2,
            }}
          >
            {results.map(r => (
              <ParameterCard key={r.parameterName} parameterName={r.parameterName} value={r.value} />
            ))}
          </Box>
        </>
      )}

      {state === 'done' && results.length === 0 && (
        <Alert severity="info">No data found for the selected time window.</Alert>
      )}
    </Box>
  );
};
