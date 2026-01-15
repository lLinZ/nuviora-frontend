import {
    Avatar,
    Box,
    Chip,
    Dialog,
    Divider,
    Tooltip,
    useTheme,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { NotificationsActiveRounded } from "@mui/icons-material";
import React, { FC, useState } from "react";
import { darken } from "@mui/material/styles";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { useUserStore } from "../../store/user/UserStore";
import { TypographyCustom } from "../custom";
import DenseMenu from "../ui/content/DenseMenu";
import { AssignAgentDialog } from "./AssignAgentDialog";
import { OrderDialog } from "./OrderDialog";
import { purple, blue, green, red, yellow, grey, orange } from "@mui/material/colors";
import { AssignDelivererDialog } from "./AssignDelivererDialog";
import { PostponeOrderDialog } from "./PostponeOrderDialog";

interface OrderItemProps {
    order: any;
}
export const statusColors: Record<string, string> = {
    // Inicio
    "Nuevo": purple[400],

    // Asignaciones
    "Asignado a vendedora": blue[500],
    "Asignado a repartidor": blue[700],

    // Llamados → tonos naranjas (seguimiento, advertencia pero no error)
    "Llamado 1": orange[400],
    "Llamado 2": orange[600],
    "Llamado 3": orange[800],

    // Confirmación / éxito
    "Confirmado": green[600],
    "Entregado": green[700],

    // En ruta
    "En ruta": blue[900],

    // Programaciones
    "Programado para mas tarde": yellow[600],
    "Programado para otro dia": yellow[800],
    "Reprogramado": yellow[900],

    // Cambios / neutros
    "Cambio de ubicacion": grey[500],

    // Estados negativos
    "Rechazado": red[600],
    "Cancelado": red[800],
    "Pendiente Cancelación": red[400],
    "Por aprobar entrega": yellow[700],
    "Por aprobar cambio de ubicacion": yellow[800],
    "Por aprobar rechazo": orange[900],
};
export const OrderItem: FC<OrderItemProps> = ({ order }) => {
    const user = useUserStore((state) => state.user);
    const { updateOrder, setSelectedOrder } = useOrdersStore();
    const [openAssign, setOpenAssign] = useState(false);
    const [open, setOpen] = useState<boolean>(false);
    const [productsOpen, setProductsOpen] = useState<boolean>(false);
    const [openAssignDeliverer, setOpenAssignDeliverer] = useState(false);
    const [openPostpone, setOpenPostpone] = useState(false); // 👈 New state
    const [orderProducts, setOrderProducts] = useState<any>([]);
    const [orderProductsEmpty, setOrderProductsEmpty] = useState<boolean>(false);
    const theme = useTheme();

    const handleOpen = () => {
        setSelectedOrder(order);
        setOpen(true);
    };
    const getProducts = async () => {
        setOrderProductsEmpty(false);
        toast.info('Cargando productos...', { autoClose: 1000 });
        const { status, response }: IResponse = await request(`/order/${order.id}/products`, 'GET');
        if (status == 200) {
            const { products } = await response.json();
            console.log({ products })
            if (products.length === 0) {
                setOrderProductsEmpty(true);
            } else {
                setOrderProducts(products)
            }
        } else {
            setOrderProductsEmpty(true);
            toast.error('No se pudieron cargar los productos');
            console.log('error consultando products')
        }
    }
    const changeStatus = async (status: string, statusId: number) => {
        // Intercept postponing
        if (status === "Programado para otro dia" || status === "Programado para mas tarde") {
            setOpenPostpone(true);
            return;
        }

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
                toast.success(data.message || `Orden #${order.name} actualizada a ${status} ✅`);
            } else {
                toast.error("No se pudo actualizar el estado ❌");
            }
        } catch {
            toast.error("Error en el servidor al actualizar estado 🚨");
        }
    };

    return (
        <Box
            sx={{
                p: 2,
                background:
                    theme.palette.mode === "dark"
                        ? darken(user.color, 0.7)
                        : "#f2f2f2",
                border:
                    theme.palette.mode === "dark"
                        ? `1px solid ${darken(user.color, 0.6)}`
                        : "1px solid #f0f0f0",
                borderRadius: 5,
                minWidth: "250px",
                display: "flex",
                flexFlow: "column wrap",
            }}
        >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <TypographyCustom variant="subtitle1" fontWeight={"bold"}>
                    Orden {order.name}
                </TypographyCustom>
                <DenseMenu data={order} changeStatus={changeStatus} />
            </Box>

            <Box onClick={handleOpen} sx={{ cursor: "pointer" }}>
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
                    {order.client.first_name} {order.client.last_name}
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
                <TypographyCustom variant="subtitle2">
                    {order.current_total_price} {order.currency}
                </TypographyCustom>

                <Divider sx={{ marginBlock: 2 }} />

                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                    <Chip
                        label={order.status.description}
                        sx={{
                            backgroundColor: statusColors[order.status.description] || grey[400],
                            color: "#fff",
                            fontWeight: "bold",
                        }}
                    />
                    <Avatar
                        sx={{ width: 30, height: 30, cursor: "pointer", color: (theme) => theme.palette.getContrastText(order.agent?.color ?? '#4e4e4eff'), background: order.agent?.color ?? '#4e4e4eff' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenAssign(true);
                        }}
                    >
                        {order.agent?.names ? (
                            order.agent.names.charAt(0)
                        ) : (
                            <AddRoundedIcon />
                        )}
                    </Avatar>
                </Box>
                {order.reminder_at && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                        <TypographyCustom variant="caption" sx={{
                            color: new Date(order.reminder_at) < new Date() ? 'error.main' : 'info.main',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                        }}>
                            <NotificationsActiveRounded fontSize="small" sx={{
                                animation: new Date(order.reminder_at) < new Date() ? 'pulse 1.5s infinite' : 'none',
                                '@keyframes pulse': {
                                    '0%': { transform: 'scale(1)' },
                                    '50%': { transform: 'scale(1.2)' },
                                    '100%': { transform: 'scale(1)' },
                                }
                            }} />
                            {new Date(order.reminder_at).toLocaleString()}
                        </TypographyCustom>
                    </Box>
                )}
            </Box>
            <TypographyCustom sx={{ margin: 'auto', color: user.color, mt: 1 }} variant="subtitle1" onClick={() => getProducts()}>Ver productos</TypographyCustom>

            {orderProducts.length > 0 ? orderProducts.map((p: any) =>
                <Tooltip title={p.title}>
                    <TypographyCustom variant="subtitle2"
                        color="text.secondary"
                        sx={{
                            maxWidth: "200px",   // 🔹 ajusta el ancho máximo permitido
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}>
                        ({p.quantity}) {p.title}
                    </TypographyCustom>
                </Tooltip>
            ) : orderProductsEmpty ? 'No hay productos para mostrar' : ''}
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
            {openPostpone && (
                <PostponeOrderDialog
                    open={openPostpone}
                    onClose={() => setOpenPostpone(false)}
                    orderId={order.id}
                />
            )}
            <OrderDialog open={open} setOpen={setOpen} id={order.id} />
        </Box>
    );
};
