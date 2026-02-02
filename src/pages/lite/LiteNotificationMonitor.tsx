import React, { useEffect, useRef } from "react";
import { useNotificationStore, AppNotification } from "../../store/notifications/NotificationStore";
import { toast } from "react-toastify";

interface LiteNotificationMonitorProps {
    orders: any[];
}

export const LiteNotificationMonitor: React.FC<LiteNotificationMonitorProps> = ({ orders }) => {
    const { addNotification, dismissedOrderIds, notifications } = useNotificationStore();
    const toastedRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        if (!orders || orders.length === 0) return;

        const checkReminders = () => {
            const now = new Date();
            let newFound = false;

            orders.forEach(order => {
                const processAlert = (timeStr: string, type: AppNotification['type'], label: string) => {
                    if (!timeStr) return;
                    const time = new Date(timeStr);
                    const diff = now.getTime() - time.getTime();

                    // Si la hora ya pasó (pero no por más de 24h)
                    if (diff >= 0 && diff < 86400000) {
                        const lastDismissed = dismissedOrderIds[order.id] || 0;
                        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);

                        // Si no ha sido descartado recientemente
                        if (lastDismissed < twoHoursAgo) {
                            const exists = notifications.some(n => n.orderId === order.id && n.type === type);

                            if (!exists) {
                                const newNotif: AppNotification = {
                                    id: Date.now() + order.id,
                                    orderId: order.id,
                                    orderName: order.name,
                                    type,
                                    message: `${label}: #${order.name}`,
                                    time: timeStr,
                                    createdAt: Date.now()
                                };

                                addNotification(newNotif);
                                newFound = true;

                                if (!toastedRef.current.has(order.id)) {
                                    toast.warning(`⏰ ${label}: Orden #${order.name}`, {
                                        autoClose: 6000,
                                        position: "top-right"
                                    });
                                    toastedRef.current.add(order.id);
                                }
                            }
                        }
                    }
                };

                if (order.reminder_at) {
                    processAlert(order.reminder_at, "reminder", "Recordatorio");
                }

                if (order.scheduled_for && order.status && (order.status.description === 'Programado para mas tarde' || order.status.description === 'Reprogramado para hoy')) {
                    processAlert(order.scheduled_for, "scheduled", "Contacto/Entrega");
                }
            });

            if (newFound) {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(e => console.log('Audio feedback blocked by browser.'));
            }
        };

        checkReminders();
        // No interval needed here strictly if we assume orders update triggers effect, 
        // but interval helps if time passes while orders don't change.
        const interval = setInterval(checkReminders, 30000);
        return () => clearInterval(interval);

    }, [orders, dismissedOrderIds, addNotification, notifications]);

    return null;
};
