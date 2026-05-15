import type { HistoricalPoint } from '../types';

export interface UtilityBucket {
  hour: Date;
  label: string;
  utilityPct: number;
}

function isBlastOn(val: string): boolean {
  return val === '1' || val.toLowerCase() === 'true';
}

function isMachineOn(val: string): boolean {
  return val !== '0';
}

function hourFloor(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
}

function contributeInterval(
  startMs: number,
  endMs: number,
  blastOn: boolean,
  machineOn: boolean,
  buckets: Map<number, { blastSec: number; machineSec: number }>
) {
  if (endMs <= startMs || !machineOn) {
    if (machineOn && endMs > startMs) {
      // machine on, blast off — still count machine time
      let t = startMs;
      while (t < endMs) {
        const hTs    = hourFloor(t);
        const segEnd = Math.min(endMs, hTs + 3_600_000);
        const sec    = (segEnd - t) / 1000;
        const b      = buckets.get(hTs) ?? { blastSec: 0, machineSec: 0 };
        b.machineSec += sec;
        buckets.set(hTs, b);
        t = segEnd;
      }
    }
    return;
  }
  let t = startMs;
  while (t < endMs) {
    const hTs    = hourFloor(t);
    const segEnd = Math.min(endMs, hTs + 3_600_000);
    const sec    = (segEnd - t) / 1000;
    const b      = buckets.get(hTs) ?? { blastSec: 0, machineSec: 0 };
    b.machineSec += sec;
    if (blastOn) b.blastSec += sec;
    buckets.set(hTs, b);
    t = segEnd;
  }
}

export function computeHourlyUtility(
  blastRecords: HistoricalPoint[],
  machineRecords: HistoricalPoint[],
  periodStart: Date,
  periodEnd: Date
): UtilityBucket[] {
  type Ev = { timeMs: number; type: 'blast' | 'machine'; value: string };

  const events: Ev[] = [
    ...blastRecords.map(r  => ({ timeMs: new Date(r.timestamp).getTime(), type: 'blast'   as const, value: r.value })),
    ...machineRecords.map(r => ({ timeMs: new Date(r.timestamp).getTime(), type: 'machine' as const, value: r.value })),
  ].sort((a, b) => a.timeMs - b.timeMs);

  let machineOn = false;
  let blastOn   = false;
  const buckets = new Map<number, { blastSec: number; machineSec: number }>();
  const startMs = periodStart.getTime();
  const endMs   = periodEnd.getTime();

  // Use records before the window to determine initial state
  for (const ev of events) {
    if (ev.timeMs >= startMs) break;
    if (ev.type === 'blast')   blastOn   = isBlastOn(ev.value);
    else                       machineOn = isMachineOn(ev.value);
  }

  let prevMs = startMs;
  for (const ev of events) {
    if (ev.timeMs < startMs) continue;
    const evMs = Math.min(ev.timeMs, endMs);
    contributeInterval(prevMs, evMs, blastOn, machineOn, buckets);
    if (ev.timeMs > endMs) break;
    if (ev.type === 'blast')   blastOn   = isBlastOn(ev.value);
    else                       machineOn = isMachineOn(ev.value);
    prevMs = evMs;
  }
  contributeInterval(prevMs, endMs, blastOn, machineOn, buckets);

  const multiDay = (endMs - startMs) > 86_400_000;
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([hTs, { blastSec, machineSec }]) => ({
      hour:       new Date(hTs),
      label:      new Date(hTs).toLocaleString(undefined, multiDay
                    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                    : { hour: '2-digit', minute: '2-digit' }),
      utilityPct: machineSec > 0 ? Math.min(100, (blastSec / machineSec) * 100) : 0,
    }));
}
