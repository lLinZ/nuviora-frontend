import { create } from "zustand";

interface OrdersState {
    orders: any[];
    selectedOrder: any | null;
    selectedAgentId: number | null;
    searchTerm: string; // Nuevo estado global
    setOrders: (orders: any[]) => void;
    updateOrder: (order: any) => void;
    setSelectedOrder: (order: any | null) => void;
    setSelectedAgentId: (id: number | null) => void;
    setSearchTerm: (term: string) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
    orders: [],
    selectedOrder: null,
    selectedAgentId: null,
    searchTerm: "",
    setOrders: (orders) =>
        set((state) => {
            const found = state.selectedOrder
                ? orders.find((o) => o.id === state.selectedOrder.id)
                : null;

            let newSelectedOrder = null;

            if (found && state.selectedOrder) {
                // Merge: keep detailed fields from selectedOrder, update common fields from found
                newSelectedOrder = {
                    ...state.selectedOrder,
                    ...found
                };
            } else if (found) {
                newSelectedOrder = found;
            } else {
                newSelectedOrder = null; // Or keep state.selectedOrder if you want to persist view even if filtered out
            }

            return {
                orders,
                selectedOrder: newSelectedOrder
            };
        }),
    updateOrder: (order) =>
        set((state) => ({
            orders: state.orders.map((o) => (o.id === order.id ? order : o)),
            selectedOrder:
                state.selectedOrder?.id === order.id ? order : state.selectedOrder,
        })),
    setSelectedOrder: (order) => set({ selectedOrder: order }),
    setSelectedAgentId: (id) => set({ selectedAgentId: id }),
    setSearchTerm: (term) => set({ searchTerm: term }),
}));