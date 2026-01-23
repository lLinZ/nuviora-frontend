import { AppBar, Box, Dialog, DialogActions, Divider, IconButton, Toolbar, Typography, useTheme, DialogContent, Tab, Tabs, Grid, Paper, Tooltip, Zoom, Fab, Menu, MenuItem, ListItemIcon, ListItemText, DialogTitle, TextField, Button } from "@mui/material";
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
import { OrderUpdatesList } from "./OrderUpdatesList";
import { OrderUpdateInput } from "./OrderUpdateInput";
import { OrderProductsList } from "./OrderProductsList";
import { OrderHeader } from "./OrderHeader";
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
    CheckCircleRounded
} from "@mui/icons-material";
import { MarkDeliveredDialog } from "./MarkDeliveredDialog";
import { ReportNovedadDialog } from "./ReportNovedadDialog";
import { ResolveNovedadDialog } from "./ResolveNovedadDialog";
import { LogisticsDialog } from "./LogisticsDialog";
import DenseMenu from "../ui/content/DenseMenu";
import { toast } from "react-toastify";

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
        refreshOrder
    } = useOrderDialogLogic(id, open, setOpen);

    const [openReminder, setOpenReminder] = useState(false);
    const [openSearch, setOpenSearch] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [openAssignAgency, setOpenAssignAgency] = useState(false);
    const [openAssignDeliverer, setOpenAssignDeliverer] = useState(false);
    const [openLogistics, setOpenLogistics] = useState(false);
    const [showUpsellConfirm, setShowUpsellConfirm] = useState(false);
    const [upsellCandidate, setUpsellCandidate] = useState<any>(null);
    const [upsellQty, setUpsellQty] = useState(1);
    const [upsellPrice, setUpsellPrice] = useState(0);
    const [stagedPayments, setStagedPayments] = useState<any[]>([]);

    useEffect(() => {
        if (order?.payments) {
            setStagedPayments(order.payments);
        }
    }, [order?.payments]);

    const binanceRate = Number(order?.binance_rate || 0);

    const copyGeneralInfo = () => {
        if (!order) return;
        const productsList = order.products?.map((p: any) => `• ${p.quantity}x ${p.title}`).join('\n') || 'Sin productos';
        const message = `🚀 *ORDEN #${order.name}*\n📍 *Ubicación:* ${order.location || 'No asignada'}\n👤 *Cliente:* ${order.client?.first_name} ${order.client?.last_name}\n📞 *Teléfono:* ${order.client?.phone}\n📦 *Productos:*\n${productsList}\n💳 *Métodos de Pago:*\n${order.payments && order.payments.length > 0 ? order.payments.map((p: any) => `• ${p.method}: $${Number(p.amount).toFixed(2)}`).join('\n') : "Pendiente"}\n💰 *Total:* ${fmtMoney(Number(order.current_total_price), order.currency)}`;
        navigator.clipboard.writeText(message);
        toast.info('📋 Información copiada');
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
                    <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', lineHeight: 1 }}>
                                    Orden
                                </Typography>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                                    #{order.name}
                                </Typography>
                            </Box>

                            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 1 }} />

                            <Box>
                                <Typography variant="caption" color="text.secondary" display="block">Provincia / Ciudad</Typography>
                                <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
                                    {order.client?.province || 'No esp.'} / {order.client?.city || 'No esp.'}
                                </Typography>
                            </Box>

                            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 1 }} />

                            <Box>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', lineHeight: 1 }}>
                                    Estado Actual
                                </Typography>
                                <DenseMenu
                                    data={order}
                                    changeStatus={changeStatus}
                                    icon={false}
                                    customComponent={
                                        <Paper elevation={0} sx={{
                                            px: 1.5, py: 0.2,
                                            borderRadius: 2,
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                                        }}>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                {order.status.description}
                                            </Typography>
                                        </Paper>
                                    }
                                />
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Copiar resumen">
                                <IconButton onClick={copyGeneralInfo} sx={{ color: 'white' }}>
                                    <ContentCopyRounded />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Recordatorio">
                                <IconButton onClick={() => setOpenReminder(true)} sx={{ color: 'white' }}>
                                    <NotificationAddRounded />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Acciones">
                                <IconButton onClick={handleMenuOpen} sx={{ color: 'white' }}>
                                    <MoreVertRounded />
                                </IconButton>
                            </Tooltip>

                            <IconButton onClick={handleClose} sx={{ ml: 1, color: 'white' }}>
                                <CloseRoundedIcon />
                            </IconButton>
                        </Box>
                    </Toolbar>

                    {/* 📱 TABS NAVIGATION */}
                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center' }}>
                        <Tabs
                            value={activeTab}
                            onChange={(_, v) => setActiveTab(v)}
                            textColor="inherit"
                            indicatorColor="secondary"
                            centered
                            sx={{
                                '& .MuiTab-root': { py: 1.5, minHeight: 0, color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' },
                                '& .Mui-selected': { color: 'white !important' }
                            }}
                        >
                            <Tab label="Detalle" icon={<ShoppingCartRounded sx={{ fontSize: '1.2rem' }} />} iconPosition="start" />
                            <Tab label="Finanzas" icon={<ReceiptLongRounded sx={{ fontSize: '1.2rem' }} />} iconPosition="start" />
                            <Tab label="Historial" icon={<HistoryRounded sx={{ fontSize: '1.2rem' }} />} iconPosition="start" />
                        </Tabs>
                    </Box>
                </AppBar>

                {/* 📋 CONTENT AREA */}
                <DialogContent sx={{ p: { xs: 1, sm: 3 }, pb: 15 }}>
                    <Box sx={{ maxWidth: '1200px', margin: 'auto' }}>

                        {/* ⚠️ NOVEDADES ALERT */}
                        {(order.status.description === "Novedades" || order.novedad_type) && (
                            <Paper elevation={0} sx={{
                                p: 2, mb: 3,
                                borderRadius: 3,
                                bgcolor: order.status.description === 'Novedad Solucionada' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                                border: '1px solid',
                                borderColor: order.status.description === 'Novedad Solucionada' ? 'success.main' : 'warning.main',
                                display: 'flex', gap: 2, alignItems: 'center'
                            }}>
                                {order.status.description === 'Novedad Solucionada' ? (
                                    <CheckCircleRounded color="success" />
                                ) : (
                                    <WarningAmberRounded color="warning" />
                                )}
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        {order.status.description === 'Novedad Solucionada' ? `Novedad Resuelta: ${order.novedad_type}` : `Novedad: ${order.novedad_type}`}
                                    </Typography>
                                    <Typography variant="body2">{order.novedad_description}</Typography>
                                    {order.status.description === 'Novedad Solucionada' && order.novedad_resolution && (
                                        <Typography variant="body2" sx={{ mt: 1, p: 1, bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                                            <strong>Solución:</strong> {order.novedad_resolution}
                                        </Typography>
                                    )}
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
                                            <ButtonCustom size="small" variant="outlined" onClick={() => setOpenSearch(true)}>+ Upsell</ButtonCustom>
                                        </Box>

                                        <Box sx={{ mb: 2 }}>
                                            <OrderProductsList products={(order.products || []).filter((p: any) => !p.is_upsell)} currency={order.currency} />
                                        </Box>

                                        {(order.products || []).filter((p: any) => p.is_upsell).length > 0 && (
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
                            </Grid>
                        )}

                        {activeTab === 2 && (
                            <Box sx={{ maxWidth: '800px', margin: 'auto' }}>
                                <OrderUpdatesList updates={order.updates} />
                            </Box>
                        )}
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
                <PostponeOrderDialog open={openPostpone} onClose={() => setOpenPostpone(false)} orderId={id} />
                <MarkDeliveredDialog open={openMarkDelivered} onClose={() => setOpenMarkDelivered(false)} totalUSD={Number(order.current_total_price)} binanceRate={binanceRate} isCash={order.payments?.some((p: any) => p.method === 'EFECTIVO')} onConfirm={(data) => { if (pendingStatus) changeStatus(pendingStatus.description, pendingStatus.id, data); }} />
                <ReportNovedadDialog open={openReportNovedad} onClose={() => setOpenReportNovedad(false)} onConfirm={(data) => { if (pendingStatus) changeStatus(pendingStatus.description, pendingStatus.id, { novedad_type: data.type, novedad_description: data.description }); }} />
                <ResolveNovedadDialog open={openResolveNovedad} onClose={() => setOpenResolveNovedad(false)} onConfirm={(resolution) => { if (pendingStatus) changeStatus(pendingStatus.description, pendingStatus.id, { novedad_resolution: resolution }); }} />
                <AssignAgentDialog open={openAssign} onClose={() => setOpenAssign(false)} orderId={order.id} />
                <AssignAgencyDialog open={openAssignAgency} onClose={() => setOpenAssignAgency(false)} orderId={order.id} />
                <AssignDelivererDialog open={openAssignDeliverer} onClose={() => setOpenAssignDeliverer(false)} orderId={order.id} />
                <LogisticsDialog open={openLogistics} onClose={() => setOpenLogistics(false)} order={order} />
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
            </Dialog >
        </>
    );
};
