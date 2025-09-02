import { useState, useMemo, ReactNode, FC } from "react";
import { Box, darken, IconButton, useMediaQuery, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import KeyboardArrowRightRounded from '@mui/icons-material/KeyboardArrowRightRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import KeyboardArrowLeftRounded from '@mui/icons-material/KeyboardArrowLeftRounded';
import moment from "moment";
import { TypographyCustom } from "../../custom";
import { useUserStore } from "../../../store/user/UserStore";
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
const Clock = () => {
    const [time, setTime] = useState<string>(moment().format("h:mm A"));
    useMemo(() => {
        setInterval(() => { setTime(moment().format("h:mm A")) }, 1000)
    }, [setTime]);
    const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexFlow: 'column wrap', padding: 2, }}>
            <TypographyCustom variant="h3" fontmode={5} style={{ whiteSpace: 'nowrap' }} fontWeight={'bold'}>{time}</TypographyCustom>
            <TypographyCustom variant="h5" fontmode={5} color="text.secondary" fontWeight={'bold'}>{days[moment().day() - 1]}</TypographyCustom>
            <TypographyCustom variant="h6" fontmode={5} color="text.secondary">{`${moment().date()} de ${months[moment().month()]}, ${moment().year()}`}</TypographyCustom>
        </Box>
    )
}

const links = [
    { text: 'Dashboard', icon: <DashboardRoundedIcon />, link: '/dashboard' },
    { text: 'Usuarios', icon: <GroupsRoundedIcon />, link: '/users' },
    { text: 'Ordenes', icon: <LocalShippingRoundedIcon />, link: '/orders' },
    { text: 'Tasa de dólar', icon: <AttachMoneyRoundedIcon />, link: '/currency' },
]
/**
 * Este componente se encarga del menu lateral izquierdo
 */
export const SideBar = () => {
    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.up('md'));
    const [open, setOpen] = useState<boolean>(matches)
    const user = useUserStore(state => state.user);
    const userLogout = useUserStore(state => state.logout);
    const navigate = useNavigate();
    const onClick = () => {
        setOpen(!open);
    }
    const logout = async () => {
        const result = await userLogout();
        console.log({ result })
        if (result) return window.location.href = '/';
    }
    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100vh', overflow: 'auto', minWidth: { xs: 50, md: open ? 250 : 50 }, width: { xs: 50, md: open ? 250 : 50 }, background: (theme) => theme.palette.mode === 'dark' ? darken(user.color, 0.9) : `${user.color}05`, position: 'sticky', top: 0, left: 0, borderRight: `2px solid ${user.color}30` }}>
                <Box sx={{
                    minHeight: '100vh', maxHeight: '100vh', overflowY: 'scroll', display: 'flex', flexFlow: 'column nowrap', alignItems: 'center', gap: 1, pb: 2,
                    '&::-webkit-scrollbar': {
                        width: '0.1em'
                    },
                    '&::-webkit-scrollbar-track': {
                        boxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)',
                        webkitBoxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)'
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: 'rgba(0,0,0,.1)',
                    }
                }}>
                    <Box sx={{ display: 'flex', flexFlow: 'column wrap', alignItems: 'center', width: '100%', gap: 1 }}>
                        <Box sx={{ display: 'flex', flexFlow: 'row-reverse wrap', justifyContent: 'center', alignItems: 'center', width: '100%', gap: 1, pt: 1 }}>
                            <IconButton sx={{ alignSelf: 'flex-end' }} onClick={onClick}>
                                {matches && (open ? <KeyboardArrowLeftRounded /> : <KeyboardArrowRightRounded />)}
                            </IconButton>
                            <IconButton sx={{ alignSelf: 'flex-end', background: window.location.pathname === '/profile' ? `${user.color}30` : 'transparent', color: (theme) => theme.palette.mode === 'dark' ? '#FFF' : '#000' }} onClick={() => navigate('/profile')}>
                                <ManageAccountsRoundedIcon />
                            </IconButton>
                            <IconButton sx={{ alignSelf: 'flex-end' }} onClick={() => logout()}>
                                <LogoutRoundedIcon color="error" />
                            </IconButton>
                        </Box>

                        {matches && open && <Clock />}
                        {links.map((data, i) => (<SideBarLink open={open} key={i} icon={data.icon} text={data.text} link={data.link} matches={matches} />))}
                    </Box>
                </Box>
            </Box>
        </>
    )
}
interface SideBarLinkProps {
    icon: ReactNode;
    text: string;
    link: string;
    open: boolean;
    matches: boolean;
}
const SideBarLink: FC<SideBarLinkProps> = ({ icon, text, link, open, matches }) => {
    const navigate = useNavigate();
    const onClick = (link: string) => {
        navigate(link);
    }
    const user = useUserStore((state) => state.user);
    return (
        <Box
            sx={{
                outline: 'none',
                borderRadius: '100em',
                background: link === window.location.pathname ? `${user.color}19` : 'transparent',
                color: (theme) => theme.palette.mode === 'dark' ? '#FFF' : '#000',
                width: matches && open ? '90%' : 40,
                height: matches && open ? 'auto' : 40,
                p: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'start',
                flexFlow: 'row nowrap',
                gap: 1,
                transition: '0.2s ease all',
                '&:hover': {
                    background: `${user.color}19`,
                    color: (theme) => theme.palette.mode === 'dark' ? '#FFF' : '#000'
                }
            }}
            onClick={() => onClick(link)}
        >
            {icon}
            {matches && open && <TypographyCustom variant="subtitle2">{text}</TypographyCustom>}
        </Box >
    )
}