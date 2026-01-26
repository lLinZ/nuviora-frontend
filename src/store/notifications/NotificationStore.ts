import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AppNotification {
    id: number;
    orderId: number;
    orderName: string;
    type: 'reminder' | 'scheduled' | 'novedad';
    message: string;
    time: string;
    createdAt: number;
}

interface NotificationState {
    notifications: AppNotification[];
    dismissedOrderIds: Record<number, number>; // orderId -> timestamp of last dismissal
    addNotification: (notification: AppNotification) => void;
    dismissNotification: (orderId: number) => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set) => ({
            notifications: [],
            dismissedOrderIds: {},
            addNotification: (notification) => set((state) => {
                // Avoid duplicates for same order/type if recently notified
                const exists = state.notifications.find(
                    n => n.orderId === notification.orderId && n.type === notification.type
                );
                if (exists) return state;

                return {
                    notifications: [notification, ...state.notifications].slice(0, 50)
                };
            }),
            dismissNotification: (orderId) => set((state) => ({
                notifications: state.notifications.filter(n => n.orderId !== orderId),
                dismissedOrderIds: {
                    ...state.dismissedOrderIds,
                    [orderId]: Date.now()
                }
            })),
            clearAll: () => set({ notifications: [] }),
        }),
        { name: "notification-storage" }
    )
);
