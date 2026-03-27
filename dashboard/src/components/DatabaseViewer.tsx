import React, { useState, useEffect } from 'react';
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

type TableType = 'plc_values' | 'calculated_metrics';

export const DatabaseViewer: React.FC = () => {
    const { searchTerm } = useUI();
    const [activeTable, setActiveTable] = useState<TableType>('plc_values');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

    const checkHealth = async () => {
        try {
            const health = await apiService.healthCheck();
            setDbStatus(health.database === 'connected' ? 'connected' : 'disconnected');
        } catch (err) {
            setDbStatus('disconnected');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        await checkHealth();
        try {
            if (activeTable === 'plc_values') {
                const response = await apiService.getLatestValues();
                setData(response.values);
            } else {
                const response = await apiService.getCalculatedMetrics();
                setData(response);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch data');
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        if (activeTable === 'plc_values') {
            // Start SignalR for live updates only for plc_values
            signalRService.start();

            const handleUpdate = (values: any[]) => {
                setData(values);
                setIsLive(true);
                setLoading(false);
            };

            signalRService.subscribe(handleUpdate);
            return () => signalRService.unsubscribe(handleUpdate);
        }
    }, [activeTable]);

    useEffect(() => {
        const healthInterval = setInterval(checkHealth, 5000);
        return () => clearInterval(healthInterval);
    }, []);

    // Auto-refresh interval
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isLive || activeTable !== 'plc_values') {
                fetchData();
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [activeTable, isLive]);

    const handleTableChange = (
        _event: React.MouseEvent<HTMLElement>,
        newTable: TableType | null,
    ) => {
        if (newTable !== null) {
            setActiveTable(newTable);
            setIsLive(false);
        }
    };

    // Format column names
    const formatName = (name: string) => {
        return name
            .split(/[_-]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

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

    const getValueColor = (value: any) => {
        const str = String(value).toUpperCase();
        if (str === 'TRUE' || str === '1' || str === 'RUNNING' || str === 'ACTIVE') return 'success';
        if (str === 'FALSE' || str === '0' || str === 'STOPPED' || str === 'INACTIVE') return 'default';
        if (!isNaN(Number(str))) return 'primary';
        return 'default';
    };

    return (
        <Container maxWidth="xl" sx={{ py: 4, transition: 'all 0.3s ease' }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
                <Box display="flex" alignItems="center" gap={2}>
                    <StorageIcon sx={{ fontSize: 40, color: (theme) => theme.palette.primary.main }} />
                    <Box>
                        <Typography variant="h3" fontWeight={700} sx={{ color: (theme) => theme.palette.text.primary, display: 'flex', alignItems: 'center', gap: 2 }}>
                            Database Explorer
                            <Chip
                                label={dbStatus === 'connected' ? 'DB CONNECTED' : dbStatus === 'disconnected' ? 'DB DISCONNECTED' : 'CHECKING DB...'}
                                color={dbStatus === 'connected' ? 'success' : dbStatus === 'disconnected' ? 'error' : 'default'}
                                size="small"
                                variant="filled"
                                sx={{ fontWeight: 800, fontSize: '0.7rem', height: 20 }}
                            />
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {activeTable === 'plc_values'
                                ? 'Real-time PLC parameters from PostgreSQL'
                                : 'Advanced calculated metrics and performance data'}
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={2}>
                    <ToggleButtonGroup
                        value={activeTable}
                        exclusive
                        onChange={handleTableChange}
                        aria-label="database table"
                        size="small"
                        sx={{
                            backgroundColor: (theme) => theme.palette.background.paper,
                            '& .MuiToggleButton-root': {
                                px: 2,
                                fontWeight: 600,
                                textTransform: 'none'
                            }
                        }}
                    >
                        <ToggleButton value="plc_values" aria-label="plc values">
                            <StorageIcon sx={{ mr: 1, fontSize: 18 }} />
                            PLC Values
                        </ToggleButton>
                        <ToggleButton value="calculated_metrics" aria-label="calculated metrics">
                            <FunctionsIcon sx={{ mr: 1, fontSize: 18 }} />
                            Calculated Data
                        </ToggleButton>
                    </ToggleButtonGroup>
                    <Box display="flex" alignItems="center" gap={1}>
                        {activeTable === 'plc_values' && isLive && (
                            <Chip
                                icon={<TrendingUpIcon />}
                                label="LIVE UPDATES"
                                color="success"
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                            />
                        )}
                        <Tooltip title="Refresh data">
                            <IconButton onClick={fetchData} color="primary" disabled={loading} size="small">
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert
                    severity="error"
                    sx={{ mb: 3, borderRadius: 2 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* Loading/Data State */}
            {loading && data.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                    <CircularProgress size={60} thickness={4} />
                </Box>
            ) : data.length > 0 ? (
                <TableContainer
                    component={Paper}
                    sx={{
                        borderRadius: 3,
                        boxShadow: (theme) => theme.palette.mode === 'dark'
                            ? '0 4px 20px rgba(0,0,0,0.4)'
                            : '0 4px 20px rgba(0,0,0,0.05)',
                        transition: 'all 0.3s ease',
                        overflow: 'hidden'
                    }}
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
                                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5'
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
                                    sx={{
                                        '&:hover': {
                                            backgroundColor: (theme) => theme.palette.mode === 'dark'
                                                ? 'rgba(255, 255, 255, 0.03)'
                                                : 'rgba(0, 0, 0, 0.01)',
                                        },
                                        transition: 'background-color 0.2s ease',
                                    }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {index + 1}
                                        </Typography>
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
                                                    variant={isNaN(Number(row[col])) ? "filled" : "outlined"}
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
                /* Empty State */
                <Paper
                    sx={{
                        p: 8,
                        textAlign: 'center',
                        borderRadius: 4,
                        border: '2px dashed',
                        borderColor: 'divider',
                        backgroundColor: 'transparent',
                        transition: 'all 0.3s ease',
                    }}
                >
                    <Box sx={{ opacity: 0.5 }}>
                        <StorageIcon sx={{ fontSize: 80, mb: 2 }} />
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            No Data Found
                        </Typography>
                        <Typography variant="body1" color="text.secondary" mb={4} maxWidth={500} mx="auto">
                            We couldn't find any records in the <strong>{activeTable}</strong> table.
                            If the database team just connected, please wait a moment or try refreshing.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        onClick={fetchData}
                        startIcon={<RefreshIcon />}
                        sx={{ borderRadius: 2, px: 4 }}
                    >
                        Check Again
                    </Button>
                </Paper>
            )}
        </Container>
    );
};
