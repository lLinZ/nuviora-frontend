import EmailRounded from "@mui/icons-material/EmailRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import Typography from "@mui/material/Typography";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";

import { FormikState, Form, Formik } from "formik";
import { toast } from "react-toastify";
import { useUserStore } from "../../store/user/UserStore";
import { TypographyCustom, TextFieldCustom, ButtonCustom } from "../custom";
import { useState } from "react";
import { CircularProgress, darken, Dialog } from "@mui/material";
import { Loading } from "../ui/content/Loading";

const initialValues: FormData = {
    email: '',
    password: '',
}
interface FormData {
    email: string;
    password: string;
}
export const SignInCard = () => {
    const [loading, setLoading] = useState<boolean>(false)
    const user = useUserStore((state) => state.user);
    const login = useUserStore((state) => state.login);
    const onSubmit = async (values: FormData, resetForm: (nextState?: Partial<FormikState<FormData>> | undefined) => void) => {
        setLoading(true)
        const result = await login(values.email, values.password);
        if (result.status) {
            resetForm()
            toast.success(result.message)
            setTimeout(() => {
                window.location.href = '/dashboard'
            }, 2000)
        } else {
            toast.error(result.message);
            setLoading(false)
        }

    }
    return (
        <Box sx={{ minWidth: 500, padding: 13 }}>
            {loading && (<Loading />)}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: { xs: '100%', md: '60%' }, margin: 'auto' }}>
                <img src='/logo.png' height='120px' width="100%" style={{ borderRadius: '10px' }} />
            </Box>
            <TypographyCustom
                textAlign={'center'}
                component="h1"
                variant="h4"
                fontWeight={'bold'}
                sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)', mb: 2 }}
            >
                Iniciar sesion
            </TypographyCustom>
            <Formik
                initialValues={initialValues}
                onSubmit={(values, { resetForm }) => onSubmit(values, resetForm)}
            >
                {({ handleSubmit, handleChange, values }) => (
                    <Form onSubmit={handleSubmit}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}>
                            <FormControl sx={{ gap: 1 }}>
                                <FormLabel htmlFor="email" sx={{ fontWeight: 'bold', gap: 1, display: 'flex', alignItems: 'center' }}><EmailRounded />Correo electronico</FormLabel>
                                <TextFieldCustom
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="ejemplo@email.com"
                                    autoComplete="email"
                                    value={values.email}
                                    autoFocus
                                    required
                                    fullWidth
                                    onChange={handleChange}
                                />
                            </FormControl>
                            {/* <TextFieldCustom name="email" label='Correo' value={values.email} onChange={handleChange} fullWidth /> */}

                            <FormControl sx={{ gap: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <FormLabel htmlFor="password" sx={{ fontWeight: 'bold', gap: 1, display: 'flex', alignItems: 'center' }}><LockRounded />Contraseña</FormLabel>
                                    <Typography sx={{ textAlign: 'end' }}>
                                        <span>
                                            <Link
                                                href="/recover-password"
                                                variant="subtitle2"
                                                sx={{ alignSelf: 'flex-end', fontSize: 12 }}
                                            >
                                                Recuperar contraseña
                                            </Link>
                                        </span>
                                    </Typography>
                                </Box>
                                <TextFieldCustom
                                    id="password"
                                    type="password"
                                    name="password"
                                    placeholder="•••••••••••••••"
                                    autoComplete="password"
                                    value={values.password}
                                    autoFocus
                                    required
                                    fullWidth
                                    onChange={handleChange}
                                />
                            </FormControl>
                            <ButtonCustom variant="contained" fullWidth type='submit'>Iniciar sesion</ButtonCustom>
                            <Typography sx={{ textAlign: 'center' }}>
                                ¿No tienes cuenta?{' '}
                                <span>
                                    <Link
                                        href="/register"
                                        variant="body2"
                                        sx={{ alignSelf: 'center' }}
                                    >
                                        Crear cuenta
                                    </Link>
                                </span>
                            </Typography>
                        </Box>
                    </Form>
                )}
            </Formik>
        </Box>
    )

}