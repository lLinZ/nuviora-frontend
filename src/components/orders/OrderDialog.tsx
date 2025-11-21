import { AppBar, Avatar, Box, Chip, CircularProgress, Dialog, Divider, IconButton, MenuItem, Toolbar, Typography, useTheme } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import React, { ChangeEvent, FC, useEffect, useState } from "react";
import { darken, lighten } from "@mui/material/styles";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { useUserStore } from "../../store/user/UserStore";
import { ButtonCustom, TypographyCustom, TextFieldCustom } from "../custom";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { toast } from "react-toastify";
import { PostponeOrderDialog } from "./PostponeOrderDialog";
import { ReviewCancellationDialog } from "./ReviewCancellationDialog";
import { fmtMoney } from "../../lib/money";
import DenseMenu from "../ui/content/DenseMenu";
import { AssignDelivererDialog } from "./AssignDelivererDialog";
import { AssignAgentDialog } from "./AssignAgentDialog";
import { CheckRounded } from "@mui/icons-material";
import PaymentMethodsSelector, { PaymentMethod } from "./payment_method/PaymentMethod";

interface OrderDialogProps {
    id?: number;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const OrderDialog: FC<OrderDialogProps> = ({ id, open, setOpen }) => {
    const { selectedOrder, setSelectedOrder, updateOrder } = useOrdersStore();
    const [openCancel, setOpenCancel] = useState(false);
    const [newUpdate, setNewUpdate] = useState<string>("");
    const [openPostpone, setOpenPostpone] = useState(false);
    const user = useUserStore((state) => state.user);
    const theme = useTheme();
    const role = useUserStore(s => s.user?.role?.description);

    const [openApprove, setOpenApprove] = useState(false);
    const [openReject, setOpenReject] = useState(false);
    const [loadingReview, setLoadingReview] = useState(false);

    const isManager = role === "Gerente" || role === "Admin";
    const paymentOptions = [
        { value: "DOLARES_EFECTIVO", label: "Dólares efectivo" },
        { value: "BOLIVARES_TRANSFERENCIA", label: "Bolívares transferencia" },
        { value: "BINANCE_DOLARES", label: "Binance dólares" },
        { value: "ZELLE_DOLARES", label: "Zelle dólares" },
    ];
    const [openAssignDeliverer, setOpenAssignDeliverer] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);

    const [paymentMethod, setPaymentMethod] = useState<string>("");
    const [paymentRate, setPaymentRate] = useState<string>("");
    const [savingPayment, setSavingPayment] = useState(false);
    const [newLocation, setNewLocation] = useState<string>(selectedOrder?.location || '');
    const [showButton, setShowButton] = useState<boolean>(false);
    const handleClose = () => setOpen(false);


