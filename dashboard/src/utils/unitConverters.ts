export function secondsToHoursMin(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}

export function secondsToMinutes(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '—';
  return `${(sec / 60).toFixed(1)} min`;
}

export function epochToLocalDatetime(epoch: number): string {
  if (!isFinite(epoch) || epoch === 0) return '—';
  return new Date(epoch * 1000).toLocaleString();
}

export function formatPercent(val: number): string {
  if (!isFinite(val)) return '—';
  return `${val.toFixed(2)} %`;
}

export function formatKwh(val: number): string {
  if (!isFinite(val)) return '—';
  return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh`;
}

export function formatKwhPerKg(val: number): string {
  if (!isFinite(val)) return '—';
  return `${val.toFixed(4)} kWh/kg`;
}

export function formatKgPerKg(val: number): string {
  if (!isFinite(val)) return '—';
  return `${val.toFixed(4)} kg/kg`;
}

export function formatKg(val: number): string {
  if (!isFinite(val)) return '—';
  if (val >= 1000) return `${(val / 1000).toFixed(2)} t`;
  return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

// Parameter display metadata
export const PARAM_META: Record<string, { label: string; unit?: string }> = {
  machine_status:            { label: 'Machine Status' },
  machine_utility_pct:       { label: 'Machine Utility',       unit: '%' },
  production_qty_kg:         { label: 'Production' },
  energy_kwh_total:          { label: 'Total Energy' },
  energy_per_casting_kwh_kg: { label: 'Energy per Casting' },
  blast_time_sec:            { label: 'Blast Time' },
  effective_shots_usage:     { label: 'Shot Usage Index' },
  avg_shot_refill_time_sec:  { label: 'Avg Refill Interval' },
  cycle_count:               { label: 'Blast Cycles',          unit: 'cycles' },
  reblast_count:             { label: 'Reblast Cycles',        unit: 'cycles' },
  last_refill_epoch_sec:     { label: 'Last Shot Refill' },
};

export function formatParameterValue(name: string, raw: string): string {
  const n = parseFloat(raw);
  switch (name) {
    case 'machine_status':
      return raw === '1' ? 'ON' : raw === '0' ? 'OFF' : raw;
    case 'machine_utility_pct':
      return formatPercent(n);
    case 'production_qty_kg':
      return formatKg(n);
    case 'energy_kwh_total':
      return formatKwh(n);
    case 'energy_per_casting_kwh_kg':
      return formatKwhPerKg(n);
    case 'blast_time_sec':
      return secondsToHoursMin(n);
    case 'effective_shots_usage':
      return formatKgPerKg(n);
    case 'avg_shot_refill_time_sec':
      return secondsToMinutes(n);
    case 'cycle_count':
    case 'reblast_count':
      return isFinite(n) ? Math.round(n).toLocaleString() : raw;
    case 'last_refill_epoch_sec':
      return epochToLocalDatetime(n);
    default:
      return raw;
  }
}
