import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Alert, IconButton, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fetchLifetimeParameters } from '../services/lifetimeService';
import { ParameterCard } from './ParameterCard';
import type { LifetimeParameter } from '../types';

const POLL_INTERVAL_MS = 60_000;

export const LifetimeSection: React.FC = () => {
  const [params, setParams] = useState<LifetimeParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchLifetimeParameters();
      setParams(data);
      setLastFetched(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lifetime parameters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <Box>
      {/* Section header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>
            Lifetime Parameters
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cumulative since commissioning · refreshes every 60 s
            {lastFetched && ` · last updated ${lastFetched.toLocaleTimeString()}`}
          </Typography>
        </Box>
        <Tooltip title="Refresh now">
          <span>
            <IconButton onClick={load} size="small" disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {loading && params.length === 0 && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {params.length > 0 && (
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
          {params.map(p => (
            <ParameterCard
              key={p.parameterName}
              parameterName={p.parameterName}
              value={p.value}
              updatedAt={p.updatedAt}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
