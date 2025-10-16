import {
    AppBar,
    Avatar,
    Box,
    Dialog,
    Divider,
    IconButton,
    Toolbar,
    Typography,
    useTheme,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import React, { FC, useEffect, useState } from "react";
import { darken, lighten } from "@mui/material/styles";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { useUserStore } from "../../store/user/UserStore";
import { ButtonCustom, TypographyCustom, TextFieldCustom } from "../custom";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { toast } from "react-toastify";
import { fmtMoney } from "../../lib/money";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp"; // opcional
interface OrderDialogProps {
    id?: number;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success("Copiado al portapapeles ✅");
    } catch {
        toast.error("No se pudo copiar ❌");
    }
};

export const OrderDialog: FC<OrderDialogProps> = ({ id, open, setOpen }) => {
    const { selectedOrder, setSelectedOrder, updateOrder } = useOrdersStore();
    const [openCancel, setOpenCancel] = useState(false);
    const [newUpdate, setNewUpdate] = useState<string>("");

    const user = useUserStore((state) => state.user);
    const theme = useTheme();

    const handleClose = () => setOpen(false);

    // 🔹 Cargar orden seleccionada cuando cambia el id
    useEffect(() => {
        if (id && open) {
            const fetchOrder = async () => {
                const { status, response }: IResponse = await request(`/orders/${id}`, "GET");
                if (status) {
                    const data = await response.json();
                    setSelectedOrder(data.order);
                }
            };
            fetchOrder();
        }
    }, [id, open]);

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
                    minHeight: "100vh",
                }}
            >
                {/* Encabezado */}
                <Typography variant="h5">Orden #{order.name}</Typography>
                <Typography>
                    Cliente: {order.client.first_name} {order.client.last_name}
                </Typography>
                <Typography>
                    Total: {order.current_total_price} {order.currency}
                </Typography>
                <Typography>Status: {order.status.description}</Typography>
                {order.agent && <Typography>Vendedor: {order.agent.names}</Typography>}

                {/* Botón cancelar */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
                    <ButtonCustom
                        variant="contained"
                        color="error"
                        onClick={() => setOpenCancel(true)}
                    >
                        Cancelar orden
                    </ButtonCustom>
                </Box>

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
                <Divider sx={{ marginBlock: 4 }} />

                <Typography variant="h6" sx={{ mb: 2 }}>
                    Información del cliente
                </Typography>

                <Box
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        border: "1px solid rgba(0,0,0,0.08)",
                        bgcolor: "background.paper",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                    }}
                >
                    {/* Nombre */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ width: 36, height: 36 }}>
                            {(order.client?.first_name?.[0] ?? "C").toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <TypographyCustom
                                variant="subtitle1"
                                sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                title={`${order.client?.first_name ?? ""} ${order.client?.last_name ?? ""}`}
                            >
                                {order.client
                                    ? `${order.client.first_name ?? ""} ${order.client.last_name ?? ""}`.trim() || "Sin nombre"
                                    : "Cliente desconocido"}
                            </TypographyCustom>
                            <Typography variant="caption" color="text.secondary">
                                ID cliente: {order.client?.id ?? "N/D"}
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={() =>
                                copyToClipboard(
                                    `${order.client?.first_name ?? ""} ${order.client?.last_name ?? ""}`.trim()
                                )
                            }
                        >
                            <ContentCopyRoundedIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Teléfono */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <PhoneIphoneRoundedIcon fontSize="small" />
                        <Typography sx={{ flex: 1 }} variant="body2">
                            {order.client?.phone ?? "Teléfono no disponible"}
                        </Typography>
                        {order.client?.phone && (
                            <>
                                <IconButton
                                    size="small"
                                    onClick={() => copyToClipboard(order.client?.phone as string)}
                                >
                                    <ContentCopyRoundedIcon fontSize="small" />
                                </IconButton>
                                {/* WhatsApp directo (opcional) */}
                                <IconButton
                                    size="small"
                                    component="a"
                                    href={`https://wa.me/${String(order.client?.phone).replace(/\D/g, "")}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Abrir WhatsApp"
                                >
                                    <WhatsAppIcon fontSize="small" />
                                </IconButton>
                            </>
                        )}
                    </Box>

                    {/* Email */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <EmailRoundedIcon fontSize="small" />
                        <Typography sx={{ flex: 1 }} variant="body2">
                            {order.client?.email ?? "Correo no disponible"}
                        </Typography>
                        {order.client?.email && (
                            <>
                                <IconButton size="small" onClick={() => copyToClipboard(order.client?.email as string)}>
                                    <ContentCopyRoundedIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    component="a"
                                    href={`mailto:${order.client?.email}`}
                                    title="Enviar correo"
                                >
                                    <EmailRoundedIcon fontSize="small" />
                                </IconButton>
                            </>
                        )}
                    </Box>

                    {/* Dirección */}
                    <Box sx={{ display: "flex", alignItems: "start", gap: 1 }}>
                        <PlaceRoundedIcon fontSize="small" sx={{ mt: 0.4 }} />
                        <Typography sx={{ flex: 1 }} variant="body2">
                            {order.client?.address
                                ? order.client.address
                                : "Dirección no disponible"}
                        </Typography>
                        {order.client?.address && (
                            <IconButton size="small" onClick={() => copyToClipboard(order.client?.address as string)}>
                                <ContentCopyRoundedIcon fontSize="small" />
                            </IconButton>
                        )}
                    </Box>

                    {/* Fecha de creación (si la tienes) */}
                    {order.client?.created_at && (
                        <Typography variant="caption" color="text.secondary">
                            Cliente desde: {new Date(order.client.created_at).toLocaleDateString()}
                        </Typography>
                    )}
                </Box>
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

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
            </Box>
        </Dialog>
    );
};
