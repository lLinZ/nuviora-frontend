import { Toolbar } from '@mui/material'
import { Layout } from '../components/ui/Layout'
import { useUserStore } from '../store/user/UserStore';
import { TypographyCustom } from '../components/custom';
import { useEffect } from 'react';
import { Widget } from '../components/widgets/Widget';
import { Loading } from '../components/ui/content/Loading';
import Masonry from '@mui/lab/Masonry';

export const Dashboard = () => {
    const user = useUserStore(state => state.user);
    const validateToken = useUserStore((state) => state.validateToken);
    const validarSesion = async () => {
        const result = await validateToken();
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
            <Masonry columns={{ xs: 1, sm: 3, md: 4 }} spacing={2}>
                <Widget title='Widget 1'>
                    <TypographyCustom variant='body1' >Ultimas 5 ventas</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >29/08/2025</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >28/08/2025</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >27/08/2025</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >26/08/2025</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >25/08/2025</TypographyCustom>
                </Widget>
                <Widget title='Widget 2'>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 1</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 2</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                </Widget>
                <Widget title='Widget 3'>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 1</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 2</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                </Widget>
                <Widget title='Widget 4'>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 1</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 2</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                </Widget>
                <Widget title='Widget 5'>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 1</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 2</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                </Widget>
                <Widget title='Widget 6'>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 1</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                </Widget>
                <Widget title='Widget 7'>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 1</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                </Widget>
                <Widget title='Widget 8'>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 1</TypographyCustom>
                    <TypographyCustom variant='body2' color='text.secondary' >Persona 3</TypographyCustom>
                </Widget>
            </Masonry>
        </Layout>
    )
}
