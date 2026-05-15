import { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { fetchHistorical } from '../services/historicalService';
import { computeHourlyUtility } from '../utils/utilityCompute';

interface Props {
  windowStart: string;
  windowEnd: string;
}

export default function UtilityGraph({ windowStart, windowEnd }: Props) {
  const [data, setData]     = useState<{ label: string; utilityPct: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const start = new Date(windowStart);
    const end   = new Date(windowEnd);
    // Extend lookback by 1 hour to capture initial state
    const lookback = new Date(start.getTime() - 3_600_000);

    Promise.all([
      fetchHistorical('Blast ON/OFF',    lookback, end),
      fetchHistorical('Machine status',  lookback, end),
    ])
      .then(([blastRec, machineRec]) => {
        if (!active) return;
        const buckets = computeHourlyUtility(blastRec, machineRec, start, end);
        setData(buckets.map(b => ({ label: b.label, utilityPct: parseFloat(b.utilityPct.toFixed(1)) })));
        setLoading(false);
      })
      .catch(e => {
        if (!active) return;
        setError((e as Error).message);
        setLoading(false);
      });

    return () => { active = false; };
  }, [windowStart, windowEnd]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (!data.length) return <Typography color="text.secondary">No utility data for this period.</Typography>;

  return (
    <Box sx={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(1)} %`, 'Utility']} />
          <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '80%', fontSize: 10 }} />
          <Line type="monotone" dataKey="utilityPct" stroke="#1976d2" dot={false} strokeWidth={2} name="Utility %" />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
