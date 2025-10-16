import { Box, Grid, Toolbar } from '@mui/material'
import { ChangeEvent, useEffect, useState } from 'react';
import { ButtonCustom, TextFieldCustom, TypographyCustom } from '../../components/custom';
import { Loading } from '../../components/ui/content/Loading';
import { Layout } from '../../components/ui/Layout';
import { useUserStore } from '../../store/user/UserStore';
import { NumericFormat } from 'react-number-format'
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { toast } from 'react-toastify';
import { Form, Formik } from 'formik';

const currencyLocal = { value: 0 };
export const Currency = () => {
    const user = useUserStore(state => state.user);
    const [currency, setCurrency] = useState<any>({});
    const getCurrency = async () => {
        const { status, response, err }: IResponse = await request('/currency', 'GET');
        switch (status) {
            case 200:
                const { data } = await response.json()
                if (data.length > 0) {
                    setCurrency({ value: data[0].value, created_at: data[0].created_at, id: data[0].id, description: data[0].description })
                }
                console.log({ data })

                break;
            case 400:
                toast.error('No se logro obtener la divisa')
                break;
            default:
                toast.error('No se logro conectar con el servidor')
                break;
        }
    }
    useEffect(() => {
        getCurrency();
    }, [])
    const validateToken = useUserStore((state) => state.validateToken);
    const validarSesion = async () => {
        const result = await validateToken();
        if (!result.status) return window.location.href = '/';
    }

    const onSubmit = async (values: any, resetForm: any) => {
        const { value } = values;
        const data: { value: number, description: string } = { value, description: 'Dolar' };
        const body = new URLSearchParams();
        body.append('value', data.value.toString().replace('Bs', ''));
        body.append('description', data.description);
        const { status, response }: IResponse = await request('/currency', 'POST', body);
        switch (status) {
            case 200:
                const { data } = await response.json()
                setCurrency(data)
                toast.success('Tasa actualizada correctamente')
                resetForm()
                break;
            case 400:
                console.log(await response.json())
                toast.error('No se logro actualizar la divisa')
                break;
            default:
                toast.error('No se logro conectar con el servidor')
                break;
        }
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
                <Box sx={{ width: '100%', mt: 1, p: 2, boxShadow: `0 8px 16px ${user.color}20`, borderRadius: 2, background: (theme) => theme.palette.mode === 'dark' ? `${user.color}20` : '#FFF', display: 'flex', flexFlow: 'column nowrap', alignItems: 'center', gap: 2 }}>
                    <TypographyCustom variant='h5' fontWeight={'bold'}>Tasa actual</TypographyCustom>
                    <TypographyCustom>Bs. {currency && currency.value}</TypographyCustom>
                    <TypographyCustom variant='subtitle2'>por cada USD</TypographyCustom>
                    <TypographyCustom variant='subtitle2' color={new Date(currency.created_at).getDate() === new Date().getDate() ? 'success' : 'warning'}>{`${new Date(currency.created_at).getDate() === new Date().getDate() ? '✅' : '⚠️'} Actualizado el ${new Date(currency.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    })}`}</TypographyCustom>
                </Box>
            </Box>
            <Box sx={{ width: '100%', display: 'flex', flexFlow: 'column wrap', justifyContent: 'flex-start', alignItems: 'flex-start', p: 2 }}>
                <Box sx={{ width: '100%', mt: 1, p: 2, gap: 2, boxShadow: `0 8px 16px ${user.color}20`, borderRadius: 2, background: (theme) => theme.palette.mode === 'dark' ? `${user.color}20` : '#FFF', display: 'flex', flexFlow: 'column nowrap', alignItems: 'center' }}>
                    <TypographyCustom variant='h5' fontWeight={'bold'}>Actualizar valor</TypographyCustom>
                    <Formik
                        initialValues={currencyLocal}
                        onSubmit={(values, { resetForm }) => onSubmit(values, resetForm)}
                    >
                        {({ values, handleChange, handleSubmit }) => (

                            <Form onSubmit={(e) => {
                                e.preventDefault();
                                handleSubmit()
                                console.log({ values })
                            }}>

                                <Grid container spacing={2}>
                                    <Grid size={12}>
                                        <NumericFormat
                                            customInput={TextFieldCustom}
                                            size="small"
                                            value={values.value}
                                            label="Valor en bolívares"
                                            name="value"
                                            allowLeadingZeros={false}
                                            decimalScale={2}
                                            fixedDecimalScale={true}
                                            prefix={'Bs'}
                                            allowNegative={false}
                                            valueIsNumericString={true}
                                            thousandSeparator={false}
                                            onChange={handleChange}
                                        />
                                    </Grid>
                                    <Grid size={12}>
                                        <ButtonCustom type='submit' variant='contained'>Actualizar</ButtonCustom>
                                    </Grid>
                                </Grid>
                            </Form>
                        )}
                    </Formik>
                </Box>
            </Box>
        </Layout>
    )
}
