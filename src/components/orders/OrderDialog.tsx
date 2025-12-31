import { AppBar, Box, Dialog, DialogActions, Divider, IconButton, Toolbar, Typography, useTheme, DialogContent, DialogTitle, TextField, Button } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useState } from "react";
import { darken, lighten } from "@mui/material/styles";

import { useOrderDialogLogic } from "../../hooks/useOrderDialogLogic";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { PostponeOrderDialog } from "./PostponeOrderDialog";
import { ReviewCancellationDialog } from "./ReviewCancellationDialog";
import { ReviewDeliveryDialog } from "./ReviewDeliveryDialog";
import { ReminderDialog } from "./ReminderDialog";
import { AssignDelivererDialog } from "./AssignDelivererDialog";
import { AssignAgentDialog } from "./AssignAgentDialog";
import { OrderPaymentSection } from "./OrderPaymentSection";
import { OrderUpdatesList } from "./OrderUpdatesList";
import { OrderUpdateInput } from "./OrderUpdateInput";
import { OrderProductsList } from "./OrderProductsList";
import { OrderHeader } from "./OrderHeader";
import { fmtMoney } from "../../lib/money";
import { ButtonCustom } from "../custom";
import { ProductSearchDialog } from "../products/ProductsSearchDialog";
import { OrderProductItem } from "./OrderProductItem";
import { NotificationAdd, NotificationAddRounded } from "@mui/icons-material";

