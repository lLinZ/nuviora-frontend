import { useEffect } from "react";
import { useSocketStore } from "../../../store/sockets/SocketStore";
import { useUserStore } from "../../../store/user/UserStore";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../../store/orders/OrdersStore";
import { Avatar } from "@mui/material";
import { AssignmentIndRounded } from "@mui/icons-material";
import { request } from "../../../common/request";
import { IResponse } from "../../../interfaces/response-type";

export const BroadcastMonitor = () => {
    const { echo } = useSocketStore();
    const { user } = useUserStore();
    const { updateOrder } = useOrdersStore();

    useEffect(() => {
        if (!echo || !user?.id) return;

        console.log("📡 Connecting to channel: App.Models.User." + user.id);
        const channelName = `App.Models.User.${user.id}`;

        try {
            echo.private(channelName)
                .notification(async (notification: any) => {
                    console.log("🔔 Broadcast received:", notification);

                    // 1. Play Sound
                    const audio = new Audio('/notification.mp3');
                    audio.play().catch(e => console.log('Audio autoplay blocked', e));

                    // 2. Show Toast
                    toast.info(notification.message, {
                        icon: <Avatar sx={{ bgcolor: 'primary.main' }}><AssignmentIndRounded /></Avatar>,
                        autoClose: 8000
                    });

                    // 3. Refresh Specific Order Data
                    if (notification.order_id) {
                        try {
                            const { status, response }: IResponse = await request(`/orders/${notification.order_id}`, 'GET');
                            if (status) {
                                const data = await response.json();
                                updateOrder(data.order || data);
                            }
                        } catch (err) {
                            console.error("Error fetching updated order", err);
                        }
                    }
                });
        } catch (e) {
            console.error("Socket error:", e);
        }

        return () => {
            if (echo) echo.leave(channelName);
        };
    }, [echo, user?.id, updateOrder]);

    return null;
};
