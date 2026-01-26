import React, { useState } from "react";
import {
    IconButton,
    Badge,
    Menu,
    MenuItem,
    Typography,
    Box,
    Divider,
    Avatar,
    Tooltip,
    Button,
    alpha
} from "@mui/material";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import { useNotificationStore } from "../../../store/notifications/NotificationStore";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { OrderDialog } from "../../orders/OrderDialog";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";

export const NotificationBell = () => {
    const { notifications, dismissNotification, clearAll } = useNotificationStore();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [openDialog, setOpenDialog] = useState(false);

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = (orderId: number) => {
        setSelectedOrderId(orderId);
        setOpenDialog(true);
        dismissNotification(orderId);
        handleCloseMenu();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'reminder': return <NotificationsActiveRoundedIcon sx={{ color: 'warning.main' }} />;
            case 'scheduled': return <ScheduleRoundedIcon sx={{ color: 'info.main' }} />;
            case 'novedad': return <WarningRoundedIcon sx={{ color: 'error.main' }} />;
            default: return <NotificationsRoundedIcon />;
        }
    };

    return (
        <>
            <Tooltip title="Notificaciones">
                <IconButton
                    onClick={handleOpenMenu}
                    sx={{
                        color: 'inherit',
                        bgcolor: anchorEl ? 'rgba(255,255,255,0.1)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' }
                    }}
                >
                    <Badge badgeContent={notifications.length} color="error">
                        <NotificationsRoundedIcon />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                PaperProps={{
                    sx: {
                        width: 360,
                        maxHeight: 500,
                        borderRadius: 4,
                        mt: 1,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        overflow: 'hidden'
                    }
                }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">Pendientes</Typography>
                    {notifications.length > 0 && (
                        <Button size="small" onClick={clearAll} sx={{ textTransform: 'none' }}>Limpiar mejor</Button>
                    )}
                </Box>
                <Divider />

                <Box sx={{ overflowY: 'auto', maxHeight: 400 }}>
                    {notifications.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                            <NotificationsRoundedIcon sx={{ fontSize: 40, mb: 1 }} />
                            <Typography variant="body2">No tienes notificaciones pendientes</Typography>
                        </Box>
                    ) : (
                        notifications.map((notif) => (
                            <MenuItem
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif.orderId)}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    gap: 2,
                                    whiteSpace: 'normal',
                                    '&:hover': { bgcolor: alpha('#000', 0.02) }
                                }}
                            >
                                <Avatar sx={{ bgcolor: alpha('#eee', 1), width: 40, height: 40 }}>
                                    {getIcon(notif.type)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                                        {notif.message}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Hace {formatDistanceToNow(notif.createdAt, { locale: es })}
                                    </Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dismissNotification(notif.orderId);
                                    }}
                                >
                                    <NotificationsRoundedIcon sx={{ fontSize: 16, opacity: 0.3 }} />
                                </IconButton>
                            </MenuItem>
                        ))
                    )}
                </Box>
            </Menu>

            {openDialog && selectedOrderId && (
                <OrderDialog
                    open={openDialog}
                    setOpen={setOpenDialog}
                    id={selectedOrderId}
                />
            )}
        </>
    );
};