    // 🔹 Cargar orden seleccionada cuando cambia el id
    useEffect(() => {
        if (id && open) {
            const fetchOrder = async () => {
                const { status, response }: IResponse = await request(`/orders/${id}`, "GET");
                if (status) {
                    const data = await response.json();
                    setSelectedOrder(data.order);
                    setPaymentMethod(data.order.payment_method ?? "");
                    setPaymentRate(data.order.payment_rate ? String(data.order.payment_rate) : "");
                }
            };
            fetchOrder();
        }
    }, [id, open]);
    const sendLocation = async () => {
        if (!newLocation) return;
        const body = new URLSearchParams();
        body.append('location', String(newLocation));
        console.log(`/orders/${id}/location`)
        try {
            const { status, response }: IResponse = await request(
                `/orders/${id}/location`,
                "PUT",
                body
            );
            if (status === 200) {
                const data = await response.json();
                updateOrder(data);          // actualiza global
                // setSelectedOrder(data);     // y el seleccionado
                toast.success('Ubicacion actualizada');
            } else {
                console.log({ response })
                toast.error('No se logro añadir la ubicacion')
            }
        } catch (e) {
            toast.error('No se logro conectar con el servidor')
            console.log({ e })
        }
    }
    const handleSavePayment = async () => {
        if (!id) return;
        if (!paymentMethod) {
            toast.error("Selecciona un método de pago");
            return;
        }

        const body = new URLSearchParams();
        body.append("payment_method", paymentMethod);
        if (paymentMethod === "BOLIVARES_TRANSFERENCIA") {
            if (!paymentRate || Number(paymentRate) <= 0) {
                toast.error("Debes indicar una tasa válida para pagos en bolívares");
                return;
            }
            body.append("payment_rate", paymentRate);
        }

        try {
            setSavingPayment(true);
            const { status, response }: IResponse = await request(
                `/orders/${id}/payment`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);          // actualiza global
                setSelectedOrder(data.order);     // y el seleccionado
                toast.success("Método de pago actualizado ✅");
            } else {
                toast.error("No se pudo actualizar el método de pago ❌");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error en el servidor al actualizar pago 🚨");
        } finally {
            setSavingPayment(false);
        }
    };
    // 🔹 Crear actualización
    const handleSendUpdate = async () => {
        if (!newUpdate.trim() || !id) return;

        const body = new URLSearchParams();
        body.append("message", newUpdate);

        try {
            const { status, response }: IResponse = await request(
                `/orders/${id}/updates`,
                "POST",
                body
            );

            if (status) {
                const data = await response.json();
                updateOrder({
                    ...selectedOrder,
                    updates: [...(selectedOrder?.updates ?? []), data.update],
                });
                setNewUpdate("");
                toast.success("Actualización agregada correctamente ✅");
            } else {
                toast.error("No se pudo guardar la actualización ❌");
            }
        } catch (err) {
            console.error("Error al enviar actualización", err);
            toast.error("Error en el servidor al guardar la actualización ⚠️");
        }
    };

    if (!selectedOrder) return null; // mientras carga

