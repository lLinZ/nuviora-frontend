import { create } from "zustand";

interface OrdersState {
    orders: any[];
    selectedOrder: any | null;
    selectedAgentId: number | null;
    setOrders: (orders: any[]) => void;
    updateOrder: (order: any) => void;
    setSelectedOrder: (order: any | null) => void;
    setSelectedAgentId: (id: number | null) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
    orders: [],
    selectedOrder: null,
    selectedAgentId: null,
    setOrders: (orders) =>
        set((state) => ({
            orders,
            selectedOrder: state.selectedOrder
                ? orders.find((o) => o.id === state.selectedOrder.id) || state.selectedOrder
                : null,
        })),
    updateOrder: (order) =>
        set((state) => ({
            orders: state.orders.map((o) => (o.id === order.id ? order : o)),
            selectedOrder:
                state.selectedOrder?.id === order.id ? order : state.selectedOrder,
        })),
    setSelectedOrder: (order) => set({ selectedOrder: order }),
    setSelectedAgentId: (id) => set({ selectedAgentId: id }),
}));