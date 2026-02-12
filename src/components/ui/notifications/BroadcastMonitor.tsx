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
import { OrderDialog } from "../../orders/OrderDialog"; // Import OrderDialog if we need to mount it here? No, better mounted in Layout or Orders.tsx

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

            // 🛡️ SECURITY: Validate order ownership BEFORE doing anything
            if (notification.order_id) {
                try {
                    const { status, response: rawResponse } = await request(`/orders/${notification.order_id}`, 'GET');

                    if (status === 200) {
                        const data = await rawResponse.json();
                        const order = data.order || data;

                        // Check if this order belongs to the current user
                        const role = user.role?.description?.toLowerCase() || '';
                        let isMyOrder = false;

                        if (role.includes('vendedor')) {
                            isMyOrder = order.agent_id === user.id;
                        } else if (role.includes('agencia')) {
                            isMyOrder = order.agency_id === user.id;
                        } else if (role.includes('repartidor')) {
                            isMyOrder = order.deliverer_id === user.id;
                        } else {
                            // Admin/Gerente can see all
                            isMyOrder = true;
                        }

                        if (!isMyOrder) {
                            console.warn(`⚠️ [SECURITY] Ignoring notification for order #${notification.order_id} - not assigned to current user`);
                            return; // STOP PROCESSING
                        }
                    }
                } catch (e) {
                    console.error('Error validating order ownership:', e);
                    return; // If we can't validate, don't show it
                }
            }

            // 1. Play Sound
            try {
                const soundName = notification.sound || 'notification_sound';
                const soundFile = `/${soundName}.mp3`;
                console.log("🔊 Playing sound:", soundFile);
                const audio = new Audio(soundFile);
                await audio.play();
            } catch (e) {
                console.warn('Audio autoplay blocked or file not found', e);
            }

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

                        // Fetch fresh order data logic is already in "Refresh Specific Order Data" below?
                        // No, we need to open the dialog. Fetching data updates the columns, but opening dialog requires data.
                        // Ideally we fetch and then set selected order.

                        const fetchAndOpen = async () => {
                            try {
                                const { status, response }: IResponse = await request(`/orders/${notification.order_id}`, 'GET');
                                if (status === 200) {
                                    const data = await response.json();
                                    const fullOrder = data.order || data;
                                    updateOrderInColumns(fullOrder);
                                    setSelectedOrder(fullOrder); // Open the dialog
                                }
                            } catch (e) {
                                console.error("Error opening order from notification", e);
                            }
                        };
                        fetchAndOpen();
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

    // 🆕 LISTENER GLOBAL DE ORDENES (KANBAN)
    useEffect(() => {
        if (!echo || !user?.id) return;

        const role = user.role?.description?.toLowerCase() || '';
        let channelName = 'orders';

        if (role.includes('agencia')) {
            channelName = `orders.agency.${user.id}`;
        } else if (role.includes('vendedor')) {
            channelName = `orders.agent.${user.id}`;
        } else if (role.includes('repartidor')) {
            channelName = `orders.deliverer.${user.id}`;
        }

        console.log("📡 Connecting to global channel:", channelName);

        const channel = echo.private(channelName);

        channel.listen('OrderUpdated', (e: any) => {
            console.log("♻️ Order Updated Event:", e);
            if (e.order) {
                // Actualizamos la orden en el store/kanban directamente
                updateOrderInColumns(e.order);
                console.log(`✅ Order #${e.order.id} updated via WebSocket`);
            }
        });

        return () => {
            channel.stopListening('OrderUpdated');
            echo.leave(channelName);
        };
    }, [echo, user?.id, updateOrderInColumns]);

    return null;
};
