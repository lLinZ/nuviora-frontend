import { AppBar, Box, Dialog, DialogActions, Divider, IconButton, Toolbar, Typography, useTheme } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC } from "react";
import { darken, lighten } from "@mui/material/styles";

import { useOrderDialogLogic } from "../../hooks/useOrderDialogLogic";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { PostponeOrderDialog } from "./PostponeOrderDialog";
import { ReviewCancellationDialog } from "./ReviewCancellationDialog";
import { AssignDelivererDialog } from "./AssignDelivererDialog";
import { AssignAgentDialog } from "./AssignAgentDialog";
import { OrderPaymentSection } from "./OrderPaymentSection";
import { OrderUpdatesList } from "./OrderUpdatesList";
import { OrderUpdateInput } from "./OrderUpdateInput";
import { OrderProductsList } from "./OrderProductsList";
import { OrderHeader } from "./OrderHeader";
import { fmtMoney } from "../../lib/money";

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
        updateOrder
    } = useOrderDialogLogic(id, open, setOpen);

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
                    <OrderProductsList products={order.products} currency={order.currency} />

                    <Divider sx={{ marginBlock: 2 }} />
                    <Typography variant="h6" textAlign="right">
                        Total: {fmtMoney(Number(order.current_total_price) || 0, order.currency)}
                    </Typography>
                    <Divider sx={{ my: 3 }} />


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