interface OrderDialogProps {
    id?: number;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const OrderDialog: FC<OrderDialogProps> = ({ id, open, setOpen }) => {
    const theme = useTheme();
    const {
        selectedOrder: order,
        user,
        openCancel, setOpenCancel,
        openPostpone, setOpenPostpone,
        openApprove, setOpenApprove,
        openReject, setOpenReject,
        loadingReview,
        openAssignDeliverer, setOpenAssignDeliverer,
        openAssign, setOpenAssign,
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
        setReminder
    } = useOrderDialogLogic(id, open, setOpen);

    const [openReminder, setOpenReminder] = useState(false);

    const [openSearch, setOpenSearch] = useState(false);
    const [showUpsellConfirm, setShowUpsellConfirm] = useState(false);
    const [upsellCandidate, setUpsellCandidate] = useState<any>(null);
    const [upsellQty, setUpsellQty] = useState(1);
    const [upsellPrice, setUpsellPrice] = useState(0);

    if (!order) return null;

    return (
        <>
            <Dialog fullScreen onClose={handleClose} open={open} PaperProps={{
                sx: {
                    background: theme.palette.mode === "dark"
                        ? darken(user.color, 0.9)
                        : lighten(user.color, 0.97),
                }
            }}>
                <AppBar
                    sx={{
                        background:
                            theme.palette.mode === "dark"
                                ? darken(user.color, 0.8)
                                : user.color,
                        p: 2,
                    }}
                    elevation={0}
                >
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: { xs: "100%", md: "80%" },
                            margin: "auto",
                        }}
                    >
                        <Typography variant="h6">Detalle de la orden</Typography>
                        {/* Botón de Recordatorio - Vendedora y Admin */}
                        {(user.role?.description === "Vendedor" || user.role?.description === "Admin") && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                <IconButton onClick={() => setOpenReminder(true)}>
                                    <NotificationAddRounded />
                                </IconButton>
                            </Box>
                        )}
                        <ReminderDialog
                            open={openReminder}
                            onClose={() => setOpenReminder(false)}
                            onSave={setReminder}
                        />
                        <IconButton onClick={handleClose}>
                            <CloseRoundedIcon
                                sx={{ color: theme.palette.getContrastText(user.color) }}
                            />
                        </IconButton>
                    </Box>
                </AppBar>

                <Toolbar />

                <Box
                    sx={{
                        width: { xs: '100%', md: '80%' },
                        margin: 'auto',
                        p: 2,
                        background:
                            theme.palette.mode === "dark"
                                ? darken(user.color, 0.9)
                                : lighten(user.color, 0.97),
                    }}
                >
                    <Box sx={{ display: 'flex', flexFlow: 'row wrap', justifyContent: 'space-evenly', alignItems: 'center' }}>

                        <OrderHeader
                            order={order}
                            user={user}
                            changeStatus={changeStatus}
                            newLocation={newLocation}
                            sendLocation={sendLocation}
                            handleChangeNewLocation={handleChangeNewLocation}
                        />

                        {/* Sección de método de pago */}
                        <OrderPaymentSection order={order} />
                    </Box>


                    {order.reminder_at && (
                        <Typography sx={{ textAlign: 'center', mt: 1, color: 'info.main' }}>
                            🔔 Recordatorio: {new Date(order.reminder_at).toLocaleString()}
                        </Typography>
                    )}

                    <Divider sx={{ marginBlock: 3 }} />



                    <ReviewCancellationDialog
                        open={openApprove}
                        onClose={() => setOpenApprove(false)}
                        title="Aprobar cancelación"
                        confirmText="Aprobar"
                        onConfirm={approveCancellation}
                        loading={loadingReview}
                    />

                    <ReviewCancellationDialog
                        open={openReject}
                        onClose={() => setOpenReject(false)}
                        title="Rechazar cancelación"
                        confirmText="Rechazar"
                        onConfirm={rejectCancellation}
                        loading={loadingReview}
                    />

                    {/* Alerta de Aprobación de Cambio de Ubicación */}
                    {(user.role?.description === "Gerente" || user.role?.description === "Admin") &&
                        order.status.description === "Por aprobar cambio de ubicacion" && (
                            <Box
                                sx={{
                                    width: "100%",
                                    p: 2,
                                    mb: 2,
                                    backgroundColor: "warning.light",
                                    color: "warning.contrastText",
                                    borderRadius: 1,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Typography fontWeight="bold">
                                    🚨 Esta orden espera aprobación de cambio de ubicación.
                                </Typography>
                                <Box>
                                    <Button
                                        color="error"
                                        variant="contained"
                                        onClick={() => setOpenRejectLocation(true)}
                                        sx={{ mr: 1 }}
                                    >
                                        Rechazar
                                    </Button>
                                    <Button
                                        color="success"
                                        variant="contained"
                                        onClick={() => setOpenApproveLocation(true)}
                                    >
                                        Aprobar
                                    </Button>
                                </Box>
                            </Box>
                        )}

                    {/* Alerta de Aprobación de Rechazo */}
                    {(user.role?.description === "Gerente" || user.role?.description === "Admin") &&
                        order.status.description === "Por aprobar rechazo" && (
                            <Box
                                sx={{
                                    width: "100%",
                                    p: 2,
                                    mb: 2,
                                    backgroundColor: "error.light",
                                    color: "error.contrastText",
                                    borderRadius: 1,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Typography fontWeight="bold">
                                    🚨 Esta orden espera aprobación de rechazo.
                                </Typography>
                                <Box>
                                    <Button
                                        color="inherit"
                                        variant="outlined"
                                        onClick={() => setOpenRejectRejection(true)}
                                        sx={{ mr: 1, borderColor: 'white', color: 'white' }}
                                    >
                                        Denegar
                                    </Button>
                                    <Button
                                        color="inherit"
                                        variant="contained"
                                        sx={{ bgcolor: 'white', color: 'error.main', '&:hover': { bgcolor: 'grey.100' } }}
                                        onClick={() => setOpenApproveRejection(true)}
                                    >
                                        Aprobar Rechazo
                                    </Button>
                                </Box>
                            </Box>
                        )}

                    {/* Alerta de Aprobación de Entrega (Opcional, si aún se usa o si la quitamos) */}
                    {(user.role?.description === "Gerente" || user.role?.description === "Admin") &&
                        order.status.description === "Por aprobar entrega" && (
                            <Box
                                sx={{
                                    width: "100%",
                                    p: 2,
                                    mb: 2,
                                    backgroundColor: "warning.light",
                                    color: "warning.contrastText",
                                    borderRadius: 1,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Typography fontWeight="bold">
                                    🚨 Esta orden espera aprobación de entrega.
                                </Typography>
                                <Box>
                                    <Button
                                        color="error"
                                        variant="contained"
                                        onClick={() => setOpenRejectDelivery(true)}
                                        sx={{ mr: 1 }}
                                    >
                                        Rechazar
                                    </Button>
                                    <Button
                                        color="success"
                                        variant="contained"
                                        onClick={() => setOpenApproveDelivery(true)}
                                    >
                                        Aprobar
                                    </Button>
                                </Box>
                            </Box>
                        )}

                    <ReviewDeliveryDialog
                        open={openApproveDelivery}
                        onClose={() => setOpenApproveDelivery(false)}
                        title="Aprobar Entrega"
                        confirmText="Aprobar Entrega"
                        onConfirm={approveDelivery}
                        loading={loadingReview}
                    />

                    <ReviewDeliveryDialog
                        open={openRejectDelivery}
                        onClose={() => setOpenRejectDelivery(false)}
                        title="Rechazar Entrega"
                        confirmText="Rechazar"
                        onConfirm={rejectDelivery}
                        loading={loadingReview}
                    />

                    <ReviewDeliveryDialog
                        open={openApproveLocation}
                        onClose={() => setOpenApproveLocation(false)}
                        title="Aprobar Cambio de Ubicación"
                        confirmText="Aprobar"
                        onConfirm={approveLocation}
                        loading={loadingReview}
                    />

                    <ReviewDeliveryDialog
                        open={openRejectLocation}
                        onClose={() => setOpenRejectLocation(false)}
                        title="Rechazar Cambio de Ubicación"
                        confirmText="Rechazar"
                        onConfirm={rejectLocation}
                        loading={loadingReview}
                    />

                    <ReviewDeliveryDialog
                        open={openApproveRejection}
                        onClose={() => setOpenApproveRejection(false)}
                        title="Aprobar Rechazo"
                        confirmText="Confirmar Rechazo"
                        onConfirm={approveRejection}
                        loading={loadingReview}
                    />

                    <ReviewDeliveryDialog
                        open={openRejectRejection}
                        onClose={() => setOpenRejectRejection(false)}
                        title="Denegar Solicitud de Rechazo"
                        confirmText="Denegar (Mantener Orden)"
                        onConfirm={rejectRejection}
                        loading={loadingReview}
                    />

                    <CancelOrderDialog
                        open={openCancel}
                        onClose={() => setOpenCancel(false)}
                        orderId={id}
                        onCancelled={(cancellation: any) => {
                            updateOrder({
                                ...order,
                                cancellations: [...(order.cancellations ?? []), cancellation],
                                status: { description: "Pendiente Cancelación" },
                            });
                        }}
                    />
                    <PostponeOrderDialog
                        open={openPostpone}
                        onClose={() => setOpenPostpone(false)}
                        orderId={id}
                    />

                    {/* Productos */}
                    <Divider sx={{ marginBlock: 3 }} />
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Productos de la orden
                    </Typography>
                    <OrderProductsList products={(order.products || []).filter((p: any) => !p.is_upsell)} currency={order.currency} />

                    {/* Sección Upsell */}
                    <Divider sx={{ marginBlock: 3 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Ventas Adicionales (Upsell)</Typography>
                        <ButtonCustom variant="contained" onClick={() => setOpenSearch(true)}>Agregar Upsell</ButtonCustom>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {(order.products || []).filter((p: any) => p.is_upsell).length > 0 ? (
                            (order.products || []).filter((p: any) => p.is_upsell).map((p: any) => (
                                <OrderProductItem
                                    key={p.id}
                                    product={p}
                                    currency={order.currency}
                                    onDelete={() => {
                                        if (confirm("¿Eliminar este upsell?")) removeUpsell(p.id);
                                    }}
                                />
                            ))
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No hay ventas adicionales.
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ marginBlock: 2 }} />
                    <Typography variant="h6" textAlign="right">
                        Total: {fmtMoney(Number(order.current_total_price) || 0, order.currency)}
                    </Typography>
                    <Divider sx={{ my: 3 }} />

                    {/* Dialogs para Upsell */}
                    <ProductSearchDialog
                        open={openSearch}
                        onClose={() => setOpenSearch(false)}
                        onPick={(product) => {
                            setUpsellCandidate(product);
                            setUpsellPrice(Number(product.price));
                            setUpsellQty(1);
                            setOpenSearch(false);
                            setShowUpsellConfirm(true);
                        }}
                    />

                    <Dialog open={showUpsellConfirm} onClose={() => setShowUpsellConfirm(false)}>
                        <DialogTitle>Confirmar Upsell</DialogTitle>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 300 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {upsellCandidate?.name || upsellCandidate?.title}
                            </Typography>
                            <TextField
                                label="Cantidad"
                                type="number"
                                value={upsellQty}
                                onChange={(e) => setUpsellQty(Number(e.target.value))}
                                fullWidth
                            />
                            <TextField
                                label="Precio de Venta (c/u)"
                                type="number"
                                value={upsellPrice}
                                onChange={(e) => setUpsellPrice(Number(e.target.value))}
                                helperText="Puedes modificar el precio para dar un descuento"
                                fullWidth
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setShowUpsellConfirm(false)}>Cancelar</Button>
                            <ButtonCustom onClick={() => {
                                addUpsell(upsellCandidate.id, upsellQty, upsellPrice);
                                setShowUpsellConfirm(false);
                            }}>Agregar</ButtonCustom>
                        </DialogActions>
                    </Dialog>


                    {/* Actualizaciones */}
                    <Divider sx={{ marginBlock: 5 }} />

                    <OrderUpdatesList updates={order.updates} />

                    <AssignAgentDialog
                        open={openAssign}
                        onClose={() => setOpenAssign(false)}
                        orderId={order.id}
                    />
                    <AssignDelivererDialog
                        open={openAssignDeliverer}
                        onClose={() => setOpenAssignDeliverer(false)}
                        orderId={order.id}
                    />
                    <Divider sx={{ mt: 20 }} />
                    <Toolbar />
                    <Toolbar />
                </Box>
                <DialogActions sx={{ position: 'fixed', bottom: 0, left: 0, width: '100%', p: 0 }}>
                    <OrderUpdateInput orderId={order.id} />
                </DialogActions>
            </Dialog >
        </>
    );
};
