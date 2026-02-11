import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    Box,
    Grid,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip
} from '@mui/material';
import { AccountBalanceWalletRounded, DateRangeRounded } from '@mui/icons-material';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { fmtMoney } from '../../lib/money';

interface PaymentMethodData {
    method: string;
    transaction_count: number;
    total_amount: number;
}

interface PaymentReportData {
    date_from: string;
    date_to: string;
    methods: Record<string, PaymentMethodData>;
    totals: {
        grand_total: number;
        total_transactions: number;
    };
}

export const PaymentMethodsReport: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<PaymentReportData | null>(null);

    // Default to today
    const today = new Date().toISOString().split('T')[0];
    const [dateFrom, setDateFrom] = useState(today);
    const [dateTo, setDateTo] = useState(today);

    const fetchReport = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const { status, response }: IResponse = await request(
                `/reports/payments-by-method?${params.toString()}`,
                'GET'
            );

            if (status) {
                const result = await response.json();
                setData(result.data);
            } else {
                setError('Error al cargar el reporte');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const paymentMethods = data ? Object.values(data.methods) : [];

    // Payment method colors
    const getMethodColor = (method: string) => {
        const colors: Record<string, string> = {
            'Zelle': '#6B46C1',
            'PayPal': '#003087',
            'Binance': '#F3BA2F',
            'Transferencia': '#10B981',
            'Efectivo': '#16A34A',
            'Tarjeta': '#3B82F6',
        };
        return colors[method] || '#6B7280';
    };

    return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <AccountBalanceWalletRounded fontSize="large" color="primary" />
                <Box>
                    <Typography variant="h6" fontWeight="bold">
                        Pagos por Método
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Resumen de pagos recibidos según método de pago
                    </Typography>
                </Box>
            </Box>

            {/* Date Range Filters */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <TextField
                    label="Fecha Desde"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    sx={{ minWidth: 180 }}
                />
                <TextField
                    label="Fecha Hasta"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    sx={{ minWidth: 180 }}
                />
                <Button
                    variant="contained"
                    onClick={fetchReport}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <DateRangeRounded />}
                    sx={{ borderRadius: 2 }}
                >
                    {loading ? 'Cargando...' : 'Consultar'}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading && !data ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : data && paymentMethods.length > 0 ? (
                <>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Método de Pago</strong></TableCell>
                                    <TableCell align="right"><strong>Transacciones</strong></TableCell>
                                    <TableCell align="right"><strong>Total (USD)</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paymentMethods.map((method) => (
                                    <TableRow key={method.method} hover>
                                        <TableCell>
                                            <Chip
                                                label={method.method}
                                                size="small"
                                                sx={{
                                                    bgcolor: getMethodColor(method.method),
                                                    color: 'white',
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2">
                                                {method.transaction_count}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight="bold" color="primary">
                                                {fmtMoney(method.total_amount, 'USD')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell><strong>TOTAL GENERAL</strong></TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight="bold">
                                            {data.totals.total_transactions}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="h6" fontWeight="black" color="primary">
                                            {fmtMoney(data.totals.grand_total, 'USD')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Visual Summary */}
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                            Distribución Visual
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                            {paymentMethods.map((method) => {
                                const percentage = (method.total_amount / data.totals.grand_total) * 100;
                                return (
                                    <Box
                                        key={method.method}
                                        sx={{
                                            flex: `0 0 ${Math.max(percentage, 10)}%`,
                                            minWidth: 100,
                                            p: 2,
                                            bgcolor: getMethodColor(method.method) + '20',
                                            border: `2px solid ${getMethodColor(method.method)}`,
                                            borderRadius: 2,
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Typography variant="caption" fontWeight="bold" display="block">
                                            {method.method}
                                        </Typography>
                                        <Typography variant="h6" fontWeight="black" color={getMethodColor(method.method)}>
                                            {percentage.toFixed(1)}%
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {fmtMoney(method.total_amount, 'USD')}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </>
            ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                        No hay datos para el rango seleccionado
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};
