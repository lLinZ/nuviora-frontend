import { AppBar, Box, Dialog, DialogActions, Divider, IconButton, Toolbar, Typography, useTheme, DialogContent, Tab, Tabs, Grid, Paper, Tooltip, Zoom, Fab, Menu, MenuItem, ListItemIcon, ListItemText, DialogTitle, TextField, Button, Alert, AlertTitle, Badge } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useState, useEffect } from "react";
import { darken, lighten } from "@mui/material/styles";

import { useOrderDialogLogic } from "../../hooks/useOrderDialogLogic";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { PostponeOrderDialog } from "./PostponeOrderDialog";
import { ReviewCancellationDialog } from "./ReviewCancellationDialog";
import { ReviewDeliveryDialog } from "./ReviewDeliveryDialog";
import { ReminderDialog } from "./ReminderDialog";
import { AssignDelivererDialog } from "./AssignDelivererDialog";
import { AssignAgentDialog } from "./AssignAgentDialog";
import { AssignAgencyDialog } from "./AssignAgencyDialog";
import { OrderPaymentSection } from "./OrderPaymentSection";
import { OrderChangeSection } from "./OrderChangeSection";
import { OrderTimer } from "./OrderTimer";
import { OrderUpdatesList } from "./OrderUpdatesList";
import { OrderUpdateInput } from "./OrderUpdateInput";
import { OrderActivityList } from "./OrderActivityList";
import { OrderProductsList } from "./OrderProductsList";
import { OrderHeader } from "./OrderHeader";
import { OrderCompanyAccounts } from "./OrderCompanyAccounts";
import { fmtMoney } from "../../lib/money";
import { ButtonCustom } from "../custom";
import { ProductSearchDialog } from "../products/ProductsSearchDialog";
import { OrderProductItem } from "./OrderProductItem";
import {
    NotificationAddRounded,
    ShoppingCartRounded,
    ReceiptLongRounded,
    HistoryRounded,
    MoreVertRounded,
    DeleteSweepRounded,
    EventRepeatRounded,
    AssignmentIndRounded,
    LocalShippingRounded,
    ContentCopyRounded,
    WarningAmberRounded,
    ApartmentRounded,
    CheckCircleRounded,
    RuleRounded,
    Inventory2Outlined as Inventory2OutlinedIcon,
    ReplayRounded,
    CurrencyExchange
} from "@mui/icons-material";
import { request } from "../../common/request";
import { MarkDeliveredDialog } from "./MarkDeliveredDialog";
import { ReportNovedadDialog } from "./ReportNovedadDialog";
import { ResolveNovedadDialog } from "./ResolveNovedadDialog";
import { LogisticsDialog } from "./LogisticsDialog";
import DenseMenu from "../ui/content/DenseMenu";
import { toast } from "react-toastify";
import { DailyRatesDialog } from "./DailyRatesDialog";

