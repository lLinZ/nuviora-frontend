import { Box, darken, lighten, Toolbar, Typography, useTheme } from '@mui/material'
import { FC, useEffect } from 'react';
import { DescripcionDeVista } from '../components/ui/content/DescripcionDeVista';
import { Loading } from '../components/ui/content/Loading';
import { Layout } from '../components/ui/Layout';
import { useUserStore } from '../store/user/UserStore';
import { Widget } from '../components/widgets/Widget';
import Masonry from '@mui/lab/Masonry';

export const Orders = () => {
    const user = useUserStore(state => state.user);
    const theme = useTheme();
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
            <DescripcionDeVista title={'Kanban'} description={'Aqui podrás ver las órdenes'} />

            <Box sx={{ display: 'flex', flexFlow: 'row nowrap', overflowX: 'hidden', overflowY: 'hidden', maxwidth: '100%', pr: 5 }}>
                <Box sx={{
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
                    <Masonry columns={6} spacing={2} sx={{ minWidth: '1200px' }}>
                        <Widget title='Nuevo' >
                            <OrderItem title='Orden #1234' customer='Cliente A' price={100} />
                            <OrderItem title='Orden #1235' customer='Cliente B' price={150} />
                            <OrderItem title='Orden #1236' customer='Cliente C' price={200} />
                        </Widget>
                        <Widget title='En proceso' >
                            <OrderItem title='Orden #1234' customer='Cliente A' price={100} />
                        </Widget>
                        <Widget title='Llamada 1' >
                            <OrderItem title='Orden #1234' customer='Cliente A' price={100} />
                            <OrderItem title='Orden #1235' customer='Cliente B' price={150} />
                            <OrderItem title='Orden #1236' customer='Cliente C' price={200} />
                        </Widget>
                        <Widget title='Llamada 2' >
                            <OrderItem title='Orden #1234' customer='Cliente A' price={100} />
                            <OrderItem title='Orden #1236' customer='Cliente C' price={200} />
                        </Widget>
                        <Widget title='Llamada 3' >
                            <OrderItem title='Orden #1234' customer='Cliente A' price={100} />
                        </Widget>
                        <Widget title='Repartidor' >
                            <OrderItem title='Orden #1234' customer='Cliente A' price={100} />
                            <OrderItem title='Orden #1236' customer='Cliente C' price={200} />
                        </Widget>
                    </Masonry>
                </Box>
            </Box>

        </Layout>
    )
}
interface OrderItemProps {
    title: string;
    customer: string;
    price: number;
}
const OrderItem: FC<OrderItemProps> = ({ title, customer, price }) => {
    const user = useUserStore(state => state.user);

    return (
        <Box sx={{ border: `1px solid ${user.color}`, width: '100%', height: '100px', borderRadius: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Typography>{title}</Typography>
            <Typography>{customer}</Typography>
            <Typography>{price}</Typography>
        </Box>
    )
}