import { useState, useEffect, ReactNode, FC, useMemo } from "react";
import { Box, darken, IconButton, useMediaQuery, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import KeyboardArrowRightRounded from "@mui/icons-material/KeyboardArrowRightRounded";
import KeyboardArrowLeftRounded from "@mui/icons-material/KeyboardArrowLeftRounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import EngineeringRoundedIcon from "@mui/icons-material/EngineeringRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import DoNotDisturbAltRoundedIcon from "@mui/icons-material/DoNotDisturbAltRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalMallRoundedIcon from "@mui/icons-material/LocalMallRounded";
// import AssignmentIndRoundedIcon from "@mui/icons-material/AssignmentIndRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";

import moment from "moment";
import { TypographyCustom } from "../../custom";
import { useUserStore } from "../../../store/user/UserStore";
import { AssignmentReturnRounded, StoreRounded, HistoryRounded, SwapHorizRounded, EditNoteRounded, StorefrontRounded, PollRounded, MapRounded, PaymentRounded, AccountBalanceRounded, ReceiptLongRounded } from "@mui/icons-material";
import { NotificationBell } from "../notifications/NotificationBell";

const Clock = () => {
    const [time, setTime] = useState<string>(moment().format("h:mm A"));

    useEffect(() => {
        const id = setInterval(() => {
            setTime(moment().format("h:mm A"));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    const days = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
    const months = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
    ];

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexFlow: "column wrap",
                padding: 2,
            }}
        >
            <TypographyCustom
                variant="h3"
                fontmode={5}
                style={{ whiteSpace: "nowrap" }}
                fontWeight={"bold"}
            >
                {time}
            </TypographyCustom>
            <TypographyCustom variant="h5" fontmode={5} color="text.secondary" fontWeight={"bold"}>
                {days[moment().day() - 1]}
            </TypographyCustom>
            <TypographyCustom variant="h6" fontmode={5} color="text.secondary">
                {`${moment().date()} de ${months[moment().month()]}, ${moment().year()}`}
            </TypographyCustom>
        </Box>
    );
};

type NavLink = {
    text: string;
    icon: ReactNode;
    link: string;
    roles?: string[]; // descriptions: 'Admin' | 'Gerente' | 'Vendedor' | 'Repartidor'
};

/**
 * Este componente se encarga del menu lateral izquierdo
 */
export const SideBar = () => {
    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.up("md"));
    const [open, setOpen] = useState<boolean>(matches);
    const user = useUserStore((state) => state.user);
    const userLogout = useUserStore((state) => state.logout);
    const navigate = useNavigate();

    const roleDesc = user.role?.description ?? "Vendedor";

    const links: NavLink[] = useMemo(
        () => [
            {
                text: "Dashboard",
                icon: <DashboardRoundedIcon />,
                link: "/dashboard",
                roles: ["Admin", "Gerente", "Vendedor", "Repartidor", "Agencia"],
            },
            {
                text: "Usuarios",
                icon: <GroupsRoundedIcon />,
                link: "/users",
                roles: ["Admin", "Gerente"],
            },
            {
                text: "Órdenes",
                icon: <LocalShippingRoundedIcon />,
                link: "/orders",
                roles: ["Admin", "Gerente", "Vendedor", "Repartidor", "Agencia"],
            },
            {
                text: "Órdenes canceladas",
                icon: <DoNotDisturbAltRoundedIcon />,
                link: "/orders/cancelled",
                roles: ["Admin", "Gerente"],
            },
            {
                text: "Inventario",
                icon: <Inventory2RoundedIcon />,
                link: "/inventory",
                roles: ["Admin", "Agencia"],
            },
            {
                text: "Stock repartidor",
                icon: <LocalMallRoundedIcon />,
                link: "/deliverers/stock",
                roles: ["Repartidor"],
            },
            {
                text: "Repartidores",
                icon: <EngineeringRoundedIcon />,
                link: "/deliverers",
                roles: ["Admin"],
            },
            {
                text: "Ciudades y Agencias",
                icon: <MapRounded />,
                link: "/cities",
                roles: ["Admin", "Gerente"],
            },
            {
                text: "Cuentas Empresa",
                icon: <PaymentRounded />,
                link: "/admin/company-accounts",
                roles: ["Admin", "Gerente"],
            },
            {
                text: "Bancos",
                icon: <AccountBalanceRounded />,
                link: "/admin/banks",
                roles: ["Admin", "Gerente"],
            },
            {
                text: "Vueltos Pendientes",
                icon: <ReceiptLongRounded />,
                link: "/admin/pending-vueltos",
                roles: ["Admin", "Gerente"],
            },
            {
                text: "Tasa de dólar",
                icon: <AttachMoneyRoundedIcon />,
                link: "/currency",
                roles: ["Admin"],
            },

            {
                text: "Mis ganancias",
                icon: <SavingsRoundedIcon />,
                link: "/me/earnings",
                roles: ["Vendedor", "Repartidor", "Gerente"],
            },
            {
                text: "Ganancias globales",
                icon: <BarChartRoundedIcon />,
                link: "/earnings",
                roles: ["Admin"],
            },
            {
                text: "Tiendas",
                icon: <StorefrontRounded />,
                link: "/shops",
                roles: ["Admin", "Gerente"],
            },
            {
                text: "Métricas",
                icon: <PollRounded />,
                link: "/metrics",
                roles: ["Admin", "Gerente"],
            },
            {
                text: "Metricas del negocio",
                icon: <PollRounded />,
                link: "/business-metrics",
                roles: ["Admin"],
            },
            {
                text: "Tracking de Órdenes",
                icon: <HistoryRounded />,
                link: "/tracking-report",
                roles: ["Admin", "Gerente"],
            },
        ],
        []
    );

    const allowedLinks = links.filter(
        (l) => !l.roles || l.roles.includes(roleDesc)
    );

    const onClick = () => {
        setOpen(!open);
    };

    const logout = async () => {
        const result = await userLogout();
        if (result) return (window.location.href = "/");
    };

    if (user.is_lite_view) return null;

    return (
        <>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "100vh",
                    height: "100vh",
                    overflow: "auto",
                    minWidth: { xs: 50, md: open ? 250 : 50 },
                    width: { xs: 50, md: open ? 250 : 50 },
                    background: (theme) =>
                        theme.palette.mode === "dark"
                            ? darken(user.color, 0.9)
                            : `${user.color}05`,
                    position: "sticky",
                    top: 0,
                    left: 0,
                    borderRight: `2px solid ${user.color}30`,
                }}
            >
                <Box
                    sx={{
                        minHeight: "100vh",
                        maxHeight: "100vh",
                        overflowY: "scroll",
                        display: "flex",
                        flexFlow: "column nowrap",
                        alignItems: "center",
                        gap: 1,
                        pb: 2,
                        "&::-webkit-scrollbar": {
                            width: "0.1em",
                        },
                        "&::-webkit-scrollbar-track": {
                            boxShadow: "inset 0 0 6px rgba(0,0,0,0.00)",
                            webkitBoxShadow: "inset 0 0 6px rgba(0,0,0,0.00)",
                        },
                        "&::-webkit-scrollbar-thumb": {
                            backgroundColor: "rgba(0,0,0,.1)",
                        },
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            flexFlow: "column wrap",
                            alignItems: "center",
                            width: "100%",
                            gap: 1,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                flexFlow: "row-reverse wrap",
                                justifyContent: "center",
                                alignItems: "center",
                                width: "100%",
                                gap: 1,
                                pt: 1,
                            }}
                        >
                            <IconButton sx={{ alignSelf: "flex-end" }} onClick={onClick}>
                                {matches && (open ? (
                                    <KeyboardArrowLeftRounded />
                                ) : (
                                    <KeyboardArrowRightRounded />
                                ))}
                            </IconButton>
                            <IconButton
                                sx={{
                                    alignSelf: "flex-end",
                                    background:
                                        window.location.pathname === "/profile"
                                            ? `${user.color}30`
                                            : "transparent",
                                    color: (theme) =>
                                        theme.palette.mode === "dark" ? "#FFF" : "#000",
                                }}
                                onClick={() => navigate("/profile")}
                            >
                                <ManageAccountsRoundedIcon />
                            </IconButton>

                            <NotificationBell />

                            <IconButton sx={{ alignSelf: "flex-end" }} onClick={logout}>
                                <LogoutRoundedIcon color="error" />
                            </IconButton>
                        </Box>

                        {matches && open && <Clock />}

                        {allowedLinks.map((data, i) => (
                            <SideBarLink
                                open={open}
                                key={i}
                                icon={data.icon}
                                text={data.text}
                                link={data.link}
                                matches={matches}
                            />
                        ))}
                    </Box>
                </Box>
            </Box>
        </>
    );
};

interface SideBarLinkProps {
    icon: ReactNode;
    text: string;
    link: string;
    open: boolean;
    matches: boolean;
}

const SideBarLink: FC<SideBarLinkProps> = ({ icon, text, link, open, matches }) => {
    const navigate = useNavigate();
    const user = useUserStore((state) => state.user);

    const onClick = (link: string) => {
        navigate(link);
    };

    return (
        <Box
            sx={{
                outline: "none",
                borderRadius: "100em",
                background:
                    link === window.location.pathname ? `${user.color}19` : "transparent",
                color: (theme) => (theme.palette.mode === "dark" ? "#FFF" : "#000"),
                width: matches && open ? "90%" : 40,
                height: matches && open ? "auto" : 40,
                p: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "start",
                flexFlow: "row nowrap",
                gap: 1,
                transition: "0.2s ease all",
                "&:hover": {
                    background: `${user.color}19`,
                    color: (theme) => (theme.palette.mode === "dark" ? "#FFF" : "#000"),
                },
            }}
            onClick={() => onClick(link)}
        >
            {icon}
            {matches && open && (
                <TypographyCustom variant="subtitle2">{text}</TypographyCustom>
            )}
        </Box>
    );
};
