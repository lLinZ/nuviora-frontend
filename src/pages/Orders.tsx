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


const ordersInitial = [
    { id: '1', title: 'Orden #1234', customer: 'Cliente A', price: 100, status: 'Nuevo' },
    { id: '2', title: 'Orden #1235', customer: 'Cliente B', price: 150, status: 'Nuevo' },
    { id: '3', title: 'Orden #1236', customer: 'Cliente C', price: 200, status: 'Nuevo' },
]
export const Orders = () => {
    const user = useUserStore(state => state.user);
    const [orders, setOrders] = useState<any[]>(ordersInitial);
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
                        <OrderList orders={orders} setOrders={setOrders} title='Asginado a vendedora' />
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
        <Box sx={{ zIndex: 999, background: (theme) => theme.palette.mode === 'dark' ? darken(user.color, 0.8) : 'white', p: 2, boxShadow: '0 8px 20px rgba(150,150,150,0.1)', overflow: 'hidden', minHeight: '600px', maxHeight: '600px', gap: 2, borderRadius: 5, height: 'fit-content' }}>
            <Typography variant='h6' sx={{ mb: 2 }}>{title}</Typography>
            <Box sx={{ p: 2, gap: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '300px', }}>
                {orders && orders.map((order) => (
                    order.status === title && <OrderItem key={order.id} order={order} orders={orders} setOrders={setOrders} />
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
    const [open, setOpen] = useState<boolean>(false);
    const handleOpen = () => setOpen(true);
    const theme = useTheme();

    const changeStatus = (status: string) => {
        const exception = orders?.filter(o => o.id !== order.id);
        const updatedOrder = { ...order, status };
        const newOrders = exception ? [...exception, updatedOrder] : [updatedOrder];
        setOrders ? setOrders(newOrders) : null;
    }
    return (
        <Box sx={{ p: 2, background: theme.palette.mode === 'dark' ? darken(user.color, 0.7) : '#f2f2f2', border: theme.palette.mode === 'dark' ? `1px solid ${darken(user.color, 0.6)}` : '1px solid #f0f0f0', borderRadius: 5, minWidth: '250px', display: 'flex', flexFlow: 'column wrap' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <TypographyCustom variant='subtitle1' fontWeight={'bold'}>{order.title}</TypographyCustom>
                <DenseMenu data={orders} changeStatus={changeStatus} />
            </Box>
            <Box onClick={handleOpen} sx={{ cursor: 'pointer' }}>
                <Box sx={{ display: 'flex', flexFlow: 'column', justifyContent: 'center', alignItems: 'start' }}>
                    <TypographyCustom variant='subtitle2'>Precio ${order.price}</TypographyCustom>
                    <TypographyCustom variant='subtitle2' color={'text.secondary'}>{order.customer}</TypographyCustom>
                </Box>
                <Divider sx={{ marginBlock: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 2 }}>
                    <Chip label={order.status} />
                    <Avatar sx={{ width: 30, height: 30, fontSize: 16 }}>
                        {order.customer.charAt(0)}
                    </Avatar>
                </Box>
            </Box>
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
    const [order, setOrder] = useState<any>({});
    const user = useUserStore(state => state.user);
    const theme = useTheme();
    // useEffect(() => {
    //     getData();
    // }, []);
    const handleClose = () => {
        setOpen(false)
        console.log(open)
    };
    // const getData = async () => {
    //     const request = await fetch(`/api/orders/${id}`);
    //     const data = await request.json();
    //     if (data.status) {
    //         setOrder(data.order);
    //     }
    // }
    return (
        <Dialog fullScreen onClose={handleClose} open={open} >
            <AppBar sx={{ background: theme.palette.mode === 'dark' ? darken(user.color, 0.8) : user.color, p: 2, }} elevation={0}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexFlow: 'row nowrap', width: '100%' }}>
                    <Typography variant='h6'>Detalle de la orden</Typography>
                    <IconButton onClick={handleClose}>
                        <CloseRoundedIcon sx={{ color: (theme) => theme.palette.getContrastText(user.color) }} />
                    </IconButton>
                </Box>
            </AppBar>
            <Toolbar />
            <Box sx={{ p: 2, background: theme.palette.mode === 'dark' ? darken(user.color, 0.9) : lighten(user.color, 0.97), minHeight: '100vh', height: '100%' }}>
                <Typography variant='h5'>Orden #{order.id}</Typography>
                <Typography>Cliente: {order.customer}</Typography>
                <Typography>Total: ${order.total}</Typography>
                <Typography>{open}</Typography>
                <Divider sx={{ marginBlock: 5 }} />

                {/** Seccion actualizaciones */}
                <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 2 }}>

                    {/** Crear actualizacion */}
                    <Box sx={{ display: 'flex', flexFlow: 'row nowrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
                        <TextFieldCustom label="Dejar una actualizacion..." />
                        <IconButton sx={{ background: user.color, '&:hover': { background: darken(user.color, 0.2) }, color: (theme) => theme.palette.getContrastText(user.color) }}>
                            <SendRounded />
                        </IconButton>
                    </Box>
                    {/** Actualizacion */}
                    <Box sx={{}}>

                    </Box>
                </Box>
            </Box>
        </Dialog>
    );
}