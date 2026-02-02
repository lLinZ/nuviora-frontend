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
    Chip
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
import MessageRoundedIcon from '@mui/icons-material/MessageRounded';
import { ButtonCustom } from "../../components/custom";
import { ProductSearchDialog } from "../../components/products/ProductsSearchDialog";
import { fmtMoney } from "../../lib/money";
import DenseMenu from "../../components/ui/content/DenseMenu";
import {
    ExpandMoreRounded,
    ExpandLessRounded,
    AddShoppingCartRounded,
    WhatsApp
} from "@mui/icons-material";

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
}

export const LiteOrderDialog: FC<LiteOrderDialogProps> = ({ id, open, setOpen }) => {
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
        refreshOrder
    } = useOrderDialogLogic(id, open, setOpen);

    // Local state for Upsells and other dialogs managed locally
    const [openReminder, setOpenReminder] = useState(false);
    const [openSearch, setOpenSearch] = useState(false);
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

    useEffect(() => {
        if (order?.payments) {
            setStagedPayments(order.payments);
        }
    }, [order?.payments]);

    if (!order) return null;
    const binanceRate = Number(order?.binance_rate || 0);

    return (
        <Dialog
            fullScreen
            onClose={handleClose}
            open={open}
            PaperProps={{
                sx: {
                    bgcolor: 'background.default',
                }
            }}
        >
            {/* 1. LITE HEADER */}
            {/* 1. LITE HEADER */}
            <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={handleClose} edge="start">
                            <CloseRoundedIcon />
                        </IconButton>
                        <Box>
                            <Typography sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', md: '1.25rem' }, lineHeight: 1.1 }}>
                                Orden #{order.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {order.client?.first_name} {order.client?.last_name}
                            </Typography>
                        </Box>
                        {order.client?.phone && (
                            <IconButton
                                color="success"
                                size="small"
                                sx={{ bgcolor: '#e8f5e9' }}
                                onClick={() => window.open(`https://wa.me/${order.client?.phone}`, '_blank')}
                            >
                                <WhatsApp />
                            </IconButton>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                                <OrderProductsList products={(order.products || []).filter((p: any) => !p.is_upsell)} currency={order.currency} />

                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                    <Button
                                        size="small"
                                        onClick={() => setOpenSearch(true)}
                                    >
                                        Agregar Producto (Upsell)
                                    </Button>
                                </Box>

                                {/* Upsells render */}
                                {(order.products || []).filter((p: any) => p.is_upsell).length > 0 && (
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
                        {/* Pagos */}
                        {/* Pagos */}
                        <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3 }}>
                            <Box
                                onClick={() => setShowPayments(!showPayments)}
                                sx={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', mb: 1 }}
                            >
                                <Typography variant="subtitle1" fontWeight="bold">Pagos Registrados</Typography>
                                {showPayments ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                            </Box>
                            <Collapse in={showPayments}>
                                <LiteOrderPaymentSection
                                    order={order}
                                    onPaymentsChange={setStagedPayments}
                                    onUpdate={refreshOrder}
                                />
                            </Collapse>
                        </Paper>

                        {/* Vueltos (Ya optimizado para lite) */}
                        <LiteOrderChangeSection
                            order={order}
                            onUpdate={refreshOrder}
                            payments={stagedPayments}
                        />

                        {/* Cuentas Bancarias (Referencia rápida) */}
                        <Box sx={{ mt: 2 }}>
                            <OrderCompanyAccounts />
                        </Box>

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

        </Dialog>
    );
};
