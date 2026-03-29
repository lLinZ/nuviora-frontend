import { FC } from 'react';
import { Box, darken, lighten } from '@mui/material';
// import { Footer } from './footer';

import { Bounce, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useUserStore } from '../../store/user/UserStore';
import { SideBar } from './nav';
import { NotificationMonitor } from './notifications/NotificationMonitor';
import { BroadcastMonitor } from './notifications/BroadcastMonitor';
type Props = {
    children: React.ReactNode;
    noMargin?: boolean;
    container?: boolean;
}

export const Layout: FC<Props> = ({ children, container = true, noMargin = false }) => {
    const user = useUserStore((state) => state.user);
    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', justifyContent: 'space-between' }}>
            <NotificationMonitor />
            <BroadcastMonitor />
            <SideBar />
            <Box sx={{
                flex: 1,
                minHeight: '100vh',
                p: noMargin ? 0 : 2,
                background: (theme) => theme.palette.mode === 'dark' ? darken(user.color, 0.9) : lighten(user.color, 0.97),
                overflowX: 'hidden'
            }}>
                {children}
            </Box>
            {/* <Footer /> */}
            <ToastContainer
                stacked
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={useUserStore.getState().user.theme}
                transition={Bounce}
            />
        </Box >
    )
}

