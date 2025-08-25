import Box from '@mui/material/Box'
import { Bounce, ToastContainer } from 'react-toastify';
import { SignInCard } from '../../components/auth/SingInCard';
import { Content } from '../../components/auth/Content';
import { useUserStore } from '../../store/user/UserStore';

export const Login = () => {
    const user = useUserStore(state => state.user)
    return (
        <>
            <ToastContainer
                stacked
                toastClassName="Toastify__toast"
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                transition={Bounce}
            />
            <Box sx={{
                width: '100%',
                minHeight: '100vh',
                height: '100%',
                display: 'flex',
                flexDirection: { xs: 'column-reverse', md: 'row' },
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <Box sx={{
                    width: { xs: "100%", md: "50%" }, minHeight: '100vh', height: '100%',
                    backgroundColor: user.darken,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: 2,
                    backgroundImage: `url(/img/hexagons.webp)`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                    backgroundRepeat: 'repeat'
                }}>
                    <Content />
                </Box>
                <Box sx={{ width: { xs: "100%", md: "50%" }, minHeight: '100vh', height: '100%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SignInCard />
                </Box>
            </Box>
        </>

    )
}

