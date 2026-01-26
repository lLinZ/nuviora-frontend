import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    Stack,
    Divider,
    Chip,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    ContentCopyRounded,
    CloudUploadRounded,
    AccountBalanceRounded,
    PersonRounded,
    CalendarTodayRounded,
    AttachMoneyRounded,
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { Loading } from '../../components/ui/content/Loading';
import { toast } from 'react-toastify';
import { useValidateSession } from '../../hooks/useValidateSession';
import moment from 'moment';
import { blue, green, orange } from '@mui/material/colors';
import { OrderDialog } from '../../components/orders/OrderDialog';

export const PendingVueltos: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [orders, setOrders] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    useEffect(() => {
        if (isValid) {
            loadPendingVueltos();
            loadBanks();
        }
    }, [isValid]);

    const loadBanks = async () => {
        const { status, response }: IResponse = await request('/banks', 'GET');
        if (status === 200) {
            const data = await response.json();
            setBanks(data);
        }
    };

    const loadPendingVueltos = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/orders/pending-vueltos', 'GET');
            if (status === 200) {
                const data = await response.json();
                setOrders(data.orders);
            }
        } catch (error) {
            toast.error('Error al cargar vueltos pendientes');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyDetails = (order: any) => {
        const details = order.change_payment_details;
        if (!details) return;

        let text = "";
        const method = order.change_method_company;

        const getBankName = (id: any) => banks.find(b => b.id === id)?.name || "N/A";

        if (method === 'BOLIVARES_PAGOMOVIL') {
            text = `PAGO MÓVIL\nCédula: ${details.cedula}\nBanco: ${getBankName(details.bank_id)}\nTeléfono: ${details.phone_prefix}${details.phone_number}`;
        } else if (method === 'BOLIVARES_TRANSFERENCIA') {
            text = `TRANSFERENCIA BANCARIA\nCuenta: ${details.account_number}\nCédula: ${details.cedula}\nBanco: ${getBankName(details.bank_id)}`;
        } else if (['ZELLE_DOLARES', 'BINANCE_DOLARES', 'PAYPAL_DOLARES', 'ZINLI_DOLARES'].includes(method)) {
            text = `${method.split('_')[0]}: ${details.email}`;
        }

        if (text) {
            navigator.clipboard.writeText(text);
            toast.info("Datos del cliente copiados 📋");
        }
    };

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: 2 }}>
                <DescripcionDeVista
                    title="Vueltos Pendientes"
                    description="Órdenes entregadas que requieren pago de vuelto por parte de administración."
                />

                {loading && orders.length === 0 ? (
                    <Loading />
                ) : orders.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
                        <AccountBalanceRounded sx={{ fontSize: 60, mb: 2 }} />
                        <Typography variant="h6">No hay vueltos pendientes por pagar</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        {orders.map((order) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={order.id}>
                                <Card sx={{
                                    borderRadius: 4,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: '0.3s',
                                    '&:hover': { boxShadow: 4 }
                                }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                                            <Box>
                                                <Typography variant="h6" fontWeight="bold" color="primary">
                                                    #{order.order_number}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {moment(order.processed_at).format('DD/MM/YYYY hh:mm A')}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={order.change_method_company?.replace('_', ' ')}
                                                size="small"
                                                color="info"
                                                variant="outlined"
                                            />
                                        </Stack>

                                        <Divider sx={{ my: 1.5 }} />

                                        <Stack spacing={1}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PersonRounded fontSize="small" color="disabled" />
                                                <Typography variant="body2">{order.client?.name || 'Cliente sin nombre'}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <AttachMoneyRounded fontSize="small" color="success" />
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    Vuelto: ${Number(order.change_amount_company).toFixed(2)}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                                            <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>
                                                MÉTODO: {order.change_method_company}
                                            </Typography>
                                            {order.change_payment_details ? (
                                                <Typography variant="body2" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                    Datos disponibles para copiar
                                                </Typography>
                                            ) : (
                                                <Typography variant="body2" color="error" sx={{ fontSize: '0.75rem' }}>
                                                    ⚠ Sin datos de pago cargados
                                                </Typography>
                                            )}
                                        </Box>

                                        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                startIcon={<ContentCopyRounded />}
                                                disabled={!order.change_payment_details}
                                                onClick={() => handleCopyDetails(order)}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                Copiar
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => setSelectedOrder(order)}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                Ver
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            {selectedOrder && (
                <OrderDialog
                    id={selectedOrder.id}
                    open={!!selectedOrder}
                    setOpen={(val) => {
                        if (!val) {
                            setSelectedOrder(null);
                            loadPendingVueltos();
                        }
                    }}
                />
            )}
        </Layout>
    );
};
