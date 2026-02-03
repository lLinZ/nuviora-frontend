import { useEffect, useRef } from "react";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { useUserStore } from "../../store/user/UserStore";
import { useNotificationStore, AppNotification } from "../../store/notifications/NotificationStore";
import { toast } from "react-toastify";
import {
    AssignmentIndRounded,
    NewReleasesRounded,
    CheckCircleRounded,
    ScheduleRounded,
    TimerRounded
} from "@mui/icons-material";

export const LiteBroadcastMonitor = ({ onOrderUpdate, onOpenOrder }: { onOrderUpdate: (reset?: boolean) => void, onOpenOrder?: (id: number) => void }) => {
    const { echo, setSocket } = useSocketStore();
    const { user } = useUserStore();
    const { addNotification, dismissNotification } = useNotificationStore();
    const updateRef = useRef(onOrderUpdate);
    const openRef = useRef(onOpenOrder);

    useEffect(() => {
        updateRef.current = onOrderUpdate;
    }, [onOrderUpdate]);

    useEffect(() => {
        openRef.current = onOpenOrder;
    }, [onOpenOrder]);

    useEffect(() => {
        if (!echo) {
            setSocket();
        }
    }, [echo, setSocket]);

    useEffect(() => {
        if (!echo || !user?.id) return;

        const channelName = `App.Models.User.${user.id}`;

        const channel = echo.private(channelName);

        channel.notification((notification: any) => {
            console.log("🔔 Broadcast received (Lite):", notification);

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
                orderName: notification.order_name || 'Nueva', // We might not have the name, fallback to id or 'Nueva'
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
                autoClose: false, // Don't auto-close
                closeOnClick: false, // Handle manual click
                position: "top-right",
                onClick: () => {
                    if (notification.order_id && openRef.current) {
                        dismissNotification(notification.order_id);
                        openRef.current(notification.order_id);
                        toast.dismiss(toastId);
                    }
                }
            });

            // 5. Refresh Data
            if (updateRef.current) {
                updateRef.current(true);
            }
        });

        return () => {
            channel.stopListening('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated');
            echo.leave(channelName);
        };
    }, [echo, user?.id]);

    return null;
};
