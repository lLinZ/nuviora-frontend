import { Avatar, Box, CircularProgress } from '@mui/material'
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista'
import { Layout } from '../../components/ui/Layout'
import { useUserStore } from '../../store/user/UserStore';
import { request } from '../../common/request';
import { useEffect, useState } from 'react';
import { TypographyCustom } from '../../components/custom';
import { ColorPicker } from '../../components/profile/ColorPicker';
import { ThemeChanger } from '../../components/profile/ThemeChanger';
import { Loading } from '../../components/ui/content/Loading';

export const Profile = () => {
    const user = useUserStore(state => state.user);
    const validateToken = useUserStore((state) => state.validateToken);
    const [data, setData] = useState<any>([]);
    const getUserData = async () => {
        const result = await request('/user/data', 'GET');
        console.log({ result });
        switch (result.status) {
            case 200:
                setData(result.response);
                break;
            default:
                break;
        }

    }
    const validarSesion = async () => {
        const result = await validateToken();
        console.log({ result });
        if (!result.status) return window.location.href = '/';
    }
    useEffect(() => {
        validarSesion();
        getUserData()
    }, [])
    if (!user.token) return (<Loading />)
    return (
        <Layout>
            <DescripcionDeVista title={'Perfil'} description={'Aqui podras ver tus datos personales, editar, entre otras cosas mas!'} />
            <Box sx={{ gap: 2, display: 'flex', flexFlow: 'row wrap' }}>

                <Box sx={{ paddingBlock: 2, border: `2px solid ${user.color}30`, borderRadius: 5, display: 'flex', justifyContent: 'start', alignItems: 'start', flexFlow: 'column wrap', width: '100%' }}>
                    <Box sx={{ display: 'flex', flexFlow: 'column nowrap', justifyContent: 'center', alignItems: 'center', margin: 'auto' }}>
                        <Avatar sx={{ width: 100, height: 100, fontSize: 50, background: user.color, color: (theme) => theme.palette.getContrastText(user.color) }}>{`${user.names.charAt(0)}${user.surnames.charAt(0)}`}</Avatar>
                        <TypographyCustom variant="h6" fontWeight={'bold'}>{`${user.names}`}</TypographyCustom>
                        <TypographyCustom variant="h6" fontWeight={'bold'}>{`${user.surnames}`}</TypographyCustom>
                    </Box>
                    <Box sx={{ display: 'flex', flexFlow: 'column wrap', justifyContent: 'center', alignItems: 'center', gap: 1, margin: 'auto' }}>
                        <TypographyCustom>Cambiar color</TypographyCustom>
                        <ColorPicker />
                    </Box>
                    <Box sx={{ display: 'flex', flexFlow: 'column wrap', justifyContent: 'center', alignItems: 'center', gap: 1, margin: 'auto', }}>
                        <TypographyCustom>Cambiar modo</TypographyCustom>
                        <ThemeChanger />
                    </Box>
                </Box>
                <Box sx={{ paddingBlock: 2, border: `2px solid ${user.color}30`, borderRadius: 5, display: 'flex', flexFlow: 'column nowrap', width: '100%' }}>
                    <Box sx={{ p: 2 }}>
                        <TypographyCustom variant="h6" fontWeight={'bold'}>Datos personales</TypographyCustom>
                        <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 0, pb: 1, pt: 2 }}>
                            <TypographyCustom variant="subtitle2" fontWeight={'bold'}>Nombre</TypographyCustom>
                            <TypographyCustom variant="subtitle2">{user.names}</TypographyCustom>
                        </Box>
                        <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 0, pb: 1 }}>
                            <TypographyCustom variant="subtitle2" fontWeight={'bold'}>Apellidos</TypographyCustom>
                            <TypographyCustom variant="subtitle2">{user.surnames}</TypographyCustom>
                        </Box>
                        <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 0, pb: 1 }}>
                            <TypographyCustom variant="subtitle2" fontWeight={'bold'}>Correo</TypographyCustom>
                            <TypographyCustom variant="subtitle2">{user.email}</TypographyCustom>
                        </Box>
                        <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 0, pb: 1 }}>
                            <TypographyCustom variant="subtitle2" fontWeight={'bold'}>Telefono</TypographyCustom>
                            <TypographyCustom variant="subtitle2">{user.phone}</TypographyCustom>
                        </Box>
                        <Box sx={{ display: 'flex', flexFlow: 'column nowrap', gap: 0, pb: 1 }}>
                            <TypographyCustom variant="subtitle2" fontWeight={'bold'}>Direccion</TypographyCustom>
                            <TypographyCustom variant="subtitle2">{user.address}</TypographyCustom>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Layout >
    )
}
