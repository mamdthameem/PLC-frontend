import { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, IconButton, Tooltip,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import CloseIcon from '@mui/icons-material/Close';
import { fetchAmpReadings } from '../services/ampsService';
import AmpsGraph from './AmpsGraph';
import type { AmpReading } from '../types';

const POLL_MS = 1000;

function impellerLabel(paramName: string): string {
  const m = paramName.match(/(\d+)$/);
  return m ? `Impeller ${m[1]}` : paramName;
}

export default function AmpsPanel() {
  const [readings, setReadings] = useState<AmpReading[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [graphOpen, setGraphOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await fetchAmpReadings();
        if (active) { setReadings(data); setError(null); }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Live Impeller Current (A)</Typography>
        <Tooltip title="View amps history chart">
          <IconButton size="small" onClick={() => setGraphOpen(true)}>
            <BarChartIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={2}>
        {readings.map(r => {
          const amps = parseFloat(r.value);
          const display = isFinite(amps) ? `${amps.toFixed(2)} A` : r.value;
          return (
            <Grid key={r.parameterName} size={{ xs: 6, sm: 4, md: 2 }}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                  {impellerLabel(r.parameterName)}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1.1rem' }}>
                  {display}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                  {new Date(r.lastUpdated).toLocaleTimeString()}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={graphOpen} onClose={() => setGraphOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Amps per Impeller — Last Blast Cycle
          <IconButton onClick={() => setGraphOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {graphOpen && <AmpsGraph />}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
