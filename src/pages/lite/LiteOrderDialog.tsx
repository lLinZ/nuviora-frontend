import React, { FC, useState, useEffect } from "react";
import {
    Dialog,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    useTheme,
    darken,
    DialogContent,
    Grid,
    Paper,
    Button,
    Divider,
    DialogActions,
    Collapse,
    DialogTitle,
    TextField,
    Chip,
    Alert,
    AlertTitle
} from "@mui/material";
import { statusColors } from "../../components/orders/OrderItem";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useOrderDialogLogic } from "../../hooks/useOrderDialogLogic";
import { LiteOrderHeader } from "./LiteOrderHeader";
import { LiteOrderPaymentSection } from "./LiteOrderPaymentSection";
import { LiteOrderChangeSection } from "./LiteOrderChangeSection";
import { OrderCompanyAccounts } from "../../components/orders/OrderCompanyAccounts";
import { OrderProductsList } from "../../components/orders/OrderProductsList";
import { OrderUpdateInput } from "../../components/orders/OrderUpdateInput"; // Chat input
import { OrderUpdatesList } from "../../components/orders/OrderUpdatesList";
import { OrderProductItem } from "../../components/orders/OrderProductItem";
import { OrderTimer } from "../../components/orders/OrderTimer";
import MessageRoundedIcon from '@mui/icons-material/MessageRounded';
import { ButtonCustom } from "../../components/custom";
import { ProductSearchDialog } from "../../components/products/ProductsSearchDialog";
import { fmtMoney } from "../../lib/money";
import DenseMenu from "../../components/ui/content/DenseMenu";
import {
    ExpandMoreRounded,
    ExpandLessRounded,
    AddShoppingCartRounded,
    WhatsApp,
    ReplayRounded,
    CurrencyExchange,
    EventRepeatRounded,
    ScheduleRounded
} from "@mui/icons-material";
import { request } from "../../common/request";
import { toast } from "react-toastify";
import { DailyRatesDialog } from "../../components/orders/DailyRatesDialog";

// Import other mandatory dialogs for logic to work
import { CancelOrderDialog } from "../../components/orders/CancelOrderDialog";
import { PostponeOrderDialog } from "../../components/orders/PostponeOrderDialog";
import { ReviewCancellationDialog } from "../../components/orders/ReviewCancellationDialog";
import { ReviewDeliveryDialog } from "../../components/orders/ReviewDeliveryDialog";
import { ReminderDialog } from "../../components/orders/ReminderDialog";
import { AssignDelivererDialog } from "../../components/orders/AssignDelivererDialog";
import { AssignAgentDialog } from "../../components/orders/AssignAgentDialog";
import { AssignAgencyDialog } from "../../components/orders/AssignAgencyDialog";
import { MarkDeliveredDialog } from "../../components/orders/MarkDeliveredDialog";
import { ReportNovedadDialog } from "../../components/orders/ReportNovedadDialog";
import { ResolveNovedadDialog } from "../../components/orders/ResolveNovedadDialog";
import { LogisticsDialog } from "../../components/orders/LogisticsDialog";

interface LiteOrderDialogProps {
    id?: number;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onClose?: () => void;
}

