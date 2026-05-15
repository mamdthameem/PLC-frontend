import { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { fetchHistorical } from '../services/historicalService';
import { fetchLatestCycle } from '../services/cyclesService';
import type { HistoricalPoint } from '../types';

interface Props {
  windowStart?: string;
  windowEnd?: string;
}

const IMP_NAMES = Array.from({ length: 10 }, (_, i) => `Current_imp_${i + 1}`);
const COLORS = [
  '#1976d2','#d32f2f','#388e3c','#f57c00','#7b1fa2',
  '#0097a7','#c2185b','#5d4037','#455a64','#fbc02d',
];

interface Row { label: string; [key: string]: string | number | undefined }

export default function AmpsGraph({ windowStart, windowEnd }: Props) {
  const [rows, setRows]     = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        let start: Date;
        let end: Date;

        if (windowStart && windowEnd) {
          start = new Date(windowStart);
          end   = new Date(windowEnd);
        } else {
          const cycle = await fetchLatestCycle();
          if (!cycle) {
            if (active) { setError('No completed blast cycle found.'); setLoading(false); }
            return;
          }
          start = new Date(cycle.blastStart);
          end   = new Date(cycle.blastEnd);
        }

        const all: Record<string, HistoricalPoint[]> = {};
        await Promise.all(IMP_NAMES.map(async n => {
          all[n] = await fetchHistorical(n, start, end);
        }));
        if (!active) return;

        // Merge all timestamps into a unified timeline
        const tsSet = new Set<string>();
        for (const recs of Object.values(all)) recs.forEach(r => tsSet.add(r.timestamp));
        const sortedTs = Array.from(tsSet).sort();

        // Build per-impeller lookup maps
        const maps: Record<string, Map<string, number>> = {};
        for (const name of IMP_NAMES) {
          maps[name] = new Map();
          for (const r of all[name]) {
            const v = parseFloat(r.value);
            if (isFinite(v)) maps[name].set(r.timestamp, v);
          }
        }

        // Forward-fill: carry last known value
        const lastVal: Record<string, number> = {};
        const chartRows: Row[] = sortedTs.map(ts => {
          const d = new Date(ts);
          const label = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const row: Row = { label };
          for (const name of IMP_NAMES) {
            if (maps[name].has(ts)) lastVal[name] = maps[name].get(ts)!;
            if (lastVal[name] !== undefined) row[name] = lastVal[name];
          }
          return row;
        });

        setRows(chartRows);
        setLoading(false);
      } catch (e) {
        if (!active) return;
        setError((e as Error).message);
        setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [windowStart, windowEnd]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (!rows.length) return <Typography color="text.secondary">No amps data for this period.</Typography>;

  return (
    <Box sx={{ width: '100%', height: 360 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
          <YAxis unit=" A" tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number | undefined) => [`${(v ?? 0).toFixed(2)} A`]} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          {IMP_NAMES.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={COLORS[i]}
              dot={false}
              strokeWidth={1.5}
              name={`Imp ${i + 1}`}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
