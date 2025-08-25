import { Box, Toolbar } from '@mui/material'
import { Layout } from '../components/ui/Layout'
import { useUserStore } from '../store/user/UserStore';
import { TypographyCustom } from '../components/custom';
import { useEffect } from 'react';
import { Widget } from '../components/widgets/Widget';
import { Loading } from '../components/ui/content/Loading';

export const Dashboard = () => {
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
            <Toolbar />
            <TypographyCustom fontWeight={'bold'} variant='h4'>¡Bienvenido {user.names}!</TypographyCustom>
            <TypographyCustom color={'text.secondary'} variant='body1'>¿Que deseas hacer hoy?</TypographyCustom>
            <Box sx={{ display: 'flex', flexFlow: 'row wrap', gap: 2 }}>
                <Widget title='Proximos torneos'>
                    <TypographyCustom variant='body1' >Aguilas vs Tigres</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >12/08/2025</TypographyCustom>
                </Widget>
            </Box>
        </Layout>
    )
}
