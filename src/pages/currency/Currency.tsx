import { Box, Grid, Toolbar } from '@mui/material';
import { useEffect, useState } from 'react';
import { ButtonCustom, TextFieldCustom, TypographyCustom } from '../../components/custom';
import { Loading } from '../../components/ui/content/Loading';
import { Layout } from '../../components/ui/Layout';
import { useUserStore } from '../../store/user/UserStore';
import { NumericFormat } from 'react-number-format';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { toast } from 'react-toastify';
import { Form, Formik } from 'formik';
import { useValidateSession } from '../../hooks/useValidateSession';

type CurrencyRate = {
    id: number;
    description: string;
    value: number;
    created_at: string;
};

const DESCRIPTIONS = {
    BCV_USD: 'DOLAR BCV',
    BINANCE_USD: 'DOLAR BINANCE',
    BCV_EUR: 'BCV EURO',
};

export const Currency = () => {
    const { user } = useUserStore.getState();
    const [rates, setRates] = useState<CurrencyRate[]>([]);
    const { loadingSession, isValid, user: authUser } = useValidateSession();

    const [loading, setLoading] = useState(false);

    const getCurrency = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/currency', 'GET');
            if (status === 200) {
                const { data } = await response.json();
                setRates(data ?? []);
            } else {
                toast.error('No se logró obtener las tasas');
            }
        } catch (err) {
            console.error(err);
            console.log({ err })
            toast.error('No se logró conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getCurrency();
    }, []);

    const getRate = (description: string) =>
        rates.find(r => r.description === description);

    const isToday = (created_at?: string) => {
        if (!created_at) return false;
        const d = new Date(created_at);
        const now = new Date();
        return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
        );
    };

    const handleSubmitRate = async (
        description: string,
        value: number,
        resetForm: () => void
    ) => {
        const body = new URLSearchParams();
        body.append('value', value.toString().replace('Bs', ''));
        body.append('description', description);
        console.log(String(value))
        try {
            const { status, response }: IResponse = await request('/currency', 'PUT', body);
            switch (status) {
                case 200: {
                    const { data } = await response.json();
                    // Actualizamos solo esa tasa en el estado
                    setRates(prev => {
                        const exists = prev.find(r => r.id === data.id);
                        if (exists) {
                            return prev.map(r => (r.id === data.id ? data : r));
                        }
                        return [...prev, data];
                    });
                    toast.success(`Tasa ${description} actualizada correctamente`);
                    resetForm();
                    break;
                }
                case 400:
                    toast.error('No se logró actualizar la divisa');
                    break;
                default:
                    toast.error('No se logró conectar con el servidor');
                    break;
            }
        } catch (err) {
            console.error(err);
            toast.error('Error al enviar la tasa');
        }
    };

    const usdBcv = getRate(DESCRIPTIONS.BCV_USD);
    const usdBinance = getRate(DESCRIPTIONS.BINANCE_USD);
    const eurBcv = getRate(DESCRIPTIONS.BCV_EUR);


    if (loadingSession || !isValid || !authUser.token) {
        return <Loading />;
    }
    return (
        <Layout>
            <Toolbar />
            <TypographyCustom fontWeight={'bold'} variant='h4'>
                Tasas del día
            </TypographyCustom>
            <TypographyCustom color={'text.secondary'} variant='body1'>
                Aquí podrás cambiar el valor de las tasas y consultar el valor actual por cada tipo.
            </TypographyCustom>

            {/* Tasa actual */}
            <Box
                sx={{
                    mt: 2,
                    width: '100%',
                    display: 'flex',
                    flexFlow: 'column wrap',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    p: 2,
                }}
            >
                <Grid container spacing={2}>
                    {/* DÓLAR BCV */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Box
                            sx={{
                                width: '100%',
                                p: 2,
                                boxShadow: `0 8px 16px ${user.color}20`,
                                borderRadius: 2,
                                background: (theme) =>
                                    theme.palette.mode === 'dark' ? `${user.color}20` : '#FFF',
                                display: 'flex',
                                flexFlow: 'column nowrap',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <TypographyCustom variant='h5' fontWeight={'bold'}>
                                DÓLAR BCV
                            </TypographyCustom>
                            <TypographyCustom>
                                Bs. {usdBcv ? usdBcv.value : '—'}
                            </TypographyCustom>
                            <TypographyCustom variant='subtitle2'>
                                por cada USD
                            </TypographyCustom>
                            {usdBcv && (
                                <TypographyCustom
                                    variant='subtitle2'
                                    color={isToday(usdBcv.created_at) ? 'success' : 'warning'}
                                >
                                    {`${isToday(usdBcv.created_at) ? '✅' : '⚠️'
                                        } Actualizado el ${new Date(
                                            usdBcv.created_at
                                        ).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}`}
                                </TypographyCustom>
                            )}
                        </Box>
                    </Grid>

                    {/* DÓLAR BINANCE */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Box
                            sx={{
                                width: '100%',
                                p: 2,
                                boxShadow: `0 8px 16px ${user.color}20`,
                                borderRadius: 2,
                                background: (theme) =>
                                    theme.palette.mode === 'dark' ? `${user.color}20` : '#FFF',
                                display: 'flex',
                                flexFlow: 'column nowrap',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <TypographyCustom variant='h5' fontWeight={'bold'}>
                                DÓLAR BINANCE
                            </TypographyCustom>
                            <TypographyCustom>
                                Bs. {usdBinance ? usdBinance.value : '—'}
                            </TypographyCustom>
                            <TypographyCustom variant='subtitle2'>
                                por cada USD
                            </TypographyCustom>
                            {usdBinance && (
                                <TypographyCustom
                                    variant='subtitle2'
                                    color={isToday(usdBinance.created_at) ? 'success' : 'warning'}
                                >
                                    {`${isToday(usdBinance.created_at) ? '✅' : '⚠️'
                                        } Actualizado el ${new Date(
                                            usdBinance.created_at
                                        ).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}`}
                                </TypographyCustom>
                            )}
                        </Box>
                    </Grid>

                    {/* EURO BCV */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Box
                            sx={{
                                width: '100%',
                                p: 2,
                                boxShadow: `0 8px 16px ${user.color}20`,
                                borderRadius: 2,
                                background: (theme) =>
                                    theme.palette.mode === 'dark' ? `${user.color}20` : '#FFF',
                                display: 'flex',
                                flexFlow: 'column nowrap',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <TypographyCustom variant='h5' fontWeight={'bold'}>
                                EURO BCV
                            </TypographyCustom>
                            <TypographyCustom>
                                Bs. {eurBcv ? eurBcv.value : '—'}
                            </TypographyCustom>
                            <TypographyCustom variant='subtitle2'>
                                por cada EUR
                            </TypographyCustom>
                            {eurBcv && (
                                <TypographyCustom
                                    variant='subtitle2'
                                    color={isToday(eurBcv.created_at) ? 'success' : 'warning'}
                                >
                                    {`${isToday(eurBcv.created_at) ? '✅' : '⚠️'
                                        } Actualizado el ${new Date(
                                            eurBcv.created_at
                                        ).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}`}
                                </TypographyCustom>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Box>

            {/* Formularios para actualizar */}
            <Box
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexFlow: 'column wrap',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    p: 2,
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        mt: 1,
                        p: 2,
                        gap: 2,
                        boxShadow: `0 8px 16px ${user.color}20`,
                        borderRadius: 2,
                        background: (theme) =>
                            theme.palette.mode === 'dark' ? `${user.color}20` : '#FFF',
                        display: 'flex',
                        flexFlow: 'column nowrap',
                        alignItems: 'center',
                    }}
                >
                    <TypographyCustom variant='h5' fontWeight={'bold'}>
                        Actualizar valores
                    </TypographyCustom>

                    <Grid container spacing={2}>
                        {/* Form Dólar BCV */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Formik
                                initialValues={{ value: '' }}
                                onSubmit={(values, { resetForm }) =>
                                    handleSubmitRate(
                                        DESCRIPTIONS.BCV_USD,
                                        Number(values.value || 0),
                                        () => resetForm()
                                    )
                                }
                            >
                                {({ values, handleChange, handleSubmit }) => (
                                    <Form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSubmit();
                                        }}
                                    >
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12 }}>
                                                <NumericFormat
                                                    customInput={TextFieldCustom}
                                                    size='small'
                                                    value={values.value}
                                                    label='Dólar BCV (Bs)'
                                                    name='value'
                                                    allowLeadingZeros={false}
                                                    decimalScale={2}
                                                    fixedDecimalScale
                                                    prefix={'Bs '}
                                                    allowNegative={false}
                                                    valueIsNumericString
                                                    thousandSeparator={false}
                                                    onChange={handleChange}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <ButtonCustom type='submit' variant='contained' fullWidth>
                                                    Actualizar
                                                </ButtonCustom>
                                            </Grid>
                                        </Grid>
                                    </Form>
                                )}
                            </Formik>
                        </Grid>

                        {/* Form Dólar Binance */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Formik
                                initialValues={{ value: '' }}
                                onSubmit={(values, { resetForm }) =>
                                    handleSubmitRate(
                                        DESCRIPTIONS.BINANCE_USD,
                                        Number(values.value || 0),
                                        () => resetForm()
                                    )
                                }
                            >
                                {({ values, handleChange, handleSubmit }) => (
                                    <Form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSubmit();
                                        }}
                                    >
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12 }} >
                                                <NumericFormat
                                                    customInput={TextFieldCustom}
                                                    size='small'
                                                    value={values.value}
                                                    label='Dólar Binance (Bs)'
                                                    name='value'
                                                    allowLeadingZeros={false}
                                                    decimalScale={2}
                                                    fixedDecimalScale
                                                    prefix={'Bs '}
                                                    allowNegative={false}
                                                    valueIsNumericString
                                                    thousandSeparator={false}
                                                    onChange={handleChange}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <ButtonCustom type='submit' variant='contained' fullWidth>
                                                    Actualizar
                                                </ButtonCustom>
                                            </Grid>
                                        </Grid>
                                    </Form>
                                )}
                            </Formik>
                        </Grid>

                        {/* Form Euro BCV */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Formik
                                initialValues={{ value: '' }}
                                onSubmit={(values, { resetForm }) =>
                                    handleSubmitRate(
                                        DESCRIPTIONS.BCV_EUR,
                                        Number(values.value || 0),
                                        () => resetForm()
                                    )
                                }
                            >
                                {({ values, handleChange, handleSubmit }) => (
                                    <Form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSubmit();
                                        }}
                                    >
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12 }}>
                                                <NumericFormat
                                                    customInput={TextFieldCustom}
                                                    size='small'
                                                    value={values.value}
                                                    label='Euro BCV (Bs)'
                                                    name='value'
                                                    allowLeadingZeros={false}
                                                    decimalScale={2}
                                                    fixedDecimalScale
                                                    prefix={'Bs '}
                                                    allowNegative={false}
                                                    valueIsNumericString
                                                    thousandSeparator={false}
                                                    onChange={handleChange}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12 }}>
                                                <ButtonCustom type='submit' variant='contained' fullWidth>
                                                    Actualizar
                                                </ButtonCustom>
                                            </Grid>
                                        </Grid>
                                    </Form>
                                )}
                            </Formik>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Layout>
    );
};