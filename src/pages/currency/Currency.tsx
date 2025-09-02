import { Box, Toolbar } from '@mui/material'
import { useEffect, useState } from 'react';
import { TypographyCustom } from '../../components/custom';
import { Loading } from '../../components/ui/content/Loading';
import { Layout } from '../../components/ui/Layout';
import { useUserStore } from '../../store/user/UserStore';


const initial_currency = { value: '5.25', date: '29/08/2025' };
export const Currency = () => {
    const user = useUserStore(state => state.user);
    const [currency, setCurrency] = useState<any>(initial_currency);

    const changeCurrency = (newCurrency: string) => {
        if (!newCurrency) return;
        if (isNaN(Number(newCurrency))) return;
        setCurrency({ value: newCurrency, date: new Date().toLocaleDateString() });

    }

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
            <TypographyCustom fontWeight={'bold'} variant='h4'>Tasa de dolar</TypographyCustom>
            <TypographyCustom color={'text.secondary'} variant='body1'>Aquí podras cambiar el valor de la tasa del dolar y consultar el valor actual</TypographyCustom>
            <Box sx={{ mt: 2, width: '100%', display: 'flex', flexFlow: 'column wrap', justifyContent: 'flex-start', alignItems: 'flex-start', p: 2 }}>
                <Box sx={{ mt: 1, p: 2, boxShadow: `0 8px 16px ${user.color}20`, borderRadius: 2, background: (theme) => theme.palette.mode === 'dark' ? `${user.color}20` : '#FFF', display: 'flex', flexFlow: 'column nowrap', alignItems: 'center', gap: 2 }}>
                    <TypographyCustom variant='h5' fontWeight={'bold'}>Tasa actual</TypographyCustom>
                    <TypographyCustom>Bs. {currency.value}</TypographyCustom>
                    <TypographyCustom variant='subtitle2'>por cada USD</TypographyCustom>
                    <TypographyCustom variant='subtitle2' color='text.secondary'>Actualizado el {currency.date}</TypographyCustom>
                </Box>
            </Box>
        </Layout>
    )
}
