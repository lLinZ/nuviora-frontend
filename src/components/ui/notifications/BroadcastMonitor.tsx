import { useEffect, useRef } from "react";
import { useSocketStore } from "../../../store/sockets/SocketStore";
import { useUserStore } from "../../../store/user/UserStore";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../../store/orders/OrdersStore";
import { useNotificationStore, AppNotification } from "../../../store/notifications/NotificationStore";
import {
    AssignmentIndRounded,
    NewReleasesRounded,
    CheckCircleRounded,
    ScheduleRounded,
    TimerRounded
} from "@mui/icons-material";
import { request } from "../../../common/request";
import { IResponse } from "../../../interfaces/response-type";

export const BroadcastMonitor = () => {
    const { echo, setSocket } = useSocketStore();
    const { user } = useUserStore();
    const { updateOrderInColumns, setSelectedOrder } = useOrdersStore();
    const { addNotification, dismissNotification } = useNotificationStore();

    useEffect(() => {
        if (!echo) {
            setSocket();
        }
    }, [echo, setSocket]);

    useEffect(() => {
        if (!echo || !user?.id) return;

        console.log("📡 Connecting to channel: App.Models.User." + user.id);
        const channelName = `App.Models.User.${user.id}`;

        const channel = echo.private(channelName);

        channel.notification(async (notification: any) => {
            console.log("🔔 Broadcast received:", notification);

            // 1. Play Sound
            const soundFile = notification.sound ? `/${notification.sound}.mp3` : '/notification.mp3';
            const audio = new Audio(soundFile);
            audio.play().catch(e => console.log('Audio autoplay blocked', e));

            // 2. Select Icon and Color based on type
            let Icon = <AssignmentIndRounded />;
            let bgColor = user?.color || '#0073ff';

            switch (notification.type) {
                case 'novelty':
                    Icon = <NewReleasesRounded />;
                    bgColor = '#d32f2f'; // Error red
                    break;
                case 'novelty_resolved':
                    Icon = <CheckCircleRounded />;
                    bgColor = '#2e7d32'; // Success green
                    break;
                case 'scheduled':
                    Icon = <ScheduleRounded />;
                    bgColor = '#0288d1'; // Info blue
                    break;
                case 'waiting_location':
                    Icon = <TimerRounded />;
                    bgColor = '#ed6c02'; // Warning orange
                    break;
            }

            // 3. Add to store (for the bell)
            const newNotif: AppNotification = {
                id: Date.now() + (notification.order_id || 0),
                orderId: notification.order_id || 0,
                orderName: notification.order_name || 'Nueva',
                type: notification.type === 'novelty' ? 'novedad' : (notification.type === 'scheduled' ? 'scheduled' : 'reminder'),
                message: notification.message,
                time: new Date().toISOString(),
                createdAt: Date.now()
            };
            addNotification(newNotif);

            // 4. Show Toast
            const toastId = toast.info(notification.message, {
                icon: (
                    <div style={{
                        backgroundColor: bgColor,
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        flexShrink: 0
                    }}>
                        {Icon}
                    </div>
                ),
                autoClose: false,
                closeOnClick: false,
                position: "top-right",
                onClick: () => {
                    if (notification.order_id) {
                        dismissNotification(notification.order_id);
                        setSelectedOrder({ id: notification.order_id });
                        toast.dismiss(toastId);
                    }
                }
            });

            // 5. Refresh Specific Order Data
            if (notification.order_id) {
                try {
                    const { status, response }: IResponse = await request(`/orders/${notification.order_id}`, 'GET');
                    if (status) {
                        const data = await response.json();
                        updateOrderInColumns(data.order || data);
                    }
                } catch (err) {
                    console.error("Error fetching updated order", err);
                }
            }
        });

        return () => {
            channel.stopListening('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated');
            echo.leave(channelName);
        };
    }, [echo, user?.id, updateOrderInColumns, addNotification, dismissNotification, setSelectedOrder]);

    return null;
};
