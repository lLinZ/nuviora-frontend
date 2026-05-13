import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Toolbar,
    TextField,
    Stack,
    useTheme,
    CircularProgress,
    IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';

import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { useUserStore } from '../../store/user/UserStore';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/ui/Layout';
import { format } from 'date-fns';

export const OrdersExportPage: React.FC = () => {
    const user = useUserStore((state) => state.user);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState<string>(format(new Date(), 'yyyy-MM-01'));
    const [toDate, setToDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    if (!user || !['Admin', 'Gerente'].includes(user.role?.description || '')) {
        return <Navigate to="/dashboard" />;
    }

    const handleExport = async () => {
        if (!fromDate || !toDate) {
            alert('Por favor selecciona ambas fechas.');
            return;
        }

        setLoading(true);
        try {
            const { status, response }: IResponse = await request(
                `/reports/orders-export?from=${fromDate}&to=${toDate}`,
                'GET'
            );
            if (status) {
                const json = await response.json();
                const orders = json.data ?? [];

                if (orders.length === 0) {
                    alert('No se encontraron órdenes en este rango de fechas.');
                    return;
                }

                // Transform data for Excel
                const rows = orders.map((o: any) => ({
                    'N° Pedido': o.order_number,
                    'ID Sistema': o.id,
                    'Estatus': o.status,
                    'Cliente': o.client_name,
                    'Teléfono': o.client_phone,
                    'Ciudad': o.city,
                    'Provincia': o.province,
                    'Vendedora': o.agent_name,
                    'Agencia': o.agency_name,
                    'Repartidor': o.deliverer_name,
                    'Resumen Productos': o.products_summary,
                    'Total USD': o.total,
                    'Método de Pago': o.payment_method,
                    'Moneda': o.currency,
                    'Fecha de Creación': o.created_at || '—',
                    'Fecha de Entrega': o.processed_at || '—',
                    'Programada para': o.scheduled_for || '—',
                    'Horas hasta entrega': o.duration_hours ?? '—'
                }));

                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Órdenes');

                // Adjust column widths
                const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
                    wch: Math.max(key.length, ...rows.map((r: any) => String(r[key] ?? '').length)) + 2,
                }));
                ws['!cols'] = colWidths;

                XLSX.writeFile(wb, `exportacion_ordenes_${fromDate}_al_${toDate}.xlsx`);
            } else {
                alert('Hubo un error al exportar las órdenes.');
            }
        } catch (error) {
            console.error('Error al exportar:', error);
            alert('Ocurrió un error inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <Toolbar />
            <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 800, mx: 'auto' }}>
                <Paper
                    sx={{
                        p: 3,
                        borderRadius: 4,
                        mb: 3,
                        background: isDark
                            ? 'linear-gradient(135deg, #1a237e22, #0d47a122)'
                            : 'linear-gradient(135deg, #e3f2fd, #f8f9fa)',
                        border: '1px solid',
                        borderColor: isDark ? 'primary.dark' : 'primary.light',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
                        <IconButton onClick={() => navigate(-1)} size="small">
                            <ArrowBackIcon />
                        </IconButton>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h4" fontWeight="black" gutterBottom sx={{ mb: 0 }}>
                                📥 Exportar Órdenes
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Descarga un Excel con todas las órdenes y sus detalles en un rango de fechas.
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                <Paper sx={{ p: 4, borderRadius: 3 }}>
                    <Stack spacing={4}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                            <TextField
                                fullWidth
                                label="Fecha Desde"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                            <TextField
                                fullWidth
                                label="Fecha Hasta"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </Stack>
                        
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                            onClick={handleExport}
                            disabled={loading}
                            sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 2 }}
                        >
                            {loading ? 'Generando Excel...' : 'Exportar Órdenes a Excel'}
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </Layout>
    );
};
