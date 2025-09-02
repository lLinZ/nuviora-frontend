import { AppBar, Box, darken, Dialog, IconButton, lighten, Toolbar, Typography, useTheme } from '@mui/material'
import React, { FC, useEffect, useState } from 'react';
import { DescripcionDeVista } from '../components/ui/content/DescripcionDeVista';
import { Loading } from '../components/ui/content/Loading';
import { Layout } from '../components/ui/Layout';
import { useUserStore } from '../store/user/UserStore';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

export const Orders = () => {
    const user = useUserStore(state => state.user);
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
                        <OrderList title='Nuevo' orders={orders} />
                        <OrderList title='Asginado a vendedora' orders={orders} />
                        <OrderList title='Llamado 1' orders={orders} />
                        <OrderList title='Llamado 2' orders={orders} />
                        <OrderList title='Llamado 3' orders={orders} />
                        <OrderList title='Confirmado' orders={orders} />
                        <OrderList title='Asignado a repartidor' orders={orders} />
                        <OrderList title='En ruta' orders={orders} />
                        <OrderList title='Programado para mas tarde' orders={orders} />
                        <OrderList title='Programado para otro dia' orders={orders} />
                        <OrderList title='Reprogramado' orders={orders} />
                        <OrderList title='Cambio de ubicacion' orders={orders} />
                        <OrderList title='Rechazado' orders={orders} />
                        <OrderList title='Entregado' orders={orders} />
                        <OrderList title='Cancelado' orders={orders} />
                    </Box>
                </Box>
            </Box>

        </Layout>
    )
}
const orders = [
    { id: '1', title: 'Orden #1234', customer: 'Cliente A', price: 100 },
    { id: '2', title: 'Orden #1235', customer: 'Cliente B', price: 150 },
    { id: '3', title: 'Orden #1236', customer: 'Cliente C', price: 200 },
]
interface OrderListProps {
    title: string;
    orders?: any[];
}
const OrderList: FC<OrderListProps> = ({ title, orders }) => {
    const user = useUserStore(state => state.user);
    return (
        <Box sx={{ overflow: 'hidden', minHeight: '600px', maxHeight: '600px', gap: 2, background: (theme) => theme.palette.mode === 'dark' ? `${user.color}20` : lighten(user.color, 0.95), border: `1px solid ${user.color}30`, borderRadius: 5, height: 'fit-content' }}>
            <Box sx={{ background: (theme) => theme.palette.mode === 'dark' ? darken(user.color, 0.8) : 'white', p: 1, boxShadow: '0 8px 16px rgba(150,150,150,0.1)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant='h6' sx={{ mb: 2 }}>{title}</Typography>
            </Box>
            <Box sx={{ p: 2, gap: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '300px', }}>

                {orders && orders.map((order) => (
                    <OrderItem key={order.id} id={order.id} title={order.title} customer={order.customer} price={order.price} />
                ))}
            </Box>
        </Box>
    )
}

interface OrderItemProps {
    id?: string;
    title: string;
    customer: string;
    price: number;
}
const OrderItem: FC<OrderItemProps> = ({ id, title, customer, price }) => {
    const user = useUserStore(state => state.user);
    const [open, setOpen] = useState<boolean>(false);
    const handleOpen = () => setOpen(true);
    const theme = useTheme();
    return (
        <>
            <Box onClick={handleOpen} sx={{ cursor: 'pointer', background: theme.palette.mode === 'dark' ? darken(user.color, 0.92) : 'white', boxShadow: `0 8px 16px${user.color}10`, width: '100%', height: '100px', borderRadius: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Typography>{title}</Typography>
                <Typography>{customer}</Typography>
                <Typography>{price}</Typography>
            </Box>
            <OrderDialog open={open} setOpen={setOpen} id={id} />
        </>

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
    useEffect(() => {
        getData();
    }, []);
    const handleClose = () => {
        setOpen(false)
        console.log(open)
    };
    const getData = async () => {
        const request = await fetch(`/api/orders/${id}`);
        const data = await request.json();
        if (data.status) {
            setOrder(data.order);
        }
    }
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
            </Box>
        </Dialog>
    );
}