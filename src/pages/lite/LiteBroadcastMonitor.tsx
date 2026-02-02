import { useEffect } from "react";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { useUserStore } from "../../store/user/UserStore";
import { toast } from "react-toastify";
import { Avatar } from "@mui/material";
import { AssignmentIndRounded } from "@mui/icons-material";

export const LiteBroadcastMonitor = ({ onOrderUpdate }: { onOrderUpdate: () => void }) => {
    const { echo, setSocket } = useSocketStore();
    const { user } = useUserStore();

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
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => { });

            toast.info(notification.message, {
                icon: <Avatar sx={{ bgcolor: 'secondary.main' }}><AssignmentIndRounded /></Avatar>,
                autoClose: 8000,
                position: "top-right"
            });

            if (onOrderUpdate) {
                onOrderUpdate();
            }
        });

        return () => {
            channel.stopListening('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated');
            echo.leave(channelName);
        };
    }, [echo, user?.id, onOrderUpdate]);

    return null;
};
