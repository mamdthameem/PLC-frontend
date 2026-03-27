import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const RUNNING_GREEN = '#32d583';
const RUNNING_GLOW = 'rgba(50, 213, 131, 0.5)';
const STOPPED_GRAY = '#667085';
const CRITICAL_RED = '#ef5350';

type ParameterStatus = 'Normal' | 'Warning' | 'Critical';

interface MachineStatusIndicatorProps {
    status: boolean | number; // true/1 for ON, false/0 for OFF (raw value from PLC)
    label?: string;
    /** When Critical, machine is treated as disconnected: show OFF + DISCONNECTED */
    parameterStatus?: ParameterStatus;
}

/** Animated status dot: pulsing core + expanding ring for RUNNING; static for STOPPED/CRITICAL */
const StatusDot: React.FC<{ isRunning: boolean; isDisconnected: boolean }> = ({ isRunning, isDisconnected }) => (
    <Box
        sx={{
            position: 'relative',
            width: 10,
            height: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }}
    >
        {isRunning ? (
            <>
                {/* Expanding ring(s) - sonar-style pulse */}
                {[0, 1].map((i) => (
                    <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                            opacity: [0, 0.6, 0],
                            scale: [0.5, 2.2, 2.5]
                        }}
                        transition={{
                            duration: 1.8,
                            repeat: Infinity,
                            delay: i * 0.9,
                            ease: 'easeOut'
                        }}
                        style={{
                            position: 'absolute',
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            border: `2px solid ${RUNNING_GREEN}`,
                            boxSizing: 'border-box'
                        }}
                    />
                ))}
                {/* Core dot with subtle breath */}
                <motion.span
                    animate={{
                        scale: [1, 1.2, 1],
                        boxShadow: [
                            `0 0 0 0 ${RUNNING_GLOW}`,
                            `0 0 12px 2px ${RUNNING_GLOW}`,
                            `0 0 0 0 ${RUNNING_GLOW}`
                        ]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: RUNNING_GREEN
                    }}
                />
            </>
        ) : (
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: isDisconnected ? CRITICAL_RED : STOPPED_GRAY
                }}
            />
        )}
    </Box>
);

export const MachineStatusIndicator: React.FC<MachineStatusIndicatorProps> = ({
    status,
    label = 'MACHINE STATUS',
    parameterStatus = 'Normal'
}) => {
    const rawOn = status === true || status === 1;
    const isDisconnected = parameterStatus === 'Critical';
    const isOn = rawOn && !isDisconnected;
    const isRunning = isOn;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.05em' }}>
                {label}
            </Typography>

            <Box
                sx={{
                    position: 'relative',
                    width: 120,
                    height: 48,
                    borderRadius: 6,
                    backgroundColor: (theme) => theme.palette.mode === 'dark'
                        ? 'rgba(0,0,0,0.3)'
                        : 'rgba(0,0,0,0.05)',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1,
                    cursor: 'default',
                    userSelect: 'none'
                }}
            >
                {/* Background Animation Layer */}
                <motion.div
                    animate={{
                        x: isOn ? '50%' : '0%',
                        backgroundColor: isOn ? RUNNING_GREEN : STOPPED_GRAY,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{
                        position: 'absolute',
                        left: 4,
                        width: 'calc(50% - 4px)',
                        height: 'calc(100% - 8px)',
                        borderRadius: '16px',
                        zIndex: 0,
                        boxShadow: isOn ? `0 0 16px ${RUNNING_GLOW}` : 'none',
                    }}
                />

                {/* Labels Layer (Behind the moving indicator but logically over the bg color) */}
                <Box sx={{ width: '50%', textAlign: 'center', zIndex: 1 }}>
                    <Typography
                        variant="button"
                        sx={{
                            fontWeight: 800,
                            color: !isOn ? '#ffffff' : 'text.disabled',
                            fontSize: '0.75rem',
                            transition: 'color 0.3s ease'
                        }}
                    >
                        OFF
                    </Typography>
                </Box>
                <Box sx={{ width: '50%', textAlign: 'center', zIndex: 1 }}>
                    <Typography
                        variant="button"
                        sx={{
                            fontWeight: 800,
                            color: isOn ? '#ffffff' : 'text.disabled',
                            fontSize: '0.75rem',
                            transition: 'color 0.3s ease'
                        }}
                    >
                        ON
                    </Typography>
                </Box>
            </Box>

            {/* Status label with animated icon */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    minHeight: 20
                }}
            >
                <StatusDot isRunning={isRunning} isDisconnected={isDisconnected} />
                <Typography
                    variant="caption"
                    sx={{
                        color: isDisconnected ? CRITICAL_RED : isRunning ? RUNNING_GREEN : 'text.disabled',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        letterSpacing: '0.08em'
                    }}
                >
                    {isDisconnected ? 'DISCONNECTED' : isRunning ? 'RUNNING' : 'STOPPED'}
                </Typography>
            </Box>
        </Box>
    );
};
