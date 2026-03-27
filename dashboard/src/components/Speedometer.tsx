import React, { useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion';
import type { PLCParameter } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface SpeedometerProps {
  parameter: PLCParameter;
  animateOnMount?: boolean;
}

/** 0° = 12-o'clock, clockwise positive */
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

/** Clockwise SVG arc path */
const arcPath = (cx: number, cy: number, r: number, sDeg: number, eDeg: number) => {
  const s = polar(cx, cy, r, sDeg);
  const e = polar(cx, cy, r, eDeg);
  const large = eDeg - sDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
};

const FONT = "'Inter','Helvetica Neue',Arial,sans-serif";
const FONT_MONO = "'Courier New','SF Mono',monospace";

export const Speedometer: React.FC<SpeedometerProps> = ({
  parameter,
  animateOnMount = true,
}) => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const value  = parameter.currentValue ?? 0;
  const min    = parameter.minValue ?? 0;
  const max    = parameter.maxValue ?? 100;
  const unit   = parameter.unit || '';
  const status = parameter.currentStatus || 'Normal';

  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;

  // ─── Canvas ────────────────────────────────────────────────────────
  const VW = 400;
  const VH = 408;
  const cx  = 200;
  const cy  = 185;
  const R   = 110;

  const TICK_OUT  = R + 16;           // outer tip of tick
  const TICK_MAJ  = R + 6;            // inner end — major
  const TICK_MIN  = R + 11;           // inner end — minor
  const LABEL_R   = R - 24;           // label ring (inside arc)
  // Arc spans R-6 to R+6 (strokeWidth 12). Arrowhead base starts at R+6
  // (outer arc edge) so the entire arrow is outside the arc track.
  const NEEDLE_TIP = R - 12;          // tip clears tick outer ends (R+16)

  // 270° arc: 225° (lower-left, min) → 495° (lower-right, max)
  const START = 225;
  const SWEEP = 270;
  const END   = START + SWEEP;
  const arcLen = (SWEEP / 360) * 2 * Math.PI * R;

  // ─── Status colours ────────────────────────────────────────────────
  const COL = {
    Critical: { main: '#ef5350' },
    Warning:  { main: '#ff9800' },
    Normal:   { main: '#00c853' },
  } as const;
  const col = COL[status as keyof typeof COL] ?? COL.Normal;

  // ─── Single pctMotion drives arc AND needle perfectly in sync ──────
  const pctMotion = useMotionValue(animateOnMount ? 0 : pct);

  useEffect(() => {
    const controls = animate(pctMotion, pct, {
      duration: animateOnMount ? 1.6 : 0.5,
      ease: 'easeOut',
    });
    return controls.stop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const arcDashOffset = useTransform(pctMotion, p => arcLen * (1 - p / 100));
  const needleAngle   = useTransform(pctMotion, p => START + (p / 100) * SWEEP);

  // Arrowhead points — base sits exactly at arc outer edge (R+6),
  // tip at R+20, so the whole arrow is outside the arc track.
  const tipPoints = useTransform(needleAngle, r => {
    const tip = polar(cx, cy, NEEDLE_TIP, r);               // R+20
    const l   = polar(cx, cy, NEEDLE_TIP - 14, r - 3.5);   // R+6
    const ri  = polar(cx, cy, NEEDLE_TIP - 14, r + 3.5);   // R+6
    return `${tip.x},${tip.y} ${l.x},${l.y} ${ri.x},${ri.y}`;
  });

  // ─── Scale labels: 11 marks at frac 0, 0.1 … 1.0 ─────────────────
  const NUM_LABELS = 10;
  const labels = Array.from({ length: NUM_LABELS + 1 }, (_, i) => {
    const frac  = i / NUM_LABELS;           // 0, 0.1, 0.2 … 1.0
    const deg   = START + frac * SWEEP;
    const val   = min + frac * (max - min);
    const label = Number.isInteger(min) && Number.isInteger(max)
      ? Math.round(val).toString()
      : val.toFixed(1);
    return { pos: polar(cx, cy, LABEL_R, deg), label };
  });

  // ─── Tick marks: 61 total, major every 6th ─────────────────────────
  // Major ticks at i = 0,6,12,18,24,30,36,42,48,54,60
  // → fracs 0/60, 6/60 … 60/60 = 0, 0.1 … 1.0  ← exactly matches label fracs
  const TOTAL_TICKS = 61;
  const ticks = Array.from({ length: TOTAL_TICKS }, (_, i) => {
    const frac  = i / (TOTAL_TICKS - 1);   // 0/60, 1/60 … 60/60
    const deg   = START + frac * SWEEP;
    const isMaj = i % 6 === 0;
    return {
      outer: polar(cx, cy, TICK_OUT, deg),
      inner: polar(cx, cy, isMaj ? TICK_MAJ : TICK_MIN, deg),
      isMaj,
    };
  });

  // ─── Display value ─────────────────────────────────────────────────
  const dispVal =
    parameter.dataType === 'Int' ||
    parameter.dataType === 'Word' ||
    parameter.dataType === 'DWord'
      ? Math.round(value).toLocaleString()
      : parseFloat(value.toFixed(2)).toLocaleString();

  // ─── Layout ────────────────────────────────────────────────────────
  const gaugeBottom = cy + TICK_OUT;    // 185 + 126 = 311
  const statusY     = gaugeBottom + 20; // 331
  const valueY      = statusY + 46;     // 377  (fontSize 38 ±19 → bottom 396)
  //  VH = 408 → 12 px margin below value ✓

  const filterId   = `spd-glow-${parameter.id}`;
  const glowOnlyId = `spd-bloom-${parameter.id}`;
  const bgId       = `spd-bg-${parameter.id}`;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      style={{ display: 'block', maxWidth: '480px', margin: '0 auto', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={bgId} cx="50%" cy="36%" r="62%">
          <stop offset="0%"   stopColor={isDark ? '#111111' : '#ffffff'} />
          <stop offset="100%" stopColor={isDark ? '#0a0a0a' : '#f4f4f5'} />
        </radialGradient>
        <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id={glowOnlyId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Card */}
      <rect x="2" y="2" width={VW - 4} height={VH - 4} rx="20" ry="20"
        fill={`url(#${bgId})`}
        stroke={isDark ? 'rgba(255,255,255,0.06)' : '#e4e4e7'}
        strokeWidth="1"
      />

      {/* Header */}
      <text x={cx} y="30" textAnchor="middle"
        fontSize="13" fontWeight="800" letterSpacing="3" fontFamily={FONT}
        fill={isDark ? 'rgba(255,255,255,0.88)' : '#0a0a0a'}
      >
        {parameter.tagName.toUpperCase()}
      </text>
      <text x={cx} y="46" textAnchor="middle"
        fontSize="9" fontWeight="500" fontFamily={FONT}
        fill={isDark ? 'rgba(255,255,255,0.3)' : '#71717a'}
      >
        {parameter.description || ''}
      </text>

      {/* Dial plate */}
      <circle cx={cx} cy={cy} r={R + 26}
        fill={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'}
        stroke={isDark ? 'rgba(255,255,255,0.05)' : '#e4e4e7'}
        strokeWidth="1"
      />

      {/* Ticks — 61 marks, major every 6th aligns exactly with labels */}
      {ticks.map((t, i) => (
        <line key={`tk${i}`}
          x1={t.outer.x} y1={t.outer.y}
          x2={t.inner.x} y2={t.inner.y}
          stroke={
            t.isMaj
              ? (isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.45)')
              : (isDark ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.18)')
          }
          strokeWidth={t.isMaj ? 1.8 : 0.9}
          strokeLinecap="round"
        />
      ))}

      {/* Arc track */}
      <path d={arcPath(cx, cy, R, START, END)}
        fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)'}
        strokeWidth="12" strokeLinecap="butt"
      />

      {/* Arc bloom — only visible on dark (glow needs dark bg) */}
      {isDark && (
        <motion.path d={arcPath(cx, cy, R, START, END)}
          fill="none" stroke={col.main}
          strokeWidth="18" strokeLinecap="butt"
          strokeDasharray={arcLen}
          strokeDashoffset={arcDashOffset}
          opacity="0.16"
          filter={`url(#${glowOnlyId})`}
        />
      )}

      {/* Arc progress */}
      <motion.path d={arcPath(cx, cy, R, START, END)}
        fill="none" stroke={col.main}
        strokeWidth="12" strokeLinecap="butt"
        strokeDasharray={arcLen}
        strokeDashoffset={arcDashOffset}
        filter={`url(#${filterId})`}
      />

      {/* Scale labels — aligned to same fracs as major ticks */}
      {labels.map((l, i) => (
        <text key={`lb${i}`}
          x={l.pos.x} y={l.pos.y}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="8.5" fontWeight="600" fontFamily={FONT}
          fill={isDark ? 'rgba(255,255,255,0.46)' : 'rgba(0,0,0,0.6)'}
        >
          {l.label}
        </text>
      ))}

      {/* Arrowhead — tip floats just above arc (NEEDLE_TIP = R+8) */}
      <motion.polygon
        points={tipPoints}
        fill={col.main}
        filter={`url(#${filterId})`}
      />

      {/* Hub */}
      <circle cx={cx} cy={cy} r="16"
        fill={isDark ? '#171717' : '#e4e4e7'}
        stroke={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.2)'}
        strokeWidth="1"
      />
      <circle cx={cx} cy={cy} r="10"
        fill={isDark ? '#1c1c1c' : '#f4f4f5'}
        stroke={col.main} strokeWidth="2"
        filter={isDark ? `url(#${filterId})` : undefined}
      />
      <circle cx={cx} cy={cy} r="4" fill={col.main} filter={`url(#${filterId})`} />

      {/* Status */}
      <motion.circle
        cx={cx - 38} cy={statusY} r="4.5"
        fill={col.main}
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        filter={`url(#${filterId})`}
      />
      <text x={cx - 26} y={statusY}
        textAnchor="start" dominantBaseline="middle"
        fontSize="11.5" fontWeight="800" letterSpacing="2.5" fontFamily={FONT}
        fill={col.main}
      >
        {status.toUpperCase()}
      </text>

      {/*
        Value + unit centered as a group around cx.
        Monospace fontSize=40 → each char ≈ 24px wide.
        "18.6" (4 chars) = 96px → half = 48px.
        Value centered at cx-10=190 → right edge ≈ 238.
        Unit "A" starts at 242.  Combined span ≈ 142–258, centre = 200 ✓
      */}
      <text
        x={cx - 10} y={valueY}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="40" fontWeight="900" fontFamily={FONT_MONO}
        fill={isDark ? '#fafafa' : '#0a0a0a'}
      >
        {dispVal}
      </text>
      {unit && (
        <text
          x={cx + 42} y={valueY - 10}
          textAnchor="start" dominantBaseline="middle"
          fontSize="14" fontWeight="700" fontFamily={FONT}
          fill={isDark ? 'rgba(255,255,255,0.45)' : '#71717a'}
        >
          {unit}
        </text>
      )}
    </svg>
  );
};
