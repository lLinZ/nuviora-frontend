import { AppBar, Avatar, Box, Chip, darken, Dialog, Divider, IconButton, lighten, Toolbar, Typography, useTheme } from '@mui/material'
import React, { FC, useEffect, useState } from 'react';
import { DescripcionDeVista } from '../components/ui/content/DescripcionDeVista';
import { Loading } from '../components/ui/content/Loading';
import { Layout } from '../components/ui/Layout';
import { useUserStore } from '../store/user/UserStore';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { TextFieldCustom, TypographyCustom } from '../components/custom';
import DenseMenu from '../components/ui/content/DenseMenu';
import SendRounded from '@mui/icons-material/SendRounded';
import { request } from '../common/request';
import { IResponse } from '../interfaces/response-type';
import { AssignAgentDialog } from '../components/orders/AssignAgentDialog';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
const useGetOrders = (url: string) => {
    const [orders, setOrders] = useState<any[]>([]);
    useEffect(() => {
        const fetchOrders = async () => {
            const { status, response, err }: IResponse = await request(url, 'GET');
            if (status) {
                const data = await response.json();
                console.log(data.data);
                setOrders(data.data);
            }
        };
        fetchOrders();
    }, [url]);
    return { orders, setOrders };
}

export const Orders = () => {
    const user = useUserStore(state => state.user);
    const { orders, setOrders } = useGetOrders('/orders');
    const validateToken = useUserStore((state) => state.validateToken);
    const validarSesion = async () => {
        const result = await validateToken();
        console.log({ result });
        if (!result.status) return window.location.href = '/';
    }
    useEffect(() => {
        validarSesion();
    }, [])
    if (!user.token) return (
        <Loading />
    )
    return (
        <Layout>
            <DescripcionDeVista title={'Kanban'} description={'example'} />
            <Box sx={{ display: 'flex', flexFlow: 'row nowrap', overflowX: 'hidden', overflowY: 'hidden', maxWidth: '85%', }}>
                <Box sx={{
                    pb: 2,
                    display: 'flex', flexFlow: 'row nowrap',
                    overflowX: 'scroll', overflowY: 'hidden', width: '100%', '&::-webkit-scrollbar': {
                        height: '5px',
                        width: '5px',
                    },
                    '&::-webkit-scrollbar-track': {
                        borderRadius: '5px',
                        backgroundColor: darken(user.color, 0.8),
                    },
                    '&::-webkit-scrollbar-thumb': {
                        borderRadius: '5px',
                        backgroundColor: lighten(user.color, 0.2),
                    },
                }}>
                    <Box sx={{ display: 'flex', gap: 2, flexFlow: 'row nowrap' }}>
                        <OrderList orders={orders} setOrders={setOrders} title='Nuevo' />
                        <OrderList orders={orders} setOrders={setOrders} title='Asignado a vendedora' />
                        <OrderList orders={orders} setOrders={setOrders} title='Llamado 1' />
                        <OrderList orders={orders} setOrders={setOrders} title='Llamado 2' />
                        <OrderList orders={orders} setOrders={setOrders} title='Llamado 3' />
                        <OrderList orders={orders} setOrders={setOrders} title='Confirmado' />
                        <OrderList orders={orders} setOrders={setOrders} title='Asignado a repartidor' />
                        <OrderList orders={orders} setOrders={setOrders} title='En ruta' />
                        <OrderList orders={orders} setOrders={setOrders} title='Programado para mas tarde' />
                        <OrderList orders={orders} setOrders={setOrders} title='Programado para otro dia' />
                        <OrderList orders={orders} setOrders={setOrders} title='Reprogramado' />
                        <OrderList orders={orders} setOrders={setOrders} title='Cambio de ubicacion' />
                        <OrderList orders={orders} setOrders={setOrders} title='Rechazado' />
                        <OrderList orders={orders} setOrders={setOrders} title='Entregado' />
                        <OrderList orders={orders} setOrders={setOrders} title='Cancelado' />
                    </Box>
                </Box>
            </Box>

        </Layout>
    )
}
interface OrderListProps {
    title: string;
    orders?: any[];
    setOrders?: React.Dispatch<React.SetStateAction<any[]>>;
}
const OrderList: FC<OrderListProps> = ({ title, orders, setOrders }) => {
    const user = useUserStore(state => state.user);
    return (
        <Box sx={{
            zIndex: 999, background: (theme) => theme.palette.mode === 'dark' ? darken(user.color, 0.8) : 'white', p: 2, boxShadow: '0 8px 20px rgba(150,150,150,0.1)', overflowX: 'hidden', minHeight: '600px', maxHeight: '600px', gap: 2, borderRadius: 5, height: 'fit-content',
            overflowY: 'scroll', '&::-webkit-scrollbar': {
                width: '5px',
            },
        }}>
            <Typography variant='h6' sx={{ mb: 2 }}>{title}</Typography>
            <Box sx={{ p: 2, gap: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '300px', }}>
                {orders && orders.map((order) => (
                    order.status.description === title && <OrderItem key={order.id} order={order} orders={orders} setOrders={setOrders} />
                ))}
            </Box>
        </Box>
    )
}

