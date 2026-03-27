import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Paper,
  Divider,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import type { Machine, PLCParameter, ParameterStatus } from '../types';
import { ParameterDisplay } from './ParameterDisplay';
import { ParameterChart } from './ParameterChart';
import { Speedometer } from './Speedometer';
import { dataService } from '../services/dataService';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { TimeFilter, type TimeFilterType } from './TimeFilter';
import { useTheme } from '../contexts/ThemeContext';

// Parameter display type mapping (as per client requirements)
const PARAMETER_DISPLAY_TYPES: Record<string, 'Tile' | 'Tile & graph' | 'pop up'> = {
  'machine_status': 'Tile',
  'machine_utility': 'Tile & graph',
  'production_quantity': 'Tile & graph',
  'energy_consumption': 'Tile & graph',
  'energy_per_casting': 'Tile & graph',
  'total_blast_time': 'Tile',
  'effective_shots_usage': 'Tile',
  'avg_shot_refill_time': 'Tile & graph',
  'chamber_utilisation_p2': 'Tile',
  'cycle_count': 'Tile',
  'last_refill_time': 'Tile',
  'maintenance_popup': 'pop up',
  'motor_amps': 'Tile & graph',
  'consumable_spare_life': 'pop up',
  'rework_flag': 'Tile',
};

interface MachineDetailViewProps {
  machine: Machine;
  onBack: () => void;
  showCustomerInfo?: boolean;
  statusFilter?: ParameterStatus | null;
}

