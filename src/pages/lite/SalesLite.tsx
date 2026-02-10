import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LiteNotificationBell } from './LiteNotificationBell';
import {
    Box,
    Typography,
    Tabs,
    useTheme,
    alpha,
    Tab,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    CircularProgress,
    TextField,
    InputAdornment,
    Button,
    Badge,
    Collapse,
    Divider,
    AppBar,
    Toolbar
} from '@mui/material';
import { useUserStore } from '../../store/user/UserStore';
import { request } from '../../common/request';
import { toast, ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// import { Layout } from '../../components/ui/Layout'; // Removed per request
import { SearchRounded, RefreshRounded, WhatsApp, LogoutRounded, NotificationsRounded } from '@mui/icons-material';
import { statusColors } from '../../components/orders/OrderItem';
import { green, blue, orange, red, grey } from '@mui/material/colors';
import { LiteOrderDialog } from './LiteOrderDialog';
import { LiteNotificationMonitor } from './LiteNotificationMonitor';
import { LiteBroadcastMonitor } from './LiteBroadcastMonitor';
import { LiteSettingsMenu } from './LiteSettingsMenu';
import { fmtMoney } from '../../lib/money';
import { BankAccountsDialog } from '../../components/orders/BankAccountsDialog';
import { CreateOrderDialog } from '../../components/orders/CreateOrderDialog';
import { DailyRatesDialog } from '../../components/orders/DailyRatesDialog';
import { AccountBalanceRounded, AddCircleOutline, CurrencyExchange } from '@mui/icons-material';
import { OrderTimer } from '../../components/orders/OrderTimer';

// Componente simple de Tabla Lite
const LiteOrderTable = ({ statusTitle, searchTerm, onRefresh }: any) => {
    const user = useUserStore((state) => state.user);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null); // Para abrir el Dialog Lite
    const [openDialog, setOpenDialog] = useState(false);

    // Fetch data logic
    const fetchOrders = useCallback(async (reset = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const pageToLoad = reset ? 1 : page;
            const params = new URLSearchParams();
            params.append('per_page', '25');
            params.append('page', pageToLoad.toString());
            params.append('status', statusTitle);
            if (searchTerm) params.append('search', searchTerm);

            const { status, response } = await request(`/orders?${params.toString()}`, 'GET');
            if (status === 200) {
                const data = await response.json();
                if (reset) {
                    setOrders(data.data);
                    setPage(2);
                } else {
                    setOrders(prev => [...prev, ...data.data]);
                    setPage(prev => prev + 1);
                }
                setHasMore(data.meta.last_page >= pageToLoad + 1);
            }
        } catch (e) {
            console.error(e);
            toast.error("Error cargando órdenes");
        } finally {
            setLoading(false);
        }
    }, [loading, page, statusTitle, searchTerm]);

    // Efecto para cargar al cambiar status o búsqueda
    useEffect(() => {
        fetchOrders(true);
    }, [statusTitle, searchTerm]);

    // Exponer refresh al padre si fuera necesario (aquí lo usamos interno)
    useEffect(() => {
        if (onRefresh) onRefresh.current = () => fetchOrders(true);
    }, [onRefresh, statusTitle]);



    const handleOpenOrder = (order: any) => {
        setSelectedOrder(order);
        setOpenDialog(true);
    };

    const handleOpenOrderById = useCallback((id: number) => {
        setSelectedOrder({ id });
        setOpenDialog(true);
    }, []);

    return (
        <React.Fragment>
            <LiteNotificationMonitor orders={orders} onOpenOrder={handleOpenOrderById} />
            <LiteBroadcastMonitor onOrderUpdate={fetchOrders} onOpenOrder={handleOpenOrderById} />
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: '70vh', bgcolor: 'background.paper' }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>ID / Cliente</TableCell>
                            <TableCell>Detalles</TableCell>
                            <TableCell>Estado</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            #{order.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {order.client?.first_name} {order.client?.last_name}
                                        </Typography>
                                        <Typography variant="caption" color="primary">
                                            {order.client?.phone}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="medium">
                                        {order.current_total_price} {order.currency}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {order.item_count || order.products?.length || '?'} items
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={order.status?.description}
                                        size="small"
                                        sx={{
                                            bgcolor: statusColors[order.status?.description] || grey[300],
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '0.7rem'
                                        }}
                                    />
                                    {order.novedad_type && (
                                        <Typography variant="caption" display="block" color="error" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                                            ⚠️ {order.novedad_type}
                                        </Typography>
                                    )}
                                    {order.scheduled_for && ['Programado para mas tarde', 'Reprogramado para hoy', 'Programado para otro dia', 'Reprogramado'].includes(order.status?.description) && (
                                        <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                                            📅 {new Date(order.scheduled_for).toLocaleDateString() === new Date().toLocaleDateString()
                                                ? `Hoy ${new Date(order.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                : new Date(order.scheduled_for).toLocaleDateString([], { day: '2-digit', month: '2-digit' })
                                            }
                                        </Typography>
                                    )}
                                    <Box sx={{ mt: 0.5 }}>
                                        <OrderTimer
                                            receivedAt={order.status?.description === 'Novedades' ? order.updated_at : order.received_at}
                                            deliveredAt={order.status?.description === 'Entregado' ? (order.processed_at || order.updated_at) : null}
                                            status={order.status?.description || ''}
                                        />
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Box display="flex" justifyContent="flex-end" gap={1}>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => handleOpenOrder(order)}
                                            sx={{ borderRadius: 4, textTransform: 'none', px: 2 }}
                                        >
                                            Gestionar
                                        </Button>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No hay órdenes en esta bandeja</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && hasMore && orders.length > 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    <Button onClick={() => fetchOrders(false)} size="small">Cargar más</Button>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Reemplazo por LiteOrderDialog */}
            {selectedOrder && (
                <LiteOrderDialog
                    open={openDialog}
                    setOpen={setOpenDialog}
                    id={selectedOrder.id}
                    onClose={() => {
                        // Forzamos actualización al cerrar
                        fetchOrders(true);
                        // También podríamos disparar actualización de contadores mediante prop si lo pasamos
                        if (onRefresh && onRefresh.current) onRefresh.current();
                    }}
                />
            )}
        </React.Fragment>
    );
};

export const SalesLite = () => {
    const user = useUserStore((state) => state.user);
    const logout = useUserStore((state) => state.logout);
    const validateToken = useUserStore((state) => state.validateToken);
    const theme = useTheme();
    const [currentTab, setCurrentTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [commissions, setCommissions] = useState(0);
    const [loadingCommissions, setLoadingCommissions] = useState(false);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const refreshRef = useRef<any>(null);
    const [openBankDialog, setOpenBankDialog] = useState(false);
    const [openRatesDialog, setOpenRatesDialog] = useState(false);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);
    const [showTestPanel, setShowTestPanel] = useState(false);

    useEffect(() => {
        if (!user.id) {
            validateToken();
        } else {
            fetchCommissions();
            fetchCounts();
        }
    }, [user.id, validateToken]);

    // Polling unificado: cada 45s refresca ordenes, contadores y comisiones
    useEffect(() => {
        if (!user.id) return;

        const interval = setInterval(() => {
            // 1. Refrescar Ordenes (si la tab está montada y ref asignada)
            if (refreshRef.current) {
                refreshRef.current();
            }
            // 2. Refrescar Contadores y Comisiones
            fetchCounts();
            fetchCommissions();
        }, 45000);

        return () => clearInterval(interval);
    }, [user.id]);

    const fetchCounts = async () => {
        try {
            const { status, response } = await request('/orders/lite/counts', 'GET');
            if (status === 200) {
                const data = await response.json();
                setCounts(data.counts || {});
            }
        } catch (e) {
            console.error("Error fetching counts", e);
        }
    };

    const fetchCommissions = async () => {
        if (loadingCommissions) return;
        setLoadingCommissions(true);
        try {
            const { status, response } = await request('/earnings/me', 'GET');
            if (status === 200) {
                const body = await response.json();
                // Backend returns: { status: true, data: { amount_usd: ... } }
                setCommissions(Number(body.data?.amount_usd) || 0);
            }
        } catch (e) {
            console.error("Error fetching commissions", e);
        } finally {
            setLoadingCommissions(false);
        }
    };

    const handleLogout = async () => {
        if (await logout()) {
            window.location.href = "/";
        }
    };

    const triggerTestNoti = async (type: string) => {
        try {
            const body = new URLSearchParams();
            body.append('type', type);
            const { status, response } = await request('/test/notifications', 'POST', body);
            if (status === 200) {
                toast.success(`Disparada: ${type}`);
            } else {
                const data = await response.json();
                toast.error(data.message || "Error al disparar notificación");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error de conexión");
        }
    };

    // Definimos las Tabs disponibles para la vendedora Lite (Ajustado a requerimiento)
    const TABS = [
        { label: "Reprogramado Hoy", status: "Reprogramado para hoy" },
        { label: "Asignado a Mí", status: "Asignado a vendedor" },
        { label: "Llamado 1", status: "Llamado 1" },
        { label: "Llamado 2", status: "Llamado 2" },
        { label: "Llamado 3", status: "Llamado 3" },
        { label: "Esperando Ubicación", status: "Esperando Ubicacion" },
        { label: "Listo para Agencia", status: "Asignar a agencia" },
        { label: "Para Más Tarde", status: "Programado para mas tarde" },
        { label: "Programado otro día", status: "Programado para otro dia" },
        { label: "Novedades", status: "Novedades" },
        { label: "Novedad Solucionada", status: "Novedad Solucionada" },
        { label: "Entregadas", status: "Entregado" },
        { label: "Canceladas", status: "Cancelado" }
    ];

    const getCurrentStatus = () => TABS[currentTab].status;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', fontFamily: 'inherit', transition: 'background-color 0.3s' }}>
            {/* HEADER MINIMALISTA - SIN LAYOUT COMPLEJO */}
            <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary' }}>
                <Toolbar sx={{ justifyContent: 'space-between', minHeight: 60 }}>
                    {/* 1. Logo / Info */}
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
                        <Box>
                            <Typography variant="h6" fontWeight="black" color="primary" sx={{ lineHeight: 1 }}>
                                Nuviora
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                                Panel de Ventas
                            </Typography>
                        </Box>
                    </Box>

                    {/* 2. Comisiones (Display Pequeño) */}
                    <Paper elevation={0} sx={{
                        px: 2, py: 0.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.2),
                        borderRadius: 4,
                        display: 'flex', alignItems: 'center', gap: 1
                    }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.65rem' }}>
                            Comisiones Hoy
                        </Typography>
                        <Typography variant="subtitle2" fontWeight="black" color="primary">
                            {fmtMoney(commissions)}
                        </Typography>
                        <IconButton size="small" onClick={() => { fetchCommissions(); fetchCounts(); }} disabled={loadingCommissions} sx={{ p: 0.5 }}>
                            <RefreshRounded fontSize="small" sx={{ fontSize: 16, animation: loadingCommissions ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                        </IconButton>
                    </Paper>

                    {/* 3. Acciones (Notificaciones + Logout) */}
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <IconButton
                            size="small"
                            onClick={() => setOpenBankDialog(true)}
                            sx={{
                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                color: theme.palette.info.main,
                                display: { xs: 'flex', md: 'none' } // Solo icon en movil
                            }}
                        >
                            <AccountBalanceRounded fontSize="small" />
                        </IconButton>
                        <Button
                            startIcon={<AccountBalanceRounded />}
                            size="small"
                            onClick={() => setOpenBankDialog(true)}
                            sx={{
                                display: { xs: 'none', md: 'flex' },
                                borderRadius: 4,
                                textTransform: 'none',
                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                color: theme.palette.info.main
                            }}
                        >
                            Cuentas
                        </Button>

                        {/* Botón Tasas - Móvil */}
                        <IconButton
                            size="small"
                            onClick={() => setOpenRatesDialog(true)}
                            sx={{
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                color: theme.palette.success.main,
                                display: { xs: 'flex', md: 'none' }
                            }}
                        >
                            <CurrencyExchange fontSize="small" />
                        </IconButton>

                        {/* Botón Tasas - Desktop */}
                        <Button
                            startIcon={<CurrencyExchange />}
                            size="small"
                            onClick={() => setOpenRatesDialog(true)}
                            sx={{
                                display: { xs: 'none', md: 'flex' },
                                borderRadius: 4,
                                textTransform: 'none',
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                color: theme.palette.success.main
                            }}
                        >
                            Tasas
                        </Button>

                        {/* Botón Crear Orden - Móvil */}
                        <IconButton
                            size="small"
                            onClick={() => setOpenCreateDialog(true)}
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                display: { xs: 'flex', md: 'none' }
                            }}
                        >
                            <AddCircleOutline fontSize="small" />
                        </IconButton>

                        {/* Botón Crear Orden - Desktop */}
                        <Button
                            startIcon={<AddCircleOutline />}
                            size="small"
                            onClick={() => setOpenCreateDialog(true)}
                            sx={{
                                display: { xs: 'none', md: 'flex' },
                                borderRadius: 4,
                                textTransform: 'none',
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main
                            }}
                        >
                            Crear
                        </Button>

                        <LiteSettingsMenu />
                        <LiteNotificationBell />
                        <IconButton size="small" onClick={() => setShowTestPanel(!showTestPanel)} sx={{ color: 'warning.main', bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                            <NotificationsRounded fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={handleLogout} sx={{ color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) } }}>
                            <LogoutRounded fontSize="small" />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* CONTENIDO PRINCIPAL */}
            <Box sx={{ maxWidth: 1000, margin: '0 auto', width: '100%', p: { xs: 1, md: 3 } }}>

                {/* Buscador Integrado */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                    <TextField
                        fullWidth
                        placeholder="Buscar cliente, teléfono o #orden..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRounded color="action" />
                                </InputAdornment>
                            ),
                            sx: { bgcolor: 'background.paper', borderRadius: 3 }
                        }}
                        variant="outlined"
                        size="small"
                    />
                    <IconButton sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }} onClick={() => refreshRef.current && refreshRef.current()}>
                        <RefreshRounded />
                    </IconButton>
                </Box>

                {/* TEST NOTIFICATION PANEL */}
                <Collapse in={showTestPanel}>
                    <Paper sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px dashed orange', bgcolor: alpha(orange[500], 0.05) }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: orange[800] }}>🛠 PANEL DE PRUEBAS - NOTIFICACIONES</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Button size="small" variant="outlined" color="primary" onClick={() => triggerTestNoti('assigned')}>Test Asignación</Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => triggerTestNoti('novelty')}>Test Novedad</Button>
                            <Button size="small" variant="outlined" color="success" onClick={() => triggerTestNoti('resolved')}>Test Resuelta</Button>
                            <Button size="small" variant="outlined" color="info" onClick={() => triggerTestNoti('scheduled')}>Test Posponer</Button>
                            <Button size="small" variant="outlined" color="warning" onClick={() => triggerTestNoti('waiting')}>Test Espera</Button>
                        </Box>
                    </Paper>
                </Collapse>

                {/* Tabs de Navegación */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, bgcolor: 'background.paper', borderRadius: 2, px: 2 }}>
                    <Tabs
                        value={currentTab}
                        onChange={(_, v) => setCurrentTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                    >
                        {TABS.map((tab, idx) => (
                            <Tab
                                key={idx}
                                label={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        {tab.label}
                                        <Chip
                                            label={counts[tab.status] || 0}
                                            size="small"
                                            sx={{
                                                height: 20,
                                                minWidth: 20,
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                bgcolor: currentTab === idx ? 'primary.main' : alpha(theme.palette.text.primary, 0.1),
                                                color: currentTab === idx ? 'white' : 'text.primary'
                                            }}
                                        />
                                    </Box>
                                }
                                sx={{ borderRadius: 2, minHeight: 50, textTransform: 'none', fontWeight: 'bold' }}
                            />
                        ))}
                    </Tabs>
                </Box>

                {/* Contenido de la Tabla */}
                {/* Contenido de la Tabla */}
                <LiteOrderTable
                    statusTitle={getCurrentStatus()}
                    searchTerm={searchTerm}
                    onRefresh={refreshRef}
                />
            </Box>

            {/* Dialogo de Cuentas, Tasas, Crear Orden */}
            <BankAccountsDialog open={openBankDialog} onClose={() => setOpenBankDialog(false)} />
            <DailyRatesDialog open={openRatesDialog} onClose={() => setOpenRatesDialog(false)} />
            <CreateOrderDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                onSuccess={() => {
                    if (refreshRef.current) refreshRef.current();
                    fetchCounts();
                }}
            />

            <ToastContainer
                stacked
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={user.theme || 'dark'}
                transition={Bounce}
            />
        </Box>
    );
};