interface OrderDialogProps {
    id?: number;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const OrderDialog: FC<OrderDialogProps> = ({ id, open, setOpen }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const [activeTab, setActiveTab] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const {
        selectedOrder: order,
        user,
        openCancel, setOpenCancel,
        openPostpone, setOpenPostpone,
        openApprove, setOpenApprove,
        openReject, setOpenReject,
        loadingReview,
        // openAssignDeliverer, setOpenAssignDeliverer, // Moved to local state
        // openAssign, setOpenAssign, // Moved to local state
        newLocation,
        handleClose,
        sendLocation,
        approveCancellation,
        rejectCancellation,
        changeStatus,
        handleChangeNewLocation,
        updateOrder,
        addUpsell,
        removeUpsell,
        openApproveDelivery, setOpenApproveDelivery,
        openRejectDelivery, setOpenRejectDelivery,
        approveDelivery,
        rejectDelivery,
        openApproveLocation, setOpenApproveLocation,
        openRejectLocation, setOpenRejectLocation,
        openApproveRejection, setOpenApproveRejection,
        openRejectRejection, setOpenRejectRejection,
        approveLocation,
        rejectLocation,
        approveRejection,
        rejectRejection,
        setReminder,
        openMarkDelivered, setOpenMarkDelivered,
        openReportNovedad, setOpenReportNovedad,
        openResolveNovedad, setOpenResolveNovedad,
        pendingStatus,
        targetStatus,
        pendingExtraData,
        fetchOrder,
        refreshOrder,
        updateProductQuantity,
    } = useOrderDialogLogic(id, open, setOpen);

    const [openReminder, setOpenReminder] = useState(false);
    const [openSearch, setOpenSearch] = useState(false);
    const [openRates, setOpenRates] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [openAssignAgency, setOpenAssignAgency] = useState(false);
    const [openAssignDeliverer, setOpenAssignDeliverer] = useState(false);
    const [openLogistics, setOpenLogistics] = useState(false);
    const [showUpsellConfirm, setShowUpsellConfirm] = useState(false);
    const [upsellCandidate, setUpsellCandidate] = useState<any>(null);
    const [upsellQty, setUpsellQty] = useState(1);
    const [upsellPrice, setUpsellPrice] = useState(0);
    const [stagedPayments, setStagedPayments] = useState<any[]>([]);
    const [confirmReturnOpen, setConfirmReturnOpen] = useState(false);
    const [confirmType, setConfirmType] = useState<'devolucion' | 'cambio'>('devolucion');
    const [creatingReturn, setCreatingReturn] = useState(false);
    const [isAddingRegular, setIsAddingRegular] = useState(false);

    useEffect(() => {
        if (order?.payments) {
            setStagedPayments(order.payments);
        }
    }, [order?.payments]);

    const binanceRate = Number(order?.binance_rate || 0);

    const copyGeneralInfo = () => {
        if (!order) return;
        const productsList = order.products?.map((p: any) => `• ${p.quantity}x ${p.title}`).join('\n') || 'Sin productos';
        const agencyDisplay = order.agency?.names
            ? (user.role?.description === 'Vendedor' ? 'Asignada a Agencia' : order.agency.names)
            : 'No asignada';

        const totalPaid = order.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
        const total = Number(order.current_total_price) || 0;
        const difference = totalPaid - total;

        let paymentInfo = `💳 *Métodos de Pago:*\n${order.payments && order.payments.length > 0 ? order.payments.map((p: any) => {
            const isVes = ["PAGOMOVIL", "BOLIVARES_EFECTIVO", "TRANSFERENCIA_BANCARIA_BOLIVARES"].includes(p.method);
            if (isVes) {
                const rate = Number(p.rate || order.binance_rate || 0);
                const amountBs = Number(p.amount) * rate;
                return `• ${p.method}: ${fmtMoney(amountBs, 'VES')}`;
            }
            return `• ${p.method}: $${Number(p.amount).toFixed(2)}`;
        }).join('\n') : "Pendiente"}`;

        // Reemplazo completo de líneas 151-195 en OrderDialog.tsx

        // 💵 Vuelto: Mostrar cada parte en su moneda correcta según método
        if (difference > 0.01) {
            const bcvEurRate = Number(order.change_rate || 0);

            // Helper: determinar si un método es en Bolívares
            const isMethodVes = (method: string) =>
                ["PAGOMOVIL", "BOLIVARES_PAGOMOVIL", "BOLIVARES_EFECTIVO", "BOLIVARES_TRANSFERENCIA", "TRANSFERENCIA_BANCARIA_BOLIVARES"].includes(method);

            if (order.change_covered_by === 'partial') {
                // Distribución mixta: cada parte en su moneda
                const companyUSD = Number(order.change_amount_company || 0);
                const agencyUSD = Number(order.change_amount_agency || 0);

                const companyMethod = order.change_method_company || '';
                const agencyMethod = order.change_method_agency || '';

                console.log('🔍 DEBUG VUELTO:', {
                    companyMethod,
                    agencyMethod,
                    companyUSD,
                    agencyUSD,
                    bcvEurRate
                });

                const companyInVes = isMethodVes(companyMethod);
                const agencyInVes = isMethodVes(agencyMethod);

                paymentInfo += `\n💵 *Vuelto a entregar:*`;

                if (companyInVes) {
                    const companyBs = companyUSD * bcvEurRate;
                    paymentInfo += `\n   • Empresa: ${fmtMoney(companyBs, 'VES')}`;
                } else {
                    paymentInfo += `\n   • Empresa: $${companyUSD.toFixed(2)}`;
                }

                if (agencyInVes) {
                    const agencyBs = agencyUSD * bcvEurRate;
                    paymentInfo += `\n   • Agencia: ${fmtMoney(agencyBs, 'VES')}`;
                } else {
                    paymentInfo += `\n   • Agencia: $${agencyUSD.toFixed(2)}`;
                }
            } else if (order.change_covered_by === 'agency') {
                const method = order.change_method_agency || '';
                if (isMethodVes(method)) {
                    const changeInBs = difference * bcvEurRate;
                    paymentInfo += `\n💵 *Vuelto a entregar (Bs):* ${fmtMoney(changeInBs, 'VES')}`;
                    paymentInfo += `\n   • Agencia: ${fmtMoney(changeInBs, 'VES')}`;
                } else {
                    paymentInfo += `\n💵 *Vuelto a entregar (USD):* $${difference.toFixed(2)}`;
                    paymentInfo += `\n   • Agencia: $${difference.toFixed(2)}`;
                }
            } else if (order.change_covered_by === 'company') {
                const method = order.change_method_company || '';
                if (isMethodVes(method)) {
                    const changeInBs = difference * bcvEurRate;
                    paymentInfo += `\n💵 *Vuelto a entregar (Bs):* ${fmtMoney(changeInBs, 'VES')}`;
                    paymentInfo += `\n   • Empresa: ${fmtMoney(changeInBs, 'VES')}`;
                } else {
                    paymentInfo += `\n💵 *Vuelto a entregar (USD):* $${difference.toFixed(2)}`;
                    paymentInfo += `\n   • Empresa: $${difference.toFixed(2)}`;
                }
            }
        }


        const message = `🚀 *ORDEN #${order.name}*\n📍 *Ubicación:* ${order.location || 'No asignada'}\n🏢 *Agencia:* ${agencyDisplay}\n👤 *Cliente:* ${order.client?.first_name} ${order.client?.last_name}\n📞 *Teléfono:* ${order.client?.phone}\n📦 *Productos:*\n${productsList}\n${paymentInfo}`;
        navigator.clipboard.writeText(message);
        toast.info('📋 Información copiada');
    };

    const handleCreateReturn = async () => {
        if (!order) return;
        setCreatingReturn(true);
        try {
            const body = new URLSearchParams();
            body.append('type', confirmType);
            const { status, response } = await request(`/orders/${order.id}/create-return`, 'POST', body);
            const data = await response.json();
            if (status === 200 && data.status) {
                const label = confirmType === 'cambio' ? 'cambio' : 'devolución';
                toast.success(`✅ Orden de ${label} creada: #` + data.order?.name);
                setConfirmReturnOpen(false);
                // Optionally refresh or navigate
            } else {
                toast.error(data.message || 'Error al crear devolución');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setCreatingReturn(false);
        }
    };

    if (!order) return null;

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    return (
        <>
            <Dialog
                fullScreen
                onClose={handleClose}
                open={open}
                TransitionComponent={Zoom}
                PaperProps={{
                    sx: {
                        background: isDark ? darken(user.color, 0.96) : '#f8fafc',
                    }
                }}
            >
                {/* 🏗️ MODER HEADER SUMARIO */}
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        background: isDark ? darken(user.color, 0.85) : user.color,
                        borderBottom: '1px solid',
                        borderColor: 'rgba(255,255,255,0.1)',
                    }}
                >
                    <Toolbar sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'center' },
                        justifyContent: 'space-between',
                        px: { xs: 1.5, sm: 2 },
                        py: { xs: 1.5, sm: 0 },
                        minHeight: { xs: 'auto', sm: 64 },
                        gap: { xs: 1.5, sm: 0 }
                    }}>
                        {/* 1️⃣ BLOQUE INFO (Orden, Tienda, etc) */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', lineHeight: 1 }}>
                                        Orden
                                    </Typography>
                                    <Typography variant="h6" fontWeight="bold" sx={{ color: 'white', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                                        #{order.name}
                                    </Typography>
                                </Box>

                                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 1, display: { xs: 'none', md: 'block' } }} />

                                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                    <Typography variant="caption" color="text.secondary" display="block">Provincia / Ciudad</Typography>
                                    <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
                                        {order.client?.province || 'No esp.'} / {order.client?.city || 'No esp.'}
                                    </Typography>
                                </Box>

                                {['Admin', 'Gerente', 'Master'].includes(user.role?.description || '') && order.shop && (
                                    <>
                                        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 1, display: { xs: 'none', md: 'block' } }} />
                                        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                                            <Typography variant="caption" color="text.secondary" display="block">Tienda</Typography>
                                            <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
                                                {order.shop.name}
                                            </Typography>
                                        </Box>
                                    </>
                                )}
                                {order.received_at && (
                                    <>
                                        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 1, display: { xs: 'none', md: 'block' } }} />
                                        <Box>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', lineHeight: 1 }}>Timer Entrega</Typography>
                                            <Box sx={{ mt: 0.5, bgcolor: 'rgba(255,255,255,0.1)', px: 1, py: 0.2, borderRadius: 1 }}>
                                                <OrderTimer
                                                    receivedAt={order.status?.description === 'Novedades' ? order.updated_at : order.received_at}
                                                    deliveredAt={order.status?.description === 'Entregado' ? (order.processed_at || order.updated_at) : null}
                                                    status={order.status?.description || ''}
                                                />
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Box>

                            {/* ❌ CLOSE BUTTON (MOBILE ONLY - Top Right) */}
                            <IconButton onClick={handleClose} sx={{ color: 'white', display: { xs: 'flex', sm: 'none' }, p: 0.5 }}>
                                <CloseRoundedIcon />
                            </IconButton>
                        </Box>

                        {/* 2️⃣ BLOQUE ACCIONES (Estado + Botones) */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                            {/* ESTADO DEL PEDIDO */}
                            <Box>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: { xs: 'none', sm: 'block' }, lineHeight: 1 }}>
                                    Estado Actual
                                </Typography>
                                <DenseMenu
                                    data={order}
                                    changeStatus={changeStatus}
                                    icon={false}
                                    customComponent={
                                        <Paper elevation={0} sx={{
                                            px: { xs: 1.5, sm: 1.5 }, py: 0.2,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                                            display: 'flex', alignItems: 'center', gap: 1
                                        }}>
                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                                {order.status?.description || 'Desconocido'}
                                            </Typography>
                                            <MoreVertRounded sx={{ fontSize: '1rem', opacity: 0.7 }} />
                                        </Paper>
                                    }
                                />
                            </Box>

                            {/* BOTONES ACCION */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                                <Tooltip title="Copiar resumen">
                                    <IconButton onClick={copyGeneralInfo} sx={{ color: 'white', p: { xs: 1, sm: 1 } }}>
                                        <ContentCopyRounded sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Tasas del día">
                                    <IconButton onClick={() => setOpenRates(true)} sx={{ color: 'white', p: { xs: 1, sm: 1 } }}>
                                        <CurrencyExchange sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Recordatorio">
                                    <IconButton onClick={() => setOpenReminder(true)} sx={{ color: 'white', p: { xs: 1, sm: 1 } }}>
                                        <NotificationAddRounded sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                                    </IconButton>
                                </Tooltip>

                                <Tooltip title="Acciones">
                                    <IconButton onClick={handleMenuOpen} sx={{ color: 'white', p: { xs: 1, sm: 1 }, display: { xs: 'none', sm: 'flex' } }}>
                                        <MoreVertRounded sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                                    </IconButton>
                                </Tooltip>

                                {/* ❌ CLOSE BUTTON (DESKTOP ONLY) */}
                                <IconButton onClick={handleClose} sx={{ ml: 1, color: 'white', display: { xs: 'none', sm: 'flex' } }}>
                                    <CloseRoundedIcon />
                                </IconButton>
                            </Box>
                        </Box>
                    </Toolbar>

                    {/* 📱 TABS NAVIGATION */}
                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center' }}>
                        <Tabs
                            value={activeTab}
                            onChange={(_, v) => setActiveTab(v)}
                            textColor="inherit"
                            indicatorColor="secondary"
                            variant="scrollable"
                            scrollButtons="auto"
                            allowScrollButtonsMobile
                            sx={{
                                '& .MuiTab-root': { py: 1.5, minHeight: 0, color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' },
                                '& .Mui-selected': { color: 'white !important' }
                            }}
                        >
                            <Tab label="Detalle" icon={<ShoppingCartRounded sx={{ fontSize: '1.2rem' }} />} iconPosition="start" />
                            <Tab label="Finanzas" icon={<ReceiptLongRounded sx={{ fontSize: '1.2rem' }} />} iconPosition="start" />
                            <Tab label={
                                <Badge badgeContent={order.updates?.length || 0} color="error" max={99} sx={{ '& .MuiBadge-badge': { right: -10, top: 2 } }}>
                                    Historial
                                </Badge>
                            } icon={<HistoryRounded sx={{ fontSize: '1.2rem' }} />} iconPosition="start" />
                            {['Admin', 'Gerente'].includes(user.role?.description || '') && (
                                <Tab label="Acciones" icon={<RuleRounded sx={{ fontSize: '1.2rem' }} />} iconPosition="start" />
                            )}
                        </Tabs>
                    </Box>
                </AppBar>

                {/* 📋 CONTENT AREA (Massive pb to ensure space for the large absolute comment bar at bottom) */}
                <DialogContent sx={{ p: { xs: 1, sm: 3 }, pb: 45 }}>
                    <Box sx={{ maxWidth: '1200px', margin: 'auto' }}>

                        {/* ⚠️ STOCK WARNING ALERT */}
                        {order.has_stock_warning && (
                            <Paper elevation={0} sx={{
                                p: 2, mb: 3,
                                borderRadius: 3,
                                bgcolor: 'rgba(211, 47, 47, 0.1)',
                                border: '1px solid',
                                borderColor: 'error.main',
                                display: 'flex', gap: 2, alignItems: 'center'
                            }}>
                                <Inventory2OutlinedIcon color="error" />
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" color="error">
                                        Stock Insuficiente
                                    </Typography>
                                    <Typography variant="body2">
                                        Uno o más productos no tienen existencias suficientes en el almacén de la agencia asignada ({user.role?.description === 'Vendedor' ? 'asignada' : (order.agency?.names || 'Principal')}). No se puede marcar como Entregado ni En ruta hasta corregir el stock.
                                    </Typography>
                                </Box>
                            </Paper>
                        )}

                        {(Boolean(order.is_return) || Boolean(order.is_exchange)) && (
                            <Alert severity="warning" variant="outlined" sx={{ mb: 3, borderRadius: 3 }}>
                                <AlertTitle fontWeight="black" sx={{ fontSize: '1.1rem' }}>
                                    {Boolean(order.is_exchange) ? 'ORDEN DE CAMBIO' : 'ORDEN DE DEVOLUCIÓN'}
                                </AlertTitle>
                                Esta es una orden de {Boolean(order.is_exchange) ? 'cambio' : 'devolución'}. El total es $0 y no requiere registro de pagos.
                            </Alert>
                        )}

                        {/* ⚠️ NOVEDADES ALERT */}
                        {order.status?.description === 'Novedades' && (
                            <Alert severity="error" variant="filled" sx={{ mb: 3, borderRadius: 3 }}>
                                <AlertTitle sx={{ fontWeight: 'bold' }}>Novedad Reportada</AlertTitle>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                                    {order.novedad_type}
                                </Typography>
                                <Typography variant="body2">
                                    {order.novedad_description}
                                </Typography>
                            </Alert>
                        )}

                        {order.status?.description === 'Novedad Solucionada' && (
                            <Alert severity="success" variant="filled" sx={{ mb: 3, borderRadius: 3 }}>
                                <AlertTitle sx={{ fontWeight: 'bold' }}>Novedad Solucionada</AlertTitle>
                                <Typography variant="body2" fontWeight="bold">
                                    {order.novedad_resolution || "No se especificó resolución."}
                                </Typography>
                            </Alert>
                        )}

                        {/* ✅ HAS RETURNS CREATED */}
                        {order.return_orders && order.return_orders.length > 0 && (
                            <Alert severity="warning" variant="filled" sx={{ mb: 3, borderRadius: 3 }}>
                                <AlertTitle sx={{ fontWeight: 'bold' }}>📦 Devolución Generada</AlertTitle>
                                <Typography variant="body2">
                                    Se {order.return_orders.length === 1 ? 'ha' : 'han'} creado {order.return_orders.length} {order.return_orders.length === 1 ? 'orden' : 'órdenes'} de devolución desde esta orden: {order.return_orders.map((r: any) => r.name).join(', ')}
                                </Typography>
                            </Alert>
                        )}

                        {/* ⚠️ POSTPONEMENT WARNING */}
                        {order.postponements && order.postponements.length > 0 && (
                            <Paper elevation={0} sx={{
                                p: 2, mb: 3,
                                borderRadius: 3,
                                bgcolor: 'rgba(255, 152, 0, 0.1)',
                                border: '1px solid',
                                borderColor: 'warning.main',
                                display: 'flex', gap: 2, alignItems: 'center'
                            }}>
                                <EventRepeatRounded sx={{ color: 'warning.dark' }} />
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" color="warning.dark">
                                        Esta orden ha sido reprogramada {order.postponements.length} {order.postponements.length === 1 ? 'vez' : 'veces'}
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Puedes ver los detalles y motivos en la pestaña de <b>Historial</b>.
                                    </Typography>
                                </Box>
                            </Paper>
                        )}

                        {activeTab === 0 && (
                            <Grid container spacing={3}>
                                <Grid size={{ xs: 12, md: 7 }}>
                                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>Información de la Orden</Typography>
                                        <OrderHeader
                                            order={order}
                                            user={user}
                                            newLocation={newLocation}
                                            sendLocation={sendLocation}
                                            handleChangeNewLocation={handleChangeNewLocation}
                                            onEditLogistics={() => setOpenLogistics(true)}
                                        />
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, md: 5 }}>
                                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="h6" fontWeight="bold">Productos</Typography>
                                            {user.role?.description !== 'Agencia' && (
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    {(Boolean(order.is_return) || Boolean(order.is_exchange)) ? (
                                                        <ButtonCustom size="small" variant="outlined" onClick={() => { setIsAddingRegular(true); setOpenSearch(true); }}>
                                                            + Agregar
                                                        </ButtonCustom>
                                                    ) : (
                                                        <>
                                                            <ButtonCustom size="small" variant="outlined" color="primary" onClick={() => { setIsAddingRegular(false); setOpenSearch(true); }}>
                                                                + Upsell
                                                            </ButtonCustom>
                                                            {['Admin', 'Gerente', 'Master'].includes(user.role?.description || '') && (
                                                                <ButtonCustom size="small" variant="outlined" color="info" onClick={() => { setIsAddingRegular(true); setOpenSearch(true); }}>
                                                                    + Producto
                                                                </ButtonCustom>
                                                            )}
                                                        </>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>

                                        <Box sx={{ mb: 2 }}>
                                            {/* For return/exchange orders, show products with delete option */}
                                            {(Boolean(order.is_return) || Boolean(order.is_exchange)) ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    {(order.products || []).map((p: any) => (
                                                        <OrderProductItem
                                                            key={p.id}
                                                            product={p}
                                                            currency={order.currency}
                                                            onDelete={() => { if (confirm(`¿Eliminar este producto del ${order.is_exchange ? 'cambio' : 'devolución'}?`)) removeUpsell(p.id); }}
                                                        />
                                                    ))}
                                                </Box>
                                            ) : (
                                                <OrderProductsList
                                                    products={(order.products || []).filter((p: any) => !p.is_upsell)}
                                                    currency={order.currency}
                                                    onDeleteItem={
                                                        user.role?.description === 'Admin'
                                                            ? (id) => { if (confirm("⚠️ ¿Estás seguro de eliminar este producto?\nEsto reducirá el total de la orden.")) removeUpsell(id); }
                                                            : undefined
                                                    }
                                                    onEditQuantity={
                                                        user.role?.description === 'Admin'
                                                            ? (id, qty) => {
                                                                const newQty = prompt("Nueva cantidad:", String(qty));
                                                                if (newQty && !isNaN(Number(newQty))) {
                                                                    updateProductQuantity(id, Number(newQty));
                                                                }
                                                            }
                                                            : undefined
                                                    }
                                                />
                                            )}
                                        </Box>

                                        {!(order.is_return || order.is_exchange) && (order.products || []).filter((p: any) => p.is_upsell).length > 0 && (
                                            <>
                                                <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 1 }}>VENTAS ADICIONALES (UPSELL)</Typography>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    {(order.products || []).filter((p: any) => p.is_upsell).map((p: any) => (
                                                        <OrderProductItem
                                                            key={p.id}
                                                            product={p}
                                                            currency={order.currency}
                                                            onDelete={() => { if (confirm("¿Eliminar este upsell?")) removeUpsell(p.id); }}
                                                        />
                                                    ))}
                                                </Box>
                                            </>
                                        )}

                                        <Box sx={{ mt: 3, p: 2, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 2, textAlign: 'right' }}>
                                            <Typography variant="h5" fontWeight="black" color="primary">
                                                TOTAL: {fmtMoney(Number(order.current_total_price) || 0, order.currency)}
                                            </Typography>
                                            {(Boolean(order.is_return) || Boolean(order.is_exchange)) && (
                                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                                    <Typography variant="h6" color="text.secondary">
                                                        Las órdenes de {Boolean(order.is_exchange) ? 'cambio' : 'devolución'} no requieren registro de pagos.
                                                    </Typography>
                                                </Box>
                                            )}
                                            {order.ves_price !== undefined && user.role?.description !== 'Agencia' && (
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Monto en Bs: {fmtMoney(order.ves_price, 'VES')}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>
                        )}

                        {activeTab === 1 && (
                            <>
                                {/* Hide payment sections for return orders */}
                                {Boolean(order.is_return) ? (
                                    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', textAlign: 'center' }}>
                                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                            🔄 Orden de Devolución
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Las órdenes de devolución no requieren pagos ni generan comisiones.<br />
                                            El cliente no paga - Total: <strong>$0.00</strong>
                                        </Typography>
                                    </Paper>
                                ) : (
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', mb: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                                <OrderPaymentSection
                                                    order={order}
                                                    onPaymentsChange={setStagedPayments}
                                                    onUpdate={refreshOrder}
                                                />
                                            </Paper>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 6 }}>
                                            <OrderChangeSection
                                                order={order}
                                                onUpdate={refreshOrder}
                                                payments={stagedPayments}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }}>
                                            <OrderCompanyAccounts />
                                        </Grid>
                                    </Grid>
                                )}
                            </>
                        )}

                        {activeTab === 2 && (
                            <Box sx={{ maxWidth: '800px', margin: 'auto' }}>
                                <OrderUpdatesList updates={order.updates} />
                            </Box>
                        )}

                        {activeTab === 3 && (
                            <Box sx={{ maxWidth: '1000px', margin: 'auto' }}>
                                <OrderActivityList orderId={order.id} />
                            </Box>
                        )}

                        {/* 🛡️ SAFE AREA SPACER: Guarantees that content can always be scrolled above the fixed comment input */}
                        <Box sx={{ height: { xs: 200, sm: 300 }, width: '100%' }} />
                    </Box>
                </DialogContent>

                {/* 🏗️ FIXED COMMENT INPUT */}
                <DialogActions sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    p: 0,
                    bgcolor: isDark ? darken(user.color, 0.94) : '#ffffff',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    zIndex: 1000,
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
                }}>
                    <OrderUpdateInput orderId={order.id} />
                </DialogActions>

                {/* 🛡️ MENU DE ACCIONES SECUNDARIAS */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    elevation={4}
                    slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 200, mt: 1 } } }}
                >
                    {['Admin', 'Gerente'].includes(user.role?.description || '') && (
                        <>
                            <MenuItem onClick={() => { handleMenuClose(); setOpenLogistics(true); }}>
                                <ListItemIcon><LocalShippingRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Gestión Logística</ListItemText>
                            </MenuItem>
                            <Divider />
                            <MenuItem onClick={() => { handleMenuClose(); setOpenAssign(true); }}>
                                <ListItemIcon><AssignmentIndRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Reasignar Vendedor</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => { handleMenuClose(); setOpenAssignAgency(true); }}>
                                <ListItemIcon><ApartmentRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Asignar Agencia</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => { handleMenuClose(); setOpenAssignDeliverer(true); }}>
                                <ListItemIcon><LocalShippingRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Asignar Repartidor</ListItemText>
                            </MenuItem>
                        </>
                    )}

                    <MenuItem onClick={() => { handleMenuClose(); setOpenPostpone(true); }}>
                        <ListItemIcon><EventRepeatRounded fontSize="small" /></ListItemIcon>
                        <ListItemText>Postponer Orden</ListItemText>
                    </MenuItem>

                    {!(order.is_return || order.is_exchange) && order.status?.description === 'Entregado' && (
                        <>
                            <MenuItem onClick={() => { handleMenuClose(); setConfirmType('devolucion'); setConfirmReturnOpen(true); }}>
                                <ListItemIcon><ReplayRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Generar Devolución</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={() => { handleMenuClose(); setConfirmType('cambio'); setConfirmReturnOpen(true); }}>
                                <ListItemIcon><EventRepeatRounded fontSize="small" /></ListItemIcon>
                                <ListItemText>Generar Cambio</ListItemText>
                            </MenuItem>
                        </>
                    )}

                    {['Admin', 'Gerente'].includes(user.role?.description || '') && (
                        <>
                            <Divider />
                            <MenuItem onClick={() => { handleMenuClose(); setOpenCancel(true); }} sx={{ color: 'error.main' }}>
                                <ListItemIcon><DeleteSweepRounded fontSize="small" color="error" /></ListItemIcon>
                                <ListItemText>Eliminar Orden</ListItemText>
                            </MenuItem>
                        </>
                    )}
                </Menu>

                {/* 🛠️ OTROS DIALOGS (MANTENIENDO LÓGICA) */}
                <ReminderDialog open={openReminder} onClose={() => setOpenReminder(false)} onSave={setReminder} />
                <ReviewCancellationDialog open={openApprove} onClose={() => setOpenApprove(false)} title="Aprobar cancelación" confirmText="Aprobar" onConfirm={approveCancellation} loading={loadingReview} />
                <ReviewCancellationDialog open={openReject} onClose={() => setOpenReject(false)} title="Rechazar cancelación" confirmText="Rechazar" onConfirm={rejectCancellation} loading={loadingReview} />
                <ReviewDeliveryDialog open={openApproveDelivery} onClose={() => setOpenApproveDelivery(false)} title="Aprobar Entrega" confirmText="Aprobar Entrega" onConfirm={approveDelivery} loading={loadingReview} />
                <ReviewDeliveryDialog open={openRejectDelivery} onClose={() => setOpenRejectDelivery(false)} title="Rechazar Entrega" confirmText="Rechazar" onConfirm={rejectDelivery} loading={loadingReview} />
                <ReviewDeliveryDialog open={openApproveLocation} onClose={() => setOpenApproveLocation(false)} title="Aprobar Cambio de Ubicación" confirmText="Aprobar" onConfirm={approveLocation} loading={loadingReview} />
                <ReviewDeliveryDialog open={openRejectLocation} onClose={() => setOpenRejectLocation(false)} title="Rechazar Cambio de Ubicación" confirmText="Rechazar" onConfirm={rejectLocation} loading={loadingReview} />
                <ReviewDeliveryDialog open={openApproveRejection} onClose={() => setOpenApproveRejection(false)} title="Aprobar Rechazo" confirmText="Confirmar Rechazo" onConfirm={approveRejection} loading={loadingReview} />
                <ReviewDeliveryDialog open={openRejectRejection} onClose={() => setOpenRejectRejection(false)} title="Denegar Solicitud de Rechazo" confirmText="Denegar (Mantener Orden)" onConfirm={rejectRejection} loading={loadingReview} />
                <CancelOrderDialog open={openCancel} onClose={() => setOpenCancel(false)} orderId={id} onCancelled={(cancellation: any) => { updateOrder({ ...order, cancellations: [...(order.cancellations ?? []), cancellation], status: { description: "Pendiente Cancelación" } }); }} />
                <PostponeOrderDialog open={openPostpone} onClose={() => setOpenPostpone(false)} orderId={id} targetStatus={targetStatus} extraData={pendingExtraData} />
                <MarkDeliveredDialog open={openMarkDelivered} onClose={() => setOpenMarkDelivered(false)} order={order} binanceRate={binanceRate} onConfirm={(data) => { if (pendingStatus) changeStatus(pendingStatus.description, data); }} />
                <ReportNovedadDialog open={openReportNovedad} onClose={() => setOpenReportNovedad(false)} onConfirm={(data) => { if (pendingStatus) changeStatus(pendingStatus.description, { novedad_type: data.type, novedad_description: data.description }); }} />
                <ResolveNovedadDialog open={openResolveNovedad} onClose={() => setOpenResolveNovedad(false)} onConfirm={(resolution) => { if (pendingStatus) changeStatus(pendingStatus.description, { novedad_resolution: resolution }); }} />
                <AssignAgentDialog open={openAssign} onClose={() => setOpenAssign(false)} orderId={order.id} />
                <AssignAgencyDialog open={openAssignAgency} onClose={() => setOpenAssignAgency(false)} orderId={order.id} />
                <AssignDelivererDialog open={openAssignDeliverer} onClose={() => setOpenAssignDeliverer(false)} orderId={order.id} />
                <LogisticsDialog open={openLogistics} onClose={() => setOpenLogistics(false)} order={order} />
                <DailyRatesDialog open={openRates} onClose={() => setOpenRates(false)} />

                {/* CONFIRM RETURN/EXCHANGE DIALOG */}
                <Dialog open={confirmReturnOpen} onClose={() => setConfirmReturnOpen(false)}>
                    <DialogTitle>Generar Orden de {confirmType === 'cambio' ? 'Cambio' : 'Devolución'}</DialogTitle>
                    <DialogContent>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Esto creará una nueva orden marcada como <strong>{confirmType === 'cambio' ? 'CAMBIO' : 'DEVOLUCIÓN'}</strong> basada en la orden #{order.name}.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            • El cliente no paga (Total: $0)<br />
                            • Se asignará automáticamente a la agencia de la ciudad<br />
                            • Los productos se copiarán de la orden original<br />
                            • No generará comisión para la vendedora
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmReturnOpen(false)} disabled={creatingReturn}>Cancelar</Button>
                        <ButtonCustom onClick={handleCreateReturn} disabled={creatingReturn}>
                            {creatingReturn ? 'Creando...' : (confirmType === 'cambio' ? 'Crear Cambio' : 'Crear Devolución')}
                        </ButtonCustom>
                    </DialogActions>
                </Dialog>
                <ProductSearchDialog open={openSearch} onClose={() => setOpenSearch(false)} onPick={(product) => { setUpsellCandidate(product); setUpsellPrice(Number(product.price)); setUpsellQty(1); setOpenSearch(false); setShowUpsellConfirm(true); }} />
                <Dialog open={showUpsellConfirm} onClose={() => setShowUpsellConfirm(false)}>
                    <DialogTitle>{isAddingRegular ? 'Confirmar Agregar Producto' : 'Confirmar Upsell'}</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 300 }}>
                        <Typography variant="subtitle1" fontWeight="bold">{upsellCandidate?.name || upsellCandidate?.title}</Typography>
                        <TextField label="Cantidad" type="number" value={upsellQty} onChange={(e) => setUpsellQty(Number(e.target.value))} fullWidth />
                        <TextField label="Precio de Venta (c/u)" type="number" value={upsellPrice} onChange={(e) => setUpsellPrice(Number(e.target.value))} helperText="Puedes modificar el precio para dar un descuento" fullWidth />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowUpsellConfirm(false)}>Cancelar</Button>
                        <ButtonCustom onClick={() => { addUpsell(upsellCandidate.id, upsellQty, upsellPrice, !isAddingRegular); setShowUpsellConfirm(false); }}>Agregar</ButtonCustom>
                    </DialogActions>
                </Dialog>
            </Dialog >
        </>
    );
};