interface OrderItemProps {
    order: any;
    orders?: any[];
    setOrders?: React.Dispatch<React.SetStateAction<any[]>>;
}
const OrderItem: FC<OrderItemProps> = ({ order, orders, setOrders }) => {
    const user = useUserStore(state => state.user);
    const [openAssign, setOpenAssign] = useState(false);
    const [open, setOpen] = useState<boolean>(false);
    const handleOpen = () => setOpen(true);
    const theme = useTheme();

    const changeStatus = async (status: string, statusId: number) => {
        const body = new URLSearchParams()
        body.append('status_id', String(statusId));
        try {
            const { status: ok, response }: IResponse = await request(
                `/orders/${order.id}/status`,
                "PUT",
                body
            );

            if (ok) {
                const data = await response.json();
                console.log({ ok, data });
                const updatedOrder = data.order;
                const newOrders = orders?.map(o =>
                    o.id === order.id ? updatedOrder : o
                );
                setOrders?.(newOrders ?? []);
            }
        } catch (e) {
            console.error("Error al actualizar estado", e);
        }
    };
    return (
        <Box sx={{ p: 2, background: theme.palette.mode === 'dark' ? darken(user.color, 0.7) : '#f2f2f2', border: theme.palette.mode === 'dark' ? `1px solid ${darken(user.color, 0.6)}` : '1px solid #f0f0f0', borderRadius: 5, minWidth: '250px', display: 'flex', flexFlow: 'column wrap' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <TypographyCustom variant='subtitle1' fontWeight={'bold'}>Orden {order.name}</TypographyCustom>
                <DenseMenu data={orders} changeStatus={changeStatus} />
            </Box>
            <Box onClick={handleOpen} sx={{ cursor: 'pointer' }}>
                <Box sx={{ display: 'flex', flexFlow: 'column', justifyContent: 'center', alignItems: 'start' }}>
                    <TypographyCustom variant='subtitle2' color={'text.secondary'}>{order.client.first_name} {order.client.last_name}</TypographyCustom>
                    <TypographyCustom variant='subtitle2'>{order.current_total_price} {order.currency}</TypographyCustom>
                </Box>
                <Divider sx={{ marginBlock: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 2 }}>
                    <Chip label={order.status.description} />
                    <Avatar
                        sx={{ width: 30, height: 30, fontSize: 16, cursor: "pointer" }}
                        onClick={(e) => {
                            e.stopPropagation(); // evita abrir el OrderDialog
                            setOpenAssign(true);
                        }}
                    >
                        {order.agent?.names
                            ? order.agent.names.charAt(0)
                            : <AddRoundedIcon />}
                    </Avatar>
                </Box>
            </Box>
            {/* Dialog para asignar */}
            <AssignAgentDialog
                open={openAssign}
                onClose={() => setOpenAssign(false)}
                orderId={order.id}
                onAssigned={(agent) => {
                    // actualizamos la orden en memoria
                    const updated = { ...order, agent };
                    const newOrders = orders?.map((o) => (o.id === order.id ? updated : o));
                    setOrders?.(newOrders ?? []);
                }}
            />

            <OrderDialog open={open} setOpen={setOpen} id={order.id} />
        </Box >
    )
}
interface OrderDialogProps {
    id?: string;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const OrderDialog: FC<OrderDialogProps> = ({ id, open, setOpen }) => {
    const [order, setOrder] = useState<any>(null);
    const [newUpdate, setNewUpdate] = useState<string>("");
    const user = useUserStore(state => state.user);
    const theme = useTheme();

    const handleClose = () => setOpen(false);

    // 🔹 Obtener datos al abrir
    useEffect(() => {
        if (open && id) {
            getData();
        }
    }, [open, id]);

    const getData = async () => {
        try {
            const { status, response }: IResponse = await request(`/orders/${id}`, "GET");
            if (status) {
                const data = await response.json();
                setOrder(data.order);
            }
        } catch (err) {
            console.error("Error al obtener orden", err);
        }
    };

    // 🔹 Crear actualización
    const handleSendUpdate = async () => {
        if (!newUpdate.trim()) return;
        const body = new URLSearchParams();
        body.append('message', newUpdate);
        try {
            const { status, response }: IResponse = await request(
                `/orders/${id}/updates`,
                "POST",
                body
            );
            if (status) {
                setNewUpdate("");
                await getData(); // refrescamos las actualizaciones
            }
        } catch (err) {
            console.error("Error al enviar actualización", err);
        }
    };

    if (!order) return null; // aún cargando

    return (
        <Dialog fullScreen onClose={handleClose} open={open}>
            <AppBar sx={{ background: theme.palette.mode === 'dark' ? darken(user.color, 0.8) : user.color, p: 2 }} elevation={0}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Typography variant="h6">Detalle de la orden</Typography>
                    <IconButton onClick={handleClose}>
                        <CloseRoundedIcon sx={{ color: (theme) => theme.palette.getContrastText(user.color) }} />
                    </IconButton>
                </Box>
            </AppBar>
            <Toolbar />
            <Box sx={{ p: 4, background: theme.palette.mode === 'dark' ? darken(user.color, 0.9) : lighten(user.color, 0.97), minHeight: '100vh' }}>
                <Typography variant="h5">Orden #{order.name}</Typography>
                <Typography>Cliente: {order.client.first_name} {order.client.last_name}</Typography>
                <Typography>Total: {order.current_total_price} {order.currency}</Typography>
                <Typography>Status: {order.status.description}</Typography>
                {order.agent && <Typography>Vendedor: {order.agent.names}</Typography>}
                <Divider sx={{ marginBlock: 3 }} />

                <Typography variant="h6" sx={{ mb: 2 }}>
                    Productos de la orden
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {order.products && order.products.length > 0 ? (
                        order.products.map((p: any) => (
                            <Box
                                key={p.id}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                    p: 2,
                                    borderRadius: 2,
                                }}
                            >
                                <Avatar
                                    src={p.image}
                                    alt={p.title}
                                    variant="rounded"
                                    sx={{ width: 56, height: 56 }}
                                />
                                <Box sx={{ flex: 1 }}>
                                    <TypographyCustom variant="subtitle1">{p.title}</TypographyCustom>
                                    <TypographyCustom variant="body2" color="text.secondary">
                                        Cantidad: {p.quantity}
                                    </TypographyCustom>
                                </Box>
                                <TypographyCustom variant="body2">
                                    ${(p.price * p.quantity).toFixed(2)}
                                </TypographyCustom>
                            </Box>
                        ))
                    ) : (
                        <TypographyCustom variant="body2" color="text.secondary">
                            No hay productos en esta orden.
                        </TypographyCustom>
                    )}
                </Box>
                <Divider sx={{ marginBlock: 2 }} />
                <Typography variant="h6" textAlign="right">
                    Total: {order.current_total_price} {order.currency}
                </Typography>
                <Divider sx={{ marginBlock: 5 }} />

                {/* 🔹 Sección actualizaciones */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Crear actualización */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextFieldCustom
                            label="Dejar una actualización..."
                            value={newUpdate}
                            onChange={(e: any) => setNewUpdate(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault(); // evita que haga salto de línea
                                    handleSendUpdate();
                                }
                            }}
                        />
                        <IconButton
                            onClick={handleSendUpdate}
                            sx={{
                                background: user.color,
                                '&:hover': { background: darken(user.color, 0.2) },
                                color: (theme) => theme.palette.getContrastText(user.color)
                            }}
                        >
                            <SendRounded />
                        </IconButton>
                    </Box>

                    {/* Lista de actualizaciones */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {order.updates && order.updates.length > 0 ? (
                            order.updates.map((u: any) => (
                                <Box key={u.id} sx={{ p: 2, borderRadius: 2, border: '1px solid lightgrey', display: 'flex', flexDirection: 'column' }}>

                                    {/* Mensaje */}
                                    <TypographyCustom variant="body2" fontWeight="bold">
                                        {u.message}
                                    </TypographyCustom>

                                    <Divider sx={{ mt: 2, mb: 1 }} />
                                    {/* Usuario que la creó */}
                                    <TypographyCustom variant="caption" fontStyle={'italic'}>
                                        {`${u.user?.names} ${u.user?.surnames} (${u.user?.email}) `}
                                    </TypographyCustom>
                                    {/* Fecha */}
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