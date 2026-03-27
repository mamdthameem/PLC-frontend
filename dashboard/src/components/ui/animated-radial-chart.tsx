import React from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { useEffect } from "react"
import { cn } from "../../utils/cn"

interface AnimatedRadialChartProps {
  value?: number
  size?: number
  strokeWidth?: number
  className?: string
  showLabels?: boolean
  duration?: number
  min?: number
  max?: number
  unit?: string
  statusColor?: string
  currentValue?: number // Actual current value to display
  isLight?: boolean // Theme mode indicator
}

export function AnimatedRadialChart({ 
  value = 74, 
  size = 300,
  strokeWidth: customStrokeWidth,
  className,
  showLabels = true,
  duration = 2,
  min = 0,
  max = 100,
  unit = '',
  statusColor = '#f97316',
  currentValue,
  isLight = false
}: AnimatedRadialChartProps) {
  // Dynamic stroke width based on size if not provided
  const strokeWidth = customStrokeWidth ?? Math.max(12, size * 0.06)
  const radius = size * 0.35
  const center = size / 2
  const circumference = Math.PI * radius

  // Calculate inner line radius (4px inside the main arc)
  const innerLineRadius = radius - strokeWidth - 4

  // Motion values for animation - start at 0 for initial animation
  const animatedValue = useMotionValue(0)
  const offset = useTransform(animatedValue, [0, 100], [circumference, 0])

  // Calculate animated positions
  const progressAngle = useTransform(animatedValue, [0, 100], [-Math.PI, 0])
  const innerRadius = radius - strokeWidth / 2

  // Track if this is the first mount
  const isFirstMount = React.useRef(true)

  // Animate to the target value on mount or when value changes
  useEffect(() => {
    const currentValue = animatedValue.get()
    
    // On first mount, always animate from 0
    if (isFirstMount.current) {
      isFirstMount.current = false
      animatedValue.set(0)
    }
    
    // Animate to target value
    const controls = animate(animatedValue, value, {
      duration: duration > 0 ? duration : 0.3,
      ease: duration > 0 ? "easeOut" : "linear",
    })

    return controls.stop
  }, [value, animatedValue, duration])

  // Calculate responsive font size
  const fontSize = Math.max(16, size * 0.1)
  const labelFontSize = Math.max(12, size * 0.04)
  
  // Calculate the actual center Y for the SVG (since height is size * 0.7)
  const centerY = size * 0.35 // This is the vertical center of the SVG

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size * 0.7 }}>
      <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`} className="overflow-visible" style={{ display: 'block' }}>
        <defs>
          {/* Base track gradient - adapts to theme */}
          <linearGradient id={`baseGradient-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#9ca3af" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#6b7280" stopOpacity="0.5" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#d1d5db" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#6b7280" stopOpacity="0.6" />
              </>
            )}
          </linearGradient>

          {/* Progress gradient - uses status color */}
          <linearGradient id={`progressGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={statusColor} stopOpacity="0.9" />
            <stop offset="50%" stopColor={statusColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={statusColor} stopOpacity="0.7" />
          </linearGradient>

          {/* Text gradient - adapts to theme */}
          <linearGradient id={`textGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#374151" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#6b7280" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.4" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#d1d5db" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#6b7280" stopOpacity="0.3" />
              </>
            )}
          </linearGradient>

          {/* Drop shadow filter */}
          <filter id={`dropshadow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Inner thin line (1px light gray) */}
        <path
          d={`M ${center - innerLineRadius} ${center} A ${innerLineRadius} ${innerLineRadius} 0 0 1 ${center + innerLineRadius} ${center}`}
          fill="none"
          stroke={isLight ? "#9ca3af" : "#6b7280"}
          strokeWidth="1"
          strokeLinecap="butt"
          opacity={isLight ? "0.5" : "0.6"}
        />

        {/* Base track */}
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke={`url(#baseGradient-${size})`}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          filter={`url(#dropshadow-${size})`}
        />

        {/* Animated Progress track */}
        <motion.path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke={`url(#progressGradient-${size})`}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={`url(#dropshadow-${size})`}
        />

        {/* Animated extending line */}
        <motion.line
          x1={useTransform(progressAngle, (angle) => center + Math.cos(angle) * innerRadius)}
          y1={useTransform(progressAngle, (angle) => center + Math.sin(angle) * innerRadius)}
          x2={useTransform(progressAngle, (angle) => center + Math.cos(angle) * innerRadius - Math.cos(angle) * 30)}
          y2={useTransform(progressAngle, (angle) => center + Math.sin(angle) * innerRadius - Math.sin(angle) * 30)}
          stroke={`url(#textGradient-${size})`}
          strokeWidth="1"
          strokeLinecap="butt"
        />
      </svg>

      {/* Min and Max labels - positioned exactly at the endpoints of the gauge arc */}
      {showLabels && (
        <>
          <motion.div
            className="absolute font-medium"
            style={{
              fontSize: `${labelFontSize}px`,
              left: `${center - radius - strokeWidth / 2 - 5}px`,
              top: `${centerY}px`,
              transform: 'translate(-50%, -50%)',
              color: isLight ? '#374151' : '#ffffff',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: duration * 0.25 }}
          >
            {min}{unit}
          </motion.div>
          <motion.div
            className="absolute font-medium"
            style={{
              fontSize: `${labelFontSize}px`,
              left: `${center + radius + strokeWidth / 2 + 5}px`,
              top: `${centerY}px`,
              transform: 'translate(-50%, -50%)',
              color: isLight ? '#374151' : '#ffffff',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: duration * 0.25 }}
          >
            {max}{unit}
          </motion.div>
        </>
      )}
    </div>
  )
}
