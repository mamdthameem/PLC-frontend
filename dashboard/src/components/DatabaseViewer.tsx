import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Chip,
    Button,
    IconButton,
    Tooltip,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StorageIcon from '@mui/icons-material/Storage';
import FunctionsIcon from '@mui/icons-material/Functions';
import { apiService } from '../services/apiService';
import { useUI } from '../contexts/UIContext';
import { signalRService } from '../services/signalRService';
import * as signalR from '@microsoft/signalr';

type TableType = 'plc_values' | 'calculated_metrics';

export const DatabaseViewer: React.FC = () => {
    const { searchTerm } = useUI();
    const [activeTable, setActiveTable] = useState<TableType>('plc_values');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

    // ── plc_values: driven entirely by SignalR ────────────────────────────────
    useEffect(() => {
        if (activeTable !== 'plc_values') return;

        setLoading(true);
        setError(null);
        setIsLive(false);

        signalRService.start();

        const handleValues = (values: any[]) => {
            setData(values);
            setIsLive(true);
            setLoading(false);
            setDbStatus('connected');
        };

        const handleConnectionChange = (state: signalR.HubConnectionState) => {
            if (state === signalR.HubConnectionState.Connected) {
                setDbStatus('connected');
            } else if (
                state === signalR.HubConnectionState.Reconnecting ||
                state === signalR.HubConnectionState.Connecting
            ) {
                setDbStatus('connecting');
            } else {
                setDbStatus('disconnected');
                setIsLive(false);
            }
        };

        signalRService.subscribe(handleValues);
        signalRService.onConnectionChange(handleConnectionChange);

        // Reflect current connection state immediately
        const currentState = signalRService.getConnectionState();
        handleConnectionChange(currentState);

        return () => {
            signalRService.unsubscribe(handleValues);
            signalRService.offConnectionChange(handleConnectionChange);
        };
    }, [activeTable]);

    // ── calculated_metrics: fetched via REST on tab switch + manual refresh ───
    const fetchCalculatedMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.getCalculatedMetrics();
            setData(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch calculated metrics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTable !== 'calculated_metrics') return;
        setIsLive(false);
        fetchCalculatedMetrics();
    }, [activeTable]);

    const handleTableChange = (
        _event: React.MouseEvent<HTMLElement>,
        newTable: TableType | null,
    ) => {
        if (newTable !== null) {
            setData([]);
            setActiveTable(newTable);
        }
    };

    const handleRefresh = () => {
        if (activeTable === 'calculated_metrics') {
            fetchCalculatedMetrics();
        }
        // For plc_values: next SignalR push arrives within 2s automatically
    };

    const formatName = (name: string) =>
        name.split(/[_-]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

    const getColumns = () => {
        if (data.length === 0) return [];
        return Object.keys(data[0]).filter(key => key.toLowerCase() !== 'id');
    };

    const filteredData = data.filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return Object.values(item).some(val =>
            String(val).toLowerCase().includes(term)
        );
    });

    const getValueColor = (value: any): 'success' | 'default' | 'primary' => {
        const str = String(value).toUpperCase();
        if (str === 'TRUE' || str === '1' || str === 'RUNNING' || str === 'ACTIVE') return 'success';
        if (!isNaN(Number(str))) return 'primary';
        return 'default';
    };

    const statusColor = dbStatus === 'connected' ? 'success' : dbStatus === 'disconnected' ? 'error' : 'default';
    const statusLabel = dbStatus === 'connected' ? 'DB CONNECTED' : dbStatus === 'disconnected' ? 'DB DISCONNECTED' : 'CONNECTING...';

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
                <Box display="flex" alignItems="center" gap={2}>
                    <StorageIcon sx={{ fontSize: 40, color: (theme) => theme.palette.primary.main }} />
                    <Box>
                        <Typography variant="h3" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            Database Explorer
                            <Chip
                                label={statusLabel}
                                color={statusColor}
                                size="small"
                                variant="filled"
                                sx={{ fontWeight: 800, fontSize: '0.7rem', height: 20 }}
                            />
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {activeTable === 'plc_values'
                                ? 'Real-time PLC parameters via SignalR'
                                : 'Calculated metrics and performance data'}
                        </Typography>
                    </Box>
                </Box>

                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={2}>
                    <ToggleButtonGroup
                        value={activeTable}
                        exclusive
                        onChange={handleTableChange}
                        size="small"
                        sx={{ backgroundColor: (theme) => theme.palette.background.paper }}
                    >
                        <ToggleButton value="plc_values">
                            <StorageIcon sx={{ mr: 1, fontSize: 18 }} />
                            PLC Values
                        </ToggleButton>
                        <ToggleButton value="calculated_metrics">
                            <FunctionsIcon sx={{ mr: 1, fontSize: 18 }} />
                            Calculated Data
                        </ToggleButton>
                    </ToggleButtonGroup>

                    <Box display="flex" alignItems="center" gap={1}>
                        {activeTable === 'plc_values' && isLive && (
                            <Chip
                                icon={<TrendingUpIcon />}
                                label="LIVE · SignalR"
                                color="success"
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                            />
                        )}
                        <Tooltip title={activeTable === 'plc_values' ? 'Auto-updates every 2s via SignalR' : 'Refresh'}>
                            <span>
                                <IconButton
                                    onClick={handleRefresh}
                                    color="primary"
                                    disabled={loading || activeTable === 'plc_values'}
                                    size="small"
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading && data.length === 0 ? (
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight={400} gap={2}>
                    <CircularProgress size={60} thickness={4} />
                    {activeTable === 'plc_values' && (
                        <Typography variant="body2" color="text.secondary">
                            Waiting for SignalR push...
                        </Typography>
                    )}
                </Box>
            ) : data.length > 0 ? (
                <TableContainer
                    component={Paper}
                    sx={{ borderRadius: 3, overflow: 'hidden' }}
                >
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 60, fontWeight: 700, backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5' }}>#</TableCell>
                                {getColumns().map((col) => (
                                    <TableCell
                                        key={col}
                                        sx={{
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            fontSize: '0.75rem',
                                            letterSpacing: '0.05em',
                                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
                                        }}
                                    >
                                        {formatName(col)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredData.map((row, index) => (
                                <TableRow
                                    key={index}
                                    sx={{ '&:hover': { backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)' } }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">{index + 1}</Typography>
                                    </TableCell>
                                    {getColumns().map((col) => (
                                        <TableCell key={col}>
                                            {col.toLowerCase() === 'timestamp' ? (
                                                <Typography variant="body2" color="text.secondary">
                                                    {new Date(row[col]).toLocaleString()}
                                                </Typography>
                                            ) : typeof row[col] === 'string' && row[col].length < 20 ? (
                                                <Chip
                                                    label={row[col]}
                                                    color={getValueColor(row[col])}
                                                    size="small"
                                                    variant={isNaN(Number(row[col])) ? 'filled' : 'outlined'}
                                                    sx={{ fontWeight: 600, minWidth: 60 }}
                                                />
                                            ) : (
                                                <Typography variant="body2" fontWeight={500}>
                                                    {String(row[col])}
                                                </Typography>
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <Paper
                    sx={{
                        p: 8,
                        textAlign: 'center',
                        borderRadius: 4,
                        border: '2px dashed',
                        borderColor: 'divider',
                        backgroundColor: 'transparent',
                    }}
                >
                    <StorageIcon sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
                    <Typography variant="h5" fontWeight={700} gutterBottom>No Data Found</Typography>
                    <Typography variant="body1" color="text.secondary" mb={4} maxWidth={500} mx="auto">
                        No records in <strong>{activeTable}</strong>.
                        {activeTable === 'plc_values'
                            ? ' Waiting for the PLC Gateway to write data into the database.'
                            : ' The calculated_metrics table may not exist yet.'}
                    </Typography>
                    {activeTable === 'calculated_metrics' && (
                        <Button variant="contained" onClick={handleRefresh} startIcon={<RefreshIcon />} sx={{ borderRadius: 2, px: 4 }}>
                            Check Again
                        </Button>
                    )}
                </Paper>
            )}
        </Container>
    );
};
