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

        channel.notification(async (notification: any) => {
            console.log("🔔 Broadcast received (Lite):", notification);

            // 🛡️ SECURITY: Validate order ownership BEFORE doing anything
            if (notification.order_id) {
                try {
                    const response = await fetch(`/api/orders/${notification.order_id}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Accept': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
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
                console.log("🔊 Playing sound (Lite):", soundFile);
                const audio = new Audio(soundFile);
                await audio.play();
            } catch (e) {
                console.warn('Audio autoplay blocked or file not found (Lite)', e);
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
                case 'assigned':
                    Icon = <AssignmentIndRounded />;
                    bgColor = user?.color || '#0073ff';
                    break;
            }

            // 3. Add to store (for the bell)
            // Map incoming types to store types. We'll use the incoming type directly if it matches, or map it.
            let storeType: AppNotification['type'] = 'reminder';
            if (notification.type === 'novelty') storeType = 'novedad';
            else if (notification.type === 'novelty_resolved') storeType = 'novelty_resolved';
            else if (notification.type === 'assigned') storeType = 'assigned';
            else if (notification.type === 'waiting_location') storeType = 'waiting_location';
            else if (notification.type === 'scheduled') storeType = 'scheduled';

            const newNotif: AppNotification = {
                id: Date.now() + (notification.order_id || 0),
                orderId: notification.order_id || 0,
                orderName: notification.order_name || 'Nueva',
                type: storeType,
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
                    const orderId = notification.order_id;
                    if (orderId) {
                        dismissNotification(orderId);

                        // Clean existing toast
                        toast.dismiss(toastId);

                        if (openRef.current) {
                            openRef.current(orderId);
                        }
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

    // 🆕 LISTENER GLOBAL DE ORDENES (KANBAN) - Para actualizaciones en tiempo real
    useEffect(() => {
        if (!echo || !user?.id) return;

        const channelName = 'orders';
        console.log("📡 [LITE] Connecting to global channel:", channelName);

        const channel = echo.private(channelName);

        channel.listen('OrderUpdated', (e: any) => {
            console.log("♻️ [LITE] Order Updated Event:", e);
            if (e.order) {
                // 🛡️ SECURITY FILTER: Ignore orders that don't belong to us
                const role = user.role?.description?.toLowerCase() || '';

                if (role.includes('agencia')) {
                    if (e.order.agency_id !== user.id) return;
                }
                if (role.includes('vendedor')) {
                    if (e.order.agent_id !== user.id) return;
                }
                if (role.includes('repartidor')) {
                    if (e.order.deliverer_id !== user.id) return;
                }

                // Refrescar la lista completa en Lite
                if (updateRef.current) {
                    updateRef.current(true); // Reset para traer data fresca
                }
                console.log(`✅ [LITE] Order #${e.order.id} updated via WebSocket`);
            }
        });

        return () => {
            channel.stopListening('OrderUpdated');
            echo.leave(channelName);
        };
    }, [echo, user?.id]);

    return null;
};
