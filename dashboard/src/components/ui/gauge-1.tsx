import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

interface GaugeProps {
  value: number;
  size?: number;
  min?: number;
  max?: number;
  gradient?: boolean;
  primary?: 'success' | 'warning' | 'error' | 'info';
  tickMarks?: boolean;
  label?: string;
  transition?: {
    length?: number;
    delay?: number;
  };
  className?: string;
}

const primaryColors = {
  success: {
    from: '#22c55e',
    to: '#16a34a',
  },
  warning: {
    from: '#eab308',
    to: '#ca8a04',
  },
  error: {
    from: '#ef4444',
    to: '#dc2626',
  },
  info: {
    from: '#3b82f6',
    to: '#2563eb',
  },
};

export const Gauge: React.FC<GaugeProps> = ({
  value,
  size = 200,
  min = 0,
  max = 100,
  gradient = false,
  primary = 'info',
  tickMarks = false,
  label,
  transition = { length: 1200, delay: 200 },
  className,
}) => {
  const [animatedValue, setAnimatedValue] = useState(min);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = animatedValue;
    const endValue = Math.max(min, Math.min(max, value));
    const duration = transition.length || 1200;
    const delay = transition.delay || 200;

    const timer = setTimeout(() => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * eased;
        
        setAnimatedValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };
      
      animate();
    }, delay);

    return () => clearTimeout(timer);
  }, [value, min, max, transition.length, transition.delay]);

  const percentage = ((animatedValue - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;
  const strokeWidth = 12;
  
  // Arc calculation (270 degrees: -135 to 135)
  const startAngle = -135;
  const endAngle = 135;
  const currentAngle = startAngle + (clampedPercentage / 100) * (endAngle - startAngle);
  
  const colors = primaryColors[primary];
  
  // Convert angle to radians (SVG uses 0° at top, clockwise)
  const angleToRad = (angle: number) => {
    return ((angle - 90) * Math.PI) / 180;
  };
  
  // Convert angle to radians and calculate arc path
  const getArcPath = (start: number, end: number) => {
    const startRad = angleToRad(start);
    const endRad = angleToRad(end);
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    const angleDiff = end - start;
    const largeArcFlag = angleDiff > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };
  
  // Needle position
  const needleAngle = angleToRad(currentAngle);
  const needleLength = radius * 0.75;
  
  // Tick marks
  const tickCount = tickMarks ? 5 : 0;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const tickAngle = startAngle + (i / (tickCount - 1)) * (endAngle - startAngle);
    const tickRad = angleToRad(tickAngle);
    const innerRadius = radius - strokeWidth / 2;
    const outerRadius = radius + strokeWidth / 2;
    const x1 = centerX + innerRadius * Math.cos(tickRad);
    const y1 = centerY + innerRadius * Math.sin(tickRad);
    const x2 = centerX + outerRadius * Math.cos(tickRad);
    const y2 = centerY + outerRadius * Math.sin(tickRad);
    return { x1, y1, x2, y2 };
  });

  return (
    <div className={cn('relative flex flex-col items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background arc */}
        <path
          d={getArcPath(startAngle, endAngle)}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-gray-200 dark:text-gray-800"
        />
        
        {/* Value arc */}
        <path
          d={getArcPath(startAngle, currentAngle)}
          fill="none"
          stroke={gradient ? `url(#gauge-gradient-${primary})` : colors.from}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
        
        {/* Gradient definition */}
        {gradient && (
          <defs>
            <linearGradient id={`gauge-gradient-${primary}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.from} />
              <stop offset="100%" stopColor={colors.to} />
            </linearGradient>
          </defs>
        )}
        
        {/* Tick marks */}
        {tickMarks && ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke="currentColor"
            strokeWidth={2}
            className="text-gray-400 dark:text-gray-600"
          />
        ))}
        
        {/* Needle */}
        <g transform={`rotate(${currentAngle + 90} ${centerX} ${centerY})`}>
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - needleLength}
            stroke={colors.from}
            strokeWidth={3}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={6}
            fill={colors.from}
            className="transition-all duration-300"
          />
        </g>
      </svg>
      
      {/* Value display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold" style={{ color: colors.from }}>
          {Math.round(animatedValue)}
        </div>
        {label && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {label}
          </div>
        )}
      </div>
    </div>
  );
};
