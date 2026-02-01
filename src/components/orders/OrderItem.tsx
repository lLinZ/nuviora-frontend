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
import { NotificationsActiveRounded, WarningAmberRounded } from "@mui/icons-material";
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
import { AssignAgencyDialog } from "./AssignAgencyDialog";
import { NoveltyDialog } from "./NoveltyDialog";
import { MarkDeliveredDialog } from "./MarkDeliveredDialog";
import { PhoneActionMenu } from "./PhoneActionMenu";

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
    "Reprogramado para hoy": yellow[900],

    // Cambios / neutros
    "Cambio de ubicacion": grey[500],

    // Estados negativos
    "Rechazado": red[600],
    "Cancelado": red[800],
    "Pendiente Cancelación": red[400],
    "Por aprobar entrega": yellow[700],
    "Por aprobar cambio de ubicacion": yellow[800],
    "Por aprobar rechazo": orange[900],
    "Asignar a agencia": blue[400],
    "Esperando Ubicacion": purple[300],
    "Sin Stock": grey[700],
};
export const OrderItem: FC<OrderItemProps> = ({ order }) => {
    const user = useUserStore((state) => state.user);
    const { updateOrderInColumns, setSelectedOrder } = useOrdersStore();
    const [openAssign, setOpenAssign] = useState(false);
    const [open, setOpen] = useState<boolean>(false);
    const [productsOpen, setProductsOpen] = useState<boolean>(false);
    const [openAssignDeliverer, setOpenAssignDeliverer] = useState(false);
    const [openPostpone, setOpenPostpone] = useState(false);
    const [openAssignAgency, setOpenAssignAgency] = useState(false);
    const [openNovelty, setOpenNovelty] = useState(false);
    const [openMarkDelivered, setOpenMarkDelivered] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<{ description: string } | null>(null);
    const [targetStatus, setTargetStatus] = useState<string>("");
    const [targetStatusId, setTargetStatusId] = useState<number>(0);

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
    const changeStatus = async (status: string, extraData: any = null) => {
        // Intercept postponing
        if (status === "Programado para otro dia" || status === "Programado para mas tarde") {
            setTargetStatus(status);
            setOpenPostpone(true);
            return;
        }

        // Intercept Entregado to ask for cash details if needed
        if (status === "Entregado" && !extraData) {
            const cashMethods = ['DOLARES_EFECTIVO', 'BOLIVARES_EFECTIVO', 'EUROS_EFECTIVO'];
            const needsCashInfo = order.payment_method === 'EFECTIVO' ||
                order.payments?.some((p: any) => cashMethods.includes(p.method));

            if (needsCashInfo) {
                setPendingStatus({ description: status });
                setOpenMarkDelivered(true);
                return;
            }
        }

        if (status === "Asignar a agencia" && !order.agency) {
            // ... (keeping existing agency logic)
            const body = new URLSearchParams();
            body.append("status", status);
            try {
                const { status: ok, response }: IResponse = await request(
                    `/orders/${order.id}/status`,
                    "PUT",
                    body
                );
                const data = await response.json();
                if (ok) {
                    updateOrderInColumns(data.order);
                    toast.success(data.message || `Agencia auto-asignada exitosamente ✅`);
                    return;
                } else if (data.require_manual_agency) {
                    toast.info(data.message);
                    setOpenAssignAgency(true);
                    return;
                } else {
                    toast.error(data.message || "Error al asignar agencia");
                    return;
                }
            } catch (e) {
                console.error(e);
                toast.error("Error de conexión al intentar asignar agencia");
                return;
            }
        }

        if (status === "Novedades") {
            setTargetStatus(status);
            setOpenNovelty(true);
            return;
        }

        // caso normal: actualizar status
        const body = new URLSearchParams();
        body.append("status", status);

        if (extraData) {
            Object.keys(extraData).forEach(key => {
                body.append(key, String(extraData[key]));
            });
        }

        try {
            const { status: ok, response }: IResponse = await request(
                `/orders/${order.id}/status`,
                "PUT",
                body
            );
            if (ok === 200) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success(data.message || `Orden #${order.name} actualizada a ${status} ✅`);
                setOpenMarkDelivered(false);
                setPendingStatus(null);
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || "No se pudo actualizar el estado ❌");
            }
        } catch {
            toast.error("Error en el servidor al actualizar estado 🚨");
        }
    };

    const handleNoveltySubmit = async (type: string, description: string) => {
        const body = new URLSearchParams();
        body.append("status", targetStatus);
        body.append("novedad_type", type);
        body.append("novedad_description", description);

        try {
            const { status: ok, response }: IResponse = await request(
                `/orders/${order.id}/status`,
                "PUT",
                body
            );
            if (ok) {
                const data = await response.json();
                updateOrderInColumns(data.order);
                toast.success(`Novedad registrada: ${type} ✅`);
                setOpenNovelty(false);
            } else {
                toast.error("No se pudo registrar la novedad ❌");
            }
        } catch {
            toast.error("Error en el servidor 🚨");
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TypographyCustom variant="subtitle1" fontWeight={"bold"}>
                        Orden {order.name}
                    </TypographyCustom>
                    {order.has_stock_warning && (
                        <Tooltip title="Stock insuficiente en almacén">
                            <WarningAmberRounded sx={{ color: red[500], fontSize: '1.2rem' }} />
                        </Tooltip>
                    )}
                </Box>
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
                    {order.client?.first_name} {order.client?.last_name}
                </TypographyCustom>
                {order.client?.phone && (
                    <PhoneActionMenu
                        phone={order.client.phone}
                        sx={{
                            maxWidth: "200px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    />
                )}
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
                    {order.client?.city}
                </TypographyCustom>
                <TypographyCustom variant="subtitle2">
                    {order.current_total_price} {order.currency}
                </TypographyCustom>
                {order.agency && (
                    <TypographyCustom variant="caption" color="primary.main" sx={{ fontWeight: 'bold', display: 'block' }}>
                        Agencia: {user.role?.description === 'Vendedor' ? 'Asignada' : order.agency?.names}
                    </TypographyCustom>
                )}
                {order.novedad_type && (
                    <TypographyCustom variant="caption" sx={{ color: order.status.description === 'Novedad Solucionada' ? 'green' : 'orange', fontWeight: 'bold', display: 'block', mt: 0.5 }}>
                        {order.status.description === 'Novedad Solucionada' ? 'Resuelta: ' : 'Novedad: '} {order.novedad_type}
                    </TypographyCustom>
                )}
                {['Admin', 'Gerente', 'Master'].includes(user.role?.description || '') && order.shop && (
                    <TypographyCustom variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        Tienda: <b>{order.shop.name}</b>
                    </TypographyCustom>
                )}

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
                    {['Admin', 'Gerente', 'Master'].includes(user.role?.description || '') ? (
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
                    ) : (
                        <Avatar
                            sx={{ width: 30, height: 30, color: (theme) => theme.palette.getContrastText(order.agent?.color ?? '#4e4e4eff'), background: order.agent?.color ?? '#4e4e4eff' }}
                        >
                            {order.agent?.names ? (
                                order.agent.names.charAt(0)
                            ) : (
                                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: grey[300] }}>
                                    <AddRoundedIcon sx={{ color: grey[500] }} />
                                </Box>
                            )}
                        </Avatar>
                    )}
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
                            R: {new Date(order.reminder_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TypographyCustom>
                    </Box>
                )}

                {(order.status.description === 'Programado para mas tarde' || order.status.description === 'Reprogramado para hoy') && order.scheduled_for && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 1 }}>
                        <TypographyCustom variant="caption" sx={{
                            color: new Date(order.scheduled_for) < new Date() ? 'error.main' : 'warning.main',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                        }}>
                            <NotificationsActiveRounded fontSize="small" sx={{
                                color: new Date(order.scheduled_for) < new Date() ? 'error.main' : 'warning.main',
                                animation: new Date(order.scheduled_for) < new Date() ? 'pulse-fast 1s infinite' : 'none',
                                '@keyframes pulse-fast': {
                                    '0%': { transform: 'scale(1)', opacity: 1 },
                                    '50%': { transform: 'scale(1.3)', opacity: 0.7 },
                                    '100%': { transform: 'scale(1)', opacity: 1 },
                                }
                            }} />
                            Vence: {new Date(order.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

            <NoveltyDialog
                open={openNovelty}
                onClose={() => setOpenNovelty(false)}
                onSubmit={handleNoveltySubmit}
            />
            {openPostpone && (
                <PostponeOrderDialog
                    open={openPostpone}
                    onClose={() => {
                        setOpenPostpone(false);
                        setTargetStatus("");
                    }}
                    orderId={order.id}
                    targetStatus={targetStatus}
                />
            )}
            <AssignAgencyDialog
                open={openAssignAgency}
                onClose={() => setOpenAssignAgency(false)}
                orderId={order.id}
            />
            <MarkDeliveredDialog
                open={openMarkDelivered}
                onClose={() => setOpenMarkDelivered(false)}
                order={order}
                binanceRate={order.binance_rate ?? 0}
                onConfirm={(data) => {
                    if (pendingStatus) changeStatus(pendingStatus.description, data);
                }}
            />
            <OrderDialog open={open} setOpen={setOpen} id={order.id} />
        </Box>
    );
};