export const MachineDetailView: React.FC<MachineDetailViewProps> = ({
  machine,
  onBack,
  showCustomerInfo = false,
  statusFilter = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParameter, setSelectedParameter] = useState<PLCParameter | null>(null);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [chartDialogOpen, setChartDialogOpen] = useState(false);
  const [chartTimeFilter, setChartTimeFilter] = useState<TimeFilterType>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<ParameterStatus | null>(statusFilter);
  const containerRef = useRef<HTMLDivElement>(null);
  const { mode } = useTheme();

  useEffect(() => {
    setActiveStatusFilter(statusFilter);
  }, [statusFilter]);

  const getParameterStatus = (parameter: PLCParameter): ParameterStatus => {
    if (parameter.currentValue === undefined || parameter.currentValue === null) {
      return parameter.currentStatus || 'Normal';
    }

    const value = typeof parameter.currentValue === 'number'
      ? parameter.currentValue
      : parseFloat(String(parameter.currentValue));
    if (isNaN(value)) return parameter.currentStatus || 'Normal';

    const range = parameter.maxValue - parameter.minValue;
    const warningThreshold = parameter.minValue + (range * 0.8);
    const criticalThreshold = parameter.minValue + (range * 0.9);

    if (value >= criticalThreshold) return 'Critical';
    if (value >= warningThreshold) return 'Warning';
    return 'Normal';
  };

  // Get parameters with cursor-based pagination
  const { parameters, hasMore, nextCursor } = useMemo(() => {
    return dataService.getParametersByMachine(machine.id, cursor, 20);
  }, [machine.id, cursor]);

  // Filter parameters by time range and calculate filtered values
  const parametersWithTimeFilter = useMemo(() => {
    const now = new Date();
    let startTime: Date | null = null;

    if (timeFilter === 'last_hour') {
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
    } else if (timeFilter === 'current_shift') {
      const hour = now.getHours();
      const shiftStart = new Date(now);
      shiftStart.setMinutes(0);
      shiftStart.setSeconds(0);
      shiftStart.setMilliseconds(0);

      if (hour >= 6 && hour < 14) {
        shiftStart.setHours(6);
      } else if (hour >= 14 && hour < 22) {
        shiftStart.setHours(14);
      } else {
        if (hour >= 22) {
          shiftStart.setHours(22);
        } else {
          shiftStart.setDate(shiftStart.getDate() - 1);
          shiftStart.setHours(22);
        }
      }
      startTime = shiftStart;
    }

    return parameters.map(param => {
      // If no time filter or no values, return original parameter
      if (!startTime || !param.values || param.values.length === 0) {
        return param;
      }

      // Filter values by time range
      const filteredValues = param.values.filter(v => {
        const valueTime = new Date(v.timestamp);
        return valueTime >= startTime!;
      });

      if (filteredValues.length === 0) {
        // No data in time range, return original
        return param;
      }

      // Calculate statistics for filtered values
      const numericValues = filteredValues
        .map(v => typeof v.value === 'number' ? v.value : parseFloat(String(v.value)))
        .filter(v => !isNaN(v));

      if (numericValues.length === 0) {
        return param;
      }

      // Calculate average, max, min for the time range
      const avg = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
      const max = Math.max(...numericValues);
      const min = Math.min(...numericValues);

      // Return parameter with filtered currentValue (using average)
      const updatedStatus = getParameterStatus({ ...param, currentValue: avg });
      return {
        ...param,
        currentValue: avg,
        currentStatus: updatedStatus,
        timestamp: filteredValues[filteredValues.length - 1]?.timestamp || param.timestamp,
        // Store original value for reference
        _originalValue: param.currentValue,
        _filteredStats: {
          average: avg,
          max,
          min,
          count: filteredValues.length
        }
      };
    });
  }, [parameters, timeFilter]);

  // Filter parameters by search term
  const filteredParameters = useMemo(() => {
    if (!searchTerm) return parametersWithTimeFilter;
    return parametersWithTimeFilter.filter(p =>
      p.tagName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parametersWithTimeFilter, searchTerm]);

  const statusFilteredParameters = useMemo(() => {
    if (!activeStatusFilter) return filteredParameters;
    return filteredParameters.filter(p => getParameterStatus(p) === activeStatusFilter);
  }, [filteredParameters, activeStatusFilter]);

  // Filter selected parameter values by chart time range (for graph dialog)
  const chartFilteredParameter = useMemo(() => {
    if (!selectedParameter?.values || selectedParameter.values.length === 0) return selectedParameter;
    if (chartTimeFilter === 'all') return selectedParameter;
    const now = new Date();
    let startTime: Date | null = null;
    if (chartTimeFilter === 'last_hour') {
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
    } else if (chartTimeFilter === 'current_shift') {
      const hour = now.getHours();
      const shiftStart = new Date(now);
      shiftStart.setMinutes(0);
      shiftStart.setSeconds(0);
      shiftStart.setMilliseconds(0);
      if (hour >= 6 && hour < 14) shiftStart.setHours(6);
      else if (hour >= 14 && hour < 22) shiftStart.setHours(14);
      else if (hour >= 22) shiftStart.setHours(22);
      else { shiftStart.setDate(shiftStart.getDate() - 1); shiftStart.setHours(22); }
      startTime = shiftStart;
    }
    if (!startTime) return selectedParameter;
    const filteredValues = selectedParameter.values.filter(v => new Date(v.timestamp) >= startTime!);
    return { ...selectedParameter, values: filteredValues };
  }, [selectedParameter, chartTimeFilter]);

  const handleLoadMore = () => {
    if (nextCursor !== undefined) {
      setCursor(nextCursor);
    }
  };

  const handleParameterClick = (parameter: PLCParameter) => {
    setSelectedParameter(parameter);
    setChartTimeFilter('all');
    setChartDialogOpen(true);
  };

  const handleCloseChartDialog = () => {
    setChartDialogOpen(false);
    setSelectedParameter(null);
  };

  const isMachineStatusParameter = (p: PLCParameter) =>
    p.address === 'machine_status' || p.tagName?.toLowerCase().includes('machine status');

  const isAmpsParameter = (p: PLCParameter) =>
    p.tagName?.toLowerCase().includes('amps') || p.address?.toLowerCase().includes('motor_amps');

  // A parameter is clickable only if it has a graph OR is AMPS (speedometer)
  const isClickableParameter = (p: PLCParameter) => {
    if (isMachineStatusParameter(p)) return false;
    if (isAmpsParameter(p)) return true;
    const displayType = p.displayType || PARAMETER_DISPLAY_TYPES[p.address] || 'Tile';
    return displayType === 'Tile & graph';
  };

  // Listen for dashboard reset event (when Dashboard button is clicked)
  useEffect(() => {
    const handleResetView = () => {
      setSelectedParameter(null);
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('dashboard-reset', handleResetView);
    return () => {
      window.removeEventListener('dashboard-reset', handleResetView);
    };
  }, []);

  return (
    <Box
      ref={containerRef}
      sx={{
        p: { xs: 2, md: 4 },
        height: '100vh',
        overflow: 'auto',
        backgroundColor: (theme) => theme.palette.background.default,
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      {/* Navigation */}
      <Box display="flex" alignItems="center" mb={4}>
        <IconButton
          onClick={onBack}
          sx={{
            mr: 2,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            transition: 'border-color 0.3s ease, background-color 0.3s ease'
          }}
        >
          <ArrowBackIcon sx={{ color: (theme) => theme.palette.text.primary }} />
        </IconButton>
        <Box>
          <Breadcrumbs
            aria-label="breadcrumb"
            sx={{
              mb: 0.5,
              '& .MuiBreadcrumbs-separator': {
                color: (theme) => theme.palette.text.secondary
              }
            }}
          >
            <Link
              underline="hover"
              color="inherit"
              href="#"
              onClick={(e) => { e.preventDefault(); onBack(); }}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: (theme) => theme.palette.text.secondary
              }}
            >
              DASHBOARD
            </Link>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: (theme) => theme.palette.text.primary }}>
              {machine.name.toUpperCase()}
            </Typography>
          </Breadcrumbs>
          <Typography variant="h4" fontWeight={700} sx={{ color: (theme) => theme.palette.text.primary }}>
            {machine.name}
          </Typography>
        </Box>
      </Box>

      {/* Machine Info Grid */}
      {showCustomerInfo && machine.customerId && (
        <Paper sx={{ p: 3, mb: 4, borderRadius: 4, transition: 'all 0.3s ease' }}>
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: '0.1em', opacity: 0.5 }}>CUSTOMER</Typography>
            <Typography variant="h6" color="primary" fontWeight={700}>
              {dataService.getCustomerById(machine.customerId)?.name || 'Unknown'}
            </Typography>
          </Box>
        </Paper>
      )}

      <Divider sx={{ mb: 4 }} />

      {/* Search and Parameters Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '0.05em', color: (theme) => theme.palette.text.primary }}>PARAMETERS</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <TimeFilter value={timeFilter} onChange={setTimeFilter} />
          {activeStatusFilter && (
            <Chip
              label={`Status: ${activeStatusFilter}`}
              onDelete={() => setActiveStatusFilter(null)}
              color={activeStatusFilter === 'Critical' ? 'error' : activeStatusFilter === 'Warning' ? 'warning' : 'success'}
              sx={{ fontWeight: 600 }}
            />
          )}
          <TextField
            size="small"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: (theme) => theme.palette.text.secondary, fontSize: 20 }} />,
            }}
            sx={{
              width: 300,
              '& .MuiOutlinedInput-root': {
                backgroundColor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(0,0,0,0.02)',
                transition: 'background-color 0.3s ease, border-color 0.3s ease',
                '& fieldset': {
                  borderColor: (theme) => theme.palette.divider,
                  transition: 'border-color 0.3s ease'
                },
              }
            }}
          />
        </Box>
      </Box>

      {/* Parameters Grid */}
      {statusFilteredParameters.length > 0 ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            {statusFilteredParameters.map((parameter) => {
              const clickable = isClickableParameter(parameter);
              return (
                <Box
                  key={parameter.id}
                  onClick={clickable ? () => handleParameterClick(parameter) : undefined}
                  sx={{
                    cursor: clickable ? 'pointer' : 'default',
                    transition: 'all 0.3s ease',
                    ...(clickable && { '&:hover': { transform: 'translateY(-2px)' } })
                  }}
                >
                  <ParameterDisplay parameter={parameter} />
                </Box>
              );
            })}
          </Box>

          {/* Load More Button */}
          {hasMore && !searchTerm && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                sx={{
                  px: 4,
                  py: 1,
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                }}
              >
                LOAD MORE
              </Button>
            </Box>
          )}
        </>
      ) : (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.02)'
              : 'rgba(0, 0, 0, 0.02)',
            border: (theme) => `1px dashed ${theme.palette.divider}`,
            borderRadius: 2,
            transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
          }}
        >
          <Typography color="text.secondary" fontWeight={600}>
            {searchTerm
              ? 'NO RESULTS FOUND'
              : activeStatusFilter
                ? `NO ${activeStatusFilter.toUpperCase()} PARAMETERS`
                : 'NO PARAMETERS CONFIGURED'}
          </Typography>
        </Paper>
      )}

      {/* Parameter Chart Dialog/Popup */}
      <Dialog
        open={chartDialogOpen}
        onClose={handleCloseChartDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: (theme) => theme.palette.background.paper,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            borderRadius: 3,
            maxHeight: '90vh',
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(0,0,0,0.12)',
            transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 2,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            backgroundColor: (theme) => theme.palette.mode === 'dark'
              ? theme.palette.background.paper
              : theme.palette.background.default,
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <PrecisionManufacturingIcon sx={{ color: (theme) => theme.palette.primary.main }} />
            <Box>
              <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                  letterSpacing: '0.05em',
                  color: (theme) => theme.palette.text.primary
                }}
              >
                PARAMETER ANALYTICS
              </Typography>
              {selectedParameter && (
                <Typography
                  variant="body2"
                  sx={{
                    color: (theme) => theme.palette.text.secondary,
                    mt: 0.5,
                    fontWeight: 500
                  }}
                >
                  {selectedParameter.tagName.toUpperCase()}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton
            onClick={handleCloseChartDialog}
            sx={{
              color: (theme) => theme.palette.text.secondary,
              '&:hover': {
                color: (theme) => theme.palette.text.primary,
                backgroundColor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.05)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, backgroundColor: (theme) => theme.palette.background.paper }}>
          {selectedParameter && (
            <Box>
              {(() => {
                // 1. AMPS always shows speedometer (check first before displayType)
                if (isAmpsParameter(selectedParameter)) {
                  return (
                    <Box
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      sx={{ py: 3, px: { xs: 1, sm: 4, md: 8 } }}
                    >
                      <Box sx={{ width: '100%', maxWidth: 520 }}>
                        <Speedometer
                          key={`speedometer-${selectedParameter.id}-${chartDialogOpen}`}
                          parameter={selectedParameter}
                          animateOnMount={true}
                        />
                      </Box>
                    </Box>
                  );
                }

                // 2. Tile & graph → show chart with time filter
                const displayType = selectedParameter.displayType ||
                  PARAMETER_DISPLAY_TYPES[selectedParameter.address] ||
                  'Tile';

                if (displayType === 'Tile & graph') {
                  return (
                    <Box>
                      <Box
                        display="flex"
                        justifyContent="flex-end"
                        alignItems="center"
                        sx={{
                          pt: 2,
                          pb: 2,
                          mb: 2,
                          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                          backgroundColor: (theme) => theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(0,0,0,0.02)',
                          borderRadius: 2,
                          px: 2,
                          py: 1.5,
                        }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mb: 0.5,
                              fontWeight: 700,
                              letterSpacing: '0.05em',
                              color: (theme) => theme.palette.text.secondary,
                            }}
                          >
                            TIME RANGE
                          </Typography>
                          <TimeFilter value={chartTimeFilter} onChange={setChartTimeFilter} hideLabel />
                        </Box>
                      </Box>
                      <ParameterChart parameter={chartFilteredParameter ?? selectedParameter} theme={mode} />
                    </Box>
                  );
                }

                // 3. Should never reach here (non-clickable Tiles can't open dialog)
                return null;

              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            backgroundColor: (theme) => theme.palette.mode === 'dark'
              ? theme.palette.background.paper
              : theme.palette.background.default,
          }}
        >
          <Button
            onClick={handleCloseChartDialog}
            variant="outlined"
            sx={{
              fontWeight: 600,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