export const LiteOrderDialog: FC<LiteOrderDialogProps> = ({ id, open, setOpen, onClose }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    // Expand/Collapse sections state
    const [showPayments, setShowPayments] = useState(true);
    const [showProducts, setShowProducts] = useState(true);

    const {
        selectedOrder: order,
        user,
        openCancel, setOpenCancel,
        openPostpone, setOpenPostpone,
        openApprove, setOpenApprove,
        openReject, setOpenReject,
        loadingReview,
        newLocation,
        handleClose: internalHandleClose,
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
        refreshOrder,
        updateProductQuantity,
        updateOrderTotal,
    } = useOrderDialogLogic(id, open, setOpen);

    const handleCloseWrapper = () => {
        if (internalHandleClose) internalHandleClose();
        if (onClose) onClose();
    };

    // Local state for Upsells and other dialogs managed locally
    const [openReminder, setOpenReminder] = useState(false);
    const [openSearch, setOpenSearch] = useState(false);
    const [openRates, setOpenRates] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [openAssignAgency, setOpenAssignAgency] = useState(false);
    const [openAssignDeliverer, setOpenAssignDeliverer] = useState(false);
    const [openLogistics, setOpenLogistics] = useState(false);

    // Upsell Logic Local State
    const [showUpsellConfirm, setShowUpsellConfirm] = useState(false);
    const [upsellCandidate, setUpsellCandidate] = useState<any>(null);
    const [upsellQty, setUpsellQty] = useState(1);
    const [upsellPrice, setUpsellPrice] = useState(0);

    const [showUpdates, setShowUpdates] = useState(false);

    const [stagedPayments, setStagedPayments] = useState<any[]>([]);
    const [confirmReturnOpen, setConfirmReturnOpen] = useState(false);
    const [confirmType, setConfirmType] = useState<'devolucion' | 'cambio'>('devolucion');
    const [creatingReturn, setCreatingReturn] = useState(false);

    useEffect(() => {
        if (order?.payments) {
            setStagedPayments(order.payments);
        }
    }, [order?.payments]);

    if (!order) return null;
    const binanceRate = Number(order?.binance_rate || 0);

    const handleCreateReturn = async () => {
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
            } else {
                toast.error(data.message || `Error al crear ${confirmType}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setCreatingReturn(false);
        }
    };

    return (
        <Dialog
            fullScreen
            onClose={handleCloseWrapper}
            open={open}
            PaperProps={{
                sx: {
                    bgcolor: 'background.default',
                }
            }}
        >
            {/* 1. LITE HEADER */}
            <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={handleCloseWrapper} edge="start">
                            <CloseRoundedIcon />
                        </IconButton>
                        <Box>
                            <Typography sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', md: '1.25rem' }, lineHeight: 1.1 }}>
                                Orden #{order.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {order.client?.first_name} {order.client?.last_name}
                            </Typography>
                            {order.received_at && (
                                <Box sx={{ mt: 0.5 }}>
                                    <OrderTimer
                                        receivedAt={order.status?.description === 'Novedades' ? order.updated_at : order.received_at}
                                        deliveredAt={order.status?.description === 'Entregado' ? (order.processed_at || order.updated_at) : null}
                                        status={order.status?.description || ''}
                                    />
                                </Box>
                            )}
                        </Box>

                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {/* RATES BUTTON */}
                        <IconButton
                            onClick={() => setOpenRates(true)}
                            color="success"
                            size="small"
                            sx={{ bgcolor: 'rgba(76, 175, 80, 0.1)' }}
                        >
                            <CurrencyExchange fontSize="small" />
                        </IconButton>

                        {/* GENERATE RETURN/EXCHANGE BUTTONS - Only for delivered orders */}
                        {!(order.is_return || order.is_exchange) && order.status?.description === 'Entregado' && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ReplayRounded />}
                                    onClick={() => { setConfirmType('devolucion'); setConfirmReturnOpen(true); }}
                                    sx={{ borderRadius: 3, textTransform: 'none', display: { xs: 'none', sm: 'inline-flex' } }}
                                >
                                    Devolución
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<EventRepeatRounded />}
                                    onClick={() => { setConfirmType('cambio'); setConfirmReturnOpen(true); }}
                                    sx={{ borderRadius: 3, textTransform: 'none', display: { xs: 'none', sm: 'inline-flex' } }}
                                >
                                    Cambio
                                </Button>
                            </Box>
                        )}

                        {/* THE BIG STATUS BUTTON */}
                        <DenseMenu
                            data={order}
                            changeStatus={changeStatus}
                            icon={false}
                            customComponent={
                                <Chip
                                    label={order.status?.description}
                                    clickable
                                    size="small"
                                    sx={{
                                        bgcolor: statusColors[order.status?.description] || 'grey.300',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.75rem',
                                        height: 24,
                                        maxWidth: { xs: 120, sm: 'none' }
                                    }}
                                />
                            }
                        />
                    </Box>
                </Toolbar>
            </AppBar>

            {/* 2. CONTENT - Single Column / Simple Grid */}
            <DialogContent sx={{ p: { xs: 1, md: 3 }, pb: 15 }}>
                {(Boolean(order.is_return) || Boolean(order.is_exchange)) && (
                    <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: 2, maxWidth: '1000px', margin: '0 auto 16px auto' }}>
                        <AlertTitle fontWeight="black">
                            {Boolean(order.is_exchange) ? 'ORDEN DE CAMBIO' : 'ORDEN DE DEVOLUCIÓN'}
                        </AlertTitle>
                        Esta es una orden de {Boolean(order.is_exchange) ? 'cambio' : 'devolución'}. El total es $0 y no requiere registro de pagos.
                    </Alert>
                )}

                {order.scheduled_for && ['Programado para mas tarde', 'Reprogramado para hoy', 'Programado para otro dia', 'Reprogramado'].includes(order.status?.description) && (
                    <Alert severity="info" variant="filled" icon={<ScheduleRounded />} sx={{ mb: 2, borderRadius: 2, maxWidth: '1000px', margin: '0 auto 16px auto', bgcolor: '#fbc02d', color: '#000' }}>
                        <AlertTitle sx={{ fontWeight: 'bold' }}>📅 Entrega Programada</AlertTitle>
                        Esta orden está programada para el: <strong>
                            {new Date(order.scheduled_for).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </strong>
                    </Alert>
                )}

                {order.status?.description === 'Novedades' && (
                    <Alert severity="error" variant="filled" sx={{ mb: 2, borderRadius: 2, maxWidth: '1000px', margin: '0 auto 16px auto' }}>
                        <AlertTitle>Novedad Reportada</AlertTitle>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {order.novedad_type}
                        </Typography>
                        <Typography variant="body2">
                            {order.novedad_description}
                        </Typography>
                    </Alert>
                )}

                {/* 🔄 RETURN ORDER INDICATOR */}
                {Boolean(order.is_return) && order.parent_order && (
                    <Alert severity="info" variant="filled" sx={{ mb: 2, borderRadius: 2, maxWidth: '1000px', margin: '0 auto 16px auto' }}>
                        <AlertTitle sx={{ fontWeight: 'bold' }}>🔄 Orden de Devolución</AlertTitle>
                        <Typography variant="body2">
                            Esta es una orden de devolución creada desde la orden <strong>{order.parent_order.name}</strong>
                        </Typography>
                    </Alert>
                )}

                {/* ✅ HAS RETURNS CREATED */}
                {order.return_orders && order.return_orders.length > 0 && (
                    <Alert severity="warning" variant="filled" sx={{ mb: 2, borderRadius: 2, maxWidth: '1000px', margin: '0 auto 16px auto' }}>
                        <AlertTitle sx={{ fontWeight: 'bold' }}>📦 Devolución Generada</AlertTitle>
                        <Typography variant="body2">
                            Se {order.return_orders.length === 1 ? 'ha' : 'han'} creado {order.return_orders.length} {order.return_orders.length === 1 ? 'orden' : 'órdenes'} de devolución: {order.return_orders.map((r: any) => r.name).join(', ')}
                        </Typography>
                    </Alert>
                )}

                {/* 🔁 ORDEN ATENDIDA ANTERIORMENTE */}
                {order.reset_count > 0 && (
                    <Alert
                        severity="warning"
                        variant="outlined"
                        icon={<ReplayRounded />}
                        sx={{ mb: 2, borderRadius: 2, maxWidth: '1000px', margin: '0 auto 16px auto', borderColor: '#e65100', color: '#e65100', '& .MuiAlert-icon': { color: '#e65100' } }}
                    >
                        <AlertTitle sx={{ fontWeight: 'bold', color: '#e65100' }}>
                            Atendida en día{order.reset_count > 1 ? 's' : ''} anterior{order.reset_count > 1 ? 'es' : ''} ({order.reset_count}x)
                        </AlertTitle>
                        <Typography variant="body2">
                            Esta orden no fue concretada en {order.reset_count} {order.reset_count === 1 ? 'día anterior' : 'días anteriores'}. Si la tienda cierra sin concretarla, será <strong>cancelada automáticamente</strong>.
                        </Typography>
                    </Alert>
                )}
                <Grid container spacing={2} sx={{ maxWidth: '1000px', margin: 'auto' }}>

                    {/* LEFT: PRODUCTS & INFO */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        {/* Address & Logistics Simplificado */}
                        {/* Address & Logistics Simplificado */}
                        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                            <LiteOrderHeader
                                order={order}
                                user={user}
                                newLocation={newLocation}
                                sendLocation={sendLocation}
                                handleChangeNewLocation={handleChangeNewLocation}
                                onEditLogistics={() => setOpenLogistics(true)}
                            />
                        </Paper>

                        {/* Productos (Collapsible) */}
                        {/* Productos (Collapsible) */}
                        <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
                            <Box
                                onClick={() => setShowProducts(!showProducts)}
                                sx={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', mb: 1 }}
                            >
                                <Typography variant="subtitle1" fontWeight="bold">Productos ({order.products?.length})</Typography>
                                {showProducts ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                            </Box>

                            <Collapse in={showProducts}>
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
                                        onEditQuantity={
                                            user.role?.description === 'Vendedor'
                                                ? (id, qty, currentPrice) => {
                                                    // 🔥 CLIENT REQUEST: Vendedoras pueden editar cantidad y precio en Lite
                                                    const newQty = prompt("Nueva cantidad:", String(qty));
                                                    if (newQty && !isNaN(Number(newQty)) && Number(newQty) > 0) {
                                                        const newPrice = prompt(`Nuevo precio unitario (actual: $${currentPrice}):`, String(currentPrice));
                                                        if (newPrice && !isNaN(Number(newPrice)) && Number(newPrice) >= 0) {
                                                            updateProductQuantity(id, Number(newQty), Number(newPrice));
                                                        } else if (newPrice === null) {
                                                            // Usuario canceló
                                                        } else {
                                                            // Solo actualizar cantidad
                                                            updateProductQuantity(id, Number(newQty));
                                                        }
                                                    }
                                                }
                                                : undefined
                                        }
                                    />
                                )}

                                {/* 🔥 CLIENT REQUEST: Advertencia si se bloquearon upsells */}
                                {order.has_modified_original_products && user.role?.description === 'Vendedor' && (
                                    <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                                        <AlertTitle fontWeight="bold">⚠️ Upsells Bloqueados</AlertTitle>
                                        Has modificado productos originales. No puedes agregar upsells. Contacta al administrador.
                                    </Alert>
                                )}

                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                    {user.role?.description !== 'Agencia' && (
                                        <Button
                                            size="small"
                                            onClick={() => setOpenSearch(true)}
                                        >
                                            {(Boolean(order.is_return) || Boolean(order.is_exchange)) ? 'Agregar Producto' : 'Agregar Producto (Upsell)'}
                                        </Button>
                                    )}
                                </Box>

                                {/* Upsells render - hide for return/exchange orders since all products are deletable */}
                                {!(order.is_return || order.is_exchange) && (order.products || []).filter((p: any) => p.is_upsell).length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="caption" fontWeight="bold" color="text.secondary">ADICIONALES</Typography>
                                        {(order.products || []).filter((p: any) => p.is_upsell).map((p: any) => (
                                            <OrderProductItem
                                                key={p.id}
                                                product={p}
                                                currency={order.currency}
                                                onDelete={() => { if (confirm("¿Eliminar este upsell?")) removeUpsell(p.id); }}
                                            />
                                        ))}
                                    </Box>
                                )}

                                <Divider sx={{ my: 2 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6" fontWeight="bold">TOTAL</Typography>
                                    <Typography variant="h5" fontWeight="black" color="primary">
                                        {fmtMoney(Number(order.current_total_price) || 0, order.currency)}
                                    </Typography>
                                </Box>
                                {order.ves_price !== undefined && (
                                    <Typography variant="body2" color="text.secondary" align="right">
                                        Bs: {fmtMoney(order.ves_price, 'VES')}
                                    </Typography>
                                )}
                            </Collapse>
                        </Paper>
                    </Grid>

                    {/* RIGHT: PAGOS & VUELTOS (The Meat) */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        {/* Hide payment sections for return/exchange orders */}
                        {(Boolean(order.is_return) || Boolean(order.is_exchange)) ? (
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                                    {Boolean(order.is_exchange) ? '🔄 Orden de Cambio' : '🔄 Orden de Devolución'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Las órdenes de {Boolean(order.is_exchange) ? 'cambio' : 'devolución'} no requieren registro de pagos.<br />
                                    El cliente no paga - Total: <strong>$0.00</strong>
                                </Typography>
                            </Paper>
                        ) : (
                            <>
                                {/* Pagos */}
                                <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                                    <LiteOrderPaymentSection
                                        order={order}
                                        onPaymentsChange={setStagedPayments}
                                        onUpdate={refreshOrder}
                                    />
                                </Paper>

                                {/* Vueltos */}
                                <LiteOrderChangeSection
                                    order={order}
                                    onUpdate={refreshOrder}
                                    payments={stagedPayments}
                                />

                                {/* Cuentas Bancarias */}
                                <Box sx={{ mt: 2 }}>
                                    <OrderCompanyAccounts />
                                </Box>
                            </>
                        )}

                        {/* Historial / Notas */}
                        <Paper elevation={0} sx={{ p: 2, mt: 2, borderRadius: 3 }}>
                            <Box
                                onClick={() => setShowUpdates(!showUpdates)}
                                sx={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', mb: 1 }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <MessageRoundedIcon fontSize="small" color="action" />
                                    <Typography variant="subtitle1" fontWeight="bold">Notas y Actividad</Typography>
                                </Box>
                                {showUpdates ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                            </Box>
                            <Collapse in={showUpdates}>
                                <OrderUpdatesList updates={order.updates || []} />
                            </Collapse>
                        </Paper>

                        {/* Spacer for fixed chat footer */}
                        <Box sx={{ height: 150 }} />
                    </Grid>
                </Grid>
            </DialogContent>

            {/* 3. FIXED FOOTER CHAT */}
            <DialogActions sx={{
                position: 'fixed', bottom: 0, left: 0, width: '100%',
                bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', p: 0, zIndex: 10
            }}>
                <OrderUpdateInput orderId={order.id} />
            </DialogActions>


            {/* 4. NECESSARY DIALOGS - Hidden Logic */}
            {/* We must include these for the logic hooks to work properly */}
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
            <PostponeOrderDialog open={openPostpone} onClose={() => setOpenPostpone(false)} orderId={id} targetStatus={targetStatus} />
            <MarkDeliveredDialog open={openMarkDelivered} onClose={() => setOpenMarkDelivered(false)} order={order} binanceRate={binanceRate} onConfirm={(data) => { if (pendingStatus) changeStatus(pendingStatus.description, data); }} />
            <ReportNovedadDialog open={openReportNovedad} onClose={() => setOpenReportNovedad(false)} onConfirm={(data) => { if (pendingStatus) changeStatus(pendingStatus.description, { novedad_type: data.type, novedad_description: data.description }); }} />
            <ResolveNovedadDialog open={openResolveNovedad} onClose={() => setOpenResolveNovedad(false)} onConfirm={(resolution) => { if (pendingStatus) changeStatus(pendingStatus.description, { novedad_resolution: resolution }); }} />
            <AssignAgentDialog open={openAssign} onClose={() => setOpenAssign(false)} orderId={order.id} />
            <AssignAgencyDialog open={openAssignAgency} onClose={() => setOpenAssignAgency(false)} orderId={order.id} />
            <AssignDelivererDialog open={openAssignDeliverer} onClose={() => setOpenAssignDeliverer(false)} orderId={order.id} />
            <LogisticsDialog open={openLogistics} onClose={() => setOpenLogistics(false)} order={order} />
            <DailyRatesDialog open={openRates} onClose={() => setOpenRates(false)} />

            {/* Upsell Dialog */}
            <ProductSearchDialog open={openSearch} onClose={() => setOpenSearch(false)} onPick={(product) => { setUpsellCandidate(product); setUpsellPrice(Number(product.price)); setUpsellQty(1); setOpenSearch(false); setShowUpsellConfirm(true); }} />
            <Dialog open={showUpsellConfirm} onClose={() => setShowUpsellConfirm(false)}>
                <DialogTitle>Confirmar Upsell</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 300 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{upsellCandidate?.name || upsellCandidate?.title}</Typography>
                    <TextField label="Cantidad" type="number" value={upsellQty} onChange={(e) => setUpsellQty(Number(e.target.value))} fullWidth />
                    <TextField label="Precio de Venta (c/u)" type="number" value={upsellPrice} onChange={(e) => setUpsellPrice(Number(e.target.value))} helperText="Puedes modificar el precio para dar un descuento" fullWidth />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowUpsellConfirm(false)}>Cancelar</Button>
                    <ButtonCustom onClick={() => { addUpsell(upsellCandidate.id, upsellQty, upsellPrice); setShowUpsellConfirm(false); }}>Agregar</ButtonCustom>
                </DialogActions>
            </Dialog>

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

        </Dialog >
    );
};