    const order = selectedOrder; // alias por legibilidad
    const isPendingCancel = order.status?.description === "Pendiente Cancelación";
    const approveCancellation = async (note: string) => {
        setLoadingReview(true);
        try {
            // toma la más reciente pendiente (o del back tendrás un id concreto en la orden)
            const pending = (order.cancellations ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/cancellations/${pending.id}/approve`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order); // status → Cancelado
                toast.success("Cancelación aprobada ✅");
                setOpenApprove(false);
            } else {
                toast.error("No se pudo aprobar ❌");
            }
        } catch {
            toast.error("Error al aprobar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };
    const changeStatus = async (status: string, statusId: number) => {
        // 👇 Si quieren "Asignado a repartidor" pero aún no hay repartidor, primero elegimos uno
        if (status === "Asignado a repartidor" && !order.deliverer) {
            setOpenAssignDeliverer(true);
            return;
        }

        // caso normal: actualizar status
        const body = new URLSearchParams();
        body.append("status_id", String(statusId));
        try {
            const { status: ok, response }: IResponse = await request(
                `/orders/${order.id}/status`,
                "PUT",
                body
            );
            if (ok) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success(`Orden #${order.name} actualizada a ${status} ✅`);
            } else {
                toast.error("No se pudo actualizar el estado ❌");
            }
        } catch {
            toast.error("Error en el servidor al actualizar estado 🚨");
        }
    };
    const rejectCancellation = async (note: string) => {
        setLoadingReview(true);
        try {
            const pending = (order.cancellations ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/cancellations/${pending.id}/reject`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order); // status vuelve al anterior
                toast.success("Cancelación rechazada ❎");
                setOpenReject(false);
            } else {
                toast.error("No se pudo rechazar ❌");
            }
        } catch {
            toast.error("Error al rechazar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };
    const handleSavePayments = (payments: PaymentMethod[]) => {
        console.log("Métodos de pago seleccionados:", payments);
        // Ejemplo de resultado:
        // [
        //   { method: 'BOLIVARES_TRANSFERENCIA', amount: 20 },
        //   { method: 'DOLARES_EFECTIVO', amount: 10 },
        // ]
    };
    const handleChangeNewLocation = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setNewLocation(newValue);
    }
    return (
        <Dialog fullScreen onClose={handleClose} open={open}>
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
                        width: "100%",
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
                    p: 4,
                    background:
                        theme.palette.mode === "dark"
                            ? darken(user.color, 0.9)
                            : lighten(user.color, 0.97),
                }}
            >
                <Box sx={{ display: 'flex', flexFlow: 'row wrap', justifyContent: 'space-evenly', alignItems: 'center' }}>
                    {/* Encabezado */}
                    <Box sx={{ paddingBlock: 4, display: 'flex', flexFlow: 'column wrap', justifyContent: 'center', alignItems: 'center' }}>
                        {order.products?.length > 0 ? (<Avatar
                            src={order.products[0].image || undefined}
                            alt={order.products[0].title}
                            variant="rounded"
                            sx={{ width: 150, height: 150, mb: 2, borderRadius: '50%' }}
                        >
                            {!order.products[0].image && (order.products[0].title?.charAt(0) ?? "P")}
                        </Avatar>) : (
                            <Avatar
                                variant="rounded"
                                sx={{ width: 150, height: 150, mb: 2, borderRadius: '50%' }}
                            >
                                <CircularProgress />
                            </Avatar>
                        )}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TypographyCustom variant="h5">Orden {order.name}</TypographyCustom>
                            <DenseMenu data={order} changeStatus={changeStatus} icon={false} customComponent={<Chip sx={{ cursor: 'pointer', background: user.color, color: (theme) => theme.palette.getContrastText(user.color) }} label={`Status ${order.status.description}`} />} />
                        </Box>
                        <TypographyCustom>
                            Cliente: {order.client.first_name} {order.client.last_name}
                        </TypographyCustom>
                        <TypographyCustom
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                                maxWidth: "200px",   // 🔹 ajusta el ancho máximo permitido
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {order.client.phone}
                        </TypographyCustom>
                        <TypographyCustom
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{
                                maxWidth: "200px",   // 🔹 ajusta el ancho máximo permitido
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {order.client.province}
                        </TypographyCustom>
                        <TypographyCustom>
                            Total: {order.current_total_price} {order.currency}
                        </TypographyCustom>
                        {order.agent && <TypographyCustom>Vendedor: {order.agent.names}</TypographyCustom>}
                        {order.deliverer && <TypographyCustom>Repartidor: {order.deliverer.names}</TypographyCustom>}
                        {user.role?.description === 'Repartidor' ? (
                            (<TypographyCustom>Ubicacion: {order.location ?? 'No hay ubicacion asignada aun'}</TypographyCustom>)
                        ) : <Box sx={{ display: 'flex', flexFlow: 'row nowrap', gap: 1, justifyContent: 'space-evenly', alignItems: 'center' }}>
                            <TextFieldCustom onBlur={sendLocation} onChange={handleChangeNewLocation} value={newLocation} label="Ubicacion" />
                        </Box>}
                    </Box>

                    {/* Sección de método de pago */}
                    <Box sx={{ display: "grid", gap: 2, maxWidth: 400, mb: 3 }}>
                        <PaymentMethodsSelector
                            onSave={handleSavePayments}
                            initialValue={[
                                { method: "DOLARES_EFECTIVO", amount: 20 },
                            ]}
                        />
                    </Box>
                </Box>

                <Divider sx={{ marginBlock: 3 }} />

                {/* Botón posponer */}
                {/* <Box sx={{ display: 'flex', paddingBlock: 4, gap: 2 }}>

                    <ButtonCustom variant="outlined" onClick={() => setOpenPostpone(true)}>
                        Posponer
                    </ButtonCustom>
                    <ButtonCustom
                        variant="contained"
                        color="error"
                        onClick={() => setOpenCancel(true)}
                    >
                        Cancelar orden
                    </ButtonCustom>
                </Box> */}
                {/* {isManager && isPendingCancel && (
                    <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-end", mt: 2 }}>
                        <ButtonCustom variant="outlined" color="error" onClick={() => setOpenReject(true)}>
                            Rechazar cancelación
                        </ButtonCustom>
                        <ButtonCustom variant="contained" color="primary" onClick={() => setOpenApprove(true)}>
                            Aprobar cancelación
                        </ButtonCustom>
                    </Box>
                )} */}

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
                        // actualizamos estado global con el cambio de status
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {order.products?.length > 0 ? (
                        order.products.map((p: any) => {
                            const subtotal = (Number(p.price) || 0) * (Number(p.quantity) || 0);
                            return (
                                <Box
                                    key={p.id}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        p: 2,
                                        borderRadius: 2,
                                        border: "1px solid rgba(0,0,0,0.08)",
                                        bgcolor: "background.paper",
                                    }}
                                >
                                    <Avatar
                                        src={p.image || undefined}
                                        alt={p.title}
                                        variant="rounded"
                                        sx={{ width: 56, height: 56 }}
                                    >
                                        {!p.image && (p.title?.charAt(0) ?? "P")}
                                    </Avatar>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <TypographyCustom
                                            variant="subtitle1"
                                            sx={{
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                            title={p.title}
                                        >
                                            {p.title}
                                        </TypographyCustom>

                                        <Typography variant="caption" color="text.secondary">
                                            {p.sku ? `SKU: ${p.sku}` : "SKU no disponible"}
                                        </Typography>

                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            Cantidad: <strong>{p.quantity}</strong> × Precio:{" "}
                                            <strong>{fmtMoney(Number(p.price), order.currency)}</strong>
                                        </Typography>
                                    </Box>

                                    <TypographyCustom variant="body2" fontWeight="bold">
                                        {fmtMoney(subtotal, order.currency)}
                                    </TypographyCustom>
                                </Box>
                            );
                        })
                    ) : (
                        <TypographyCustom variant="body2" color="text.secondary">
                            No hay productos en esta orden.
                        </TypographyCustom>
                    )}
                </Box>

                <Divider sx={{ marginBlock: 2 }} />
                <Typography variant="h6" textAlign="right">
                    Total: {fmtMoney(Number(order.current_total_price) || 0, order.currency)}
                </Typography>
                <Divider sx={{ my: 3 }} />


                {/* Actualizaciones */}
                <Divider sx={{ marginBlock: 5 }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <TextFieldCustom
                            label="Dejar una actualización..."
                            value={newUpdate}
                            onChange={(e: any) => setNewUpdate(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendUpdate();
                                }
                            }}
                        />
                        <IconButton
                            onClick={handleSendUpdate}
                            sx={{
                                background: user.color,
                                "&:hover": { background: darken(user.color, 0.2) },
                                color: theme.palette.getContrastText(user.color),
                            }}
                        >
                            <SendRounded />
                        </IconButton>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, paddingBlock: 5 }}>
                        {order.updates?.length > 0 ? (
                            order.updates.map((u: any) => (
                                <Box
                                    key={u.id}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        border: "1px solid lightgrey",
                                        display: "flex",
                                        flexDirection: "column",
                                    }}
                                >
                                    <TypographyCustom variant="body2" fontWeight="bold">
                                        {u.message}
                                    </TypographyCustom>
                                    <Divider sx={{ mt: 2, mb: 1 }} />
                                    <TypographyCustom variant="caption" fontStyle="italic">
                                        {`${u.user?.names} ${u.user?.surnames} (${u.user?.email})`}
                                    </TypographyCustom>
                                    <TypographyCustom variant="caption" color="text.secondary">
                                        {new Date(u.created_at).toLocaleString()}
                                    </TypographyCustom>
                                </Box>
                            ))
                        ) : (
                            <TypographyCustom variant="body2" color="text.secondary">
                                No hay actualizaciones todavía.
                            </TypographyCustom>
                        )}
                    </Box>
                </Box>
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
            </Box>
        </Dialog >
    );
};
