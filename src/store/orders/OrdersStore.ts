import { create } from "zustand";

// Estructura de cada columna
interface ColumnState {
    id: string; // "Nuevo", "Asignado a vendedor", etc.
    items: any[];
    page: number;
    hasMore: boolean;
    isLoading: boolean;
}

interface OrdersState {
    // Mapa de columnas: key = status description
    columns: Record<string, ColumnState>;

    // Estado global
    selectedOrder: any | null;
    selectedAgentId: number | null;
    searchTerm: string;
    filters: {
        city_id: string;
        agency_id: string;
        date_from: string;
        date_to: string;
    };

    // Actions
    setFilters: (filters: Partial<OrdersState['filters']>) => void;
    setColumnsOrder: (status: string, orders: any[], isAppend?: boolean, hasMore?: boolean) => void;
    setColumnLoading: (status: string, loading: boolean) => void;

    updateOrderInColumns: (order: any) => void; // Para realtime updates o ediciones
    moveOrder: (orderId: number, fromStatus: string, toStatus: string, orderData: any) => void; // Optimistic UI

    setSelectedOrder: (order: any | null) => void;
    setSelectedAgentId: (id: number | null) => void;
    setSearchTerm: (term: string) => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
    columns: {},
    selectedOrder: null,
    selectedAgentId: null,
    searchTerm: "",
    filters: {
        city_id: '',
        agency_id: '',
        date_from: '',
        date_to: ''
    },

    setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),

    setColumnsOrder: (status, orders, isAppend = false, hasMore = true) =>
        set((state) => {
            const currentCol = state.columns[status] || { id: status, items: [], page: 1, hasMore: true, isLoading: false };

            // Deduplicación simple
            const existingIds = new Set(isAppend ? currentCol.items.map(o => o.id) : []);
            const newItems = isAppend
                ? orders.filter(o => !existingIds.has(o.id))
                : orders;

            const nextItems = isAppend ? [...currentCol.items, ...newItems] : orders; // Si no es append, reemplaza todo

            return {
                columns: {
                    ...state.columns,
                    [status]: {
                        ...currentCol,
                        items: nextItems,
                        page: isAppend ? currentCol.page + 1 : 1, // Si es replace, reset page to 1? Ojo aqui
                        hasMore: hasMore,
                        isLoading: false
                    }
                }
            };
        }),

    setColumnLoading: (status, loading) =>
        set((state) => {
            const currentCol = state.columns[status] || { id: status, items: [], page: 1, hasMore: true, isLoading: false };
            return {
                columns: {
                    ...state.columns,
                    [status]: { ...currentCol, isLoading: loading }
                }
            };
        }),

    updateOrderInColumns: (order) =>
        set((state) => {
            const newCols = { ...state.columns };
            const newStatus = order.status?.description; // Estatus actualizado
            let moved = false;
            let updated = false;

            // 1. Buscar order en todas las columnas
            Object.keys(newCols).forEach(colKey => {
                const col = newCols[colKey];
                const idx = col.items.findIndex(o => o.id === order.id);

                if (idx !== -1) {
                    // Encontramos la orden en la columna 'colKey'

                    // Caso A: El status cambió y ya no pertenece a esta columna
                    if (newStatus && newStatus !== colKey) {
                        // Remover de esta columna
                        const newItems = col.items.filter(o => o.id !== order.id);
                        newCols[colKey] = { ...col, items: newItems };
                        moved = true; // Marcamos para insertar en la nueva
                    }
                    // Caso B: El status sigue igual (o es update parcial sin cambio de columna)
                    else {
                        const newItems = [...col.items];
                        newItems[idx] = { ...newItems[idx], ...order };
                        newCols[colKey] = { ...col, items: newItems };
                        updated = true;
                    }
                }
            });

            // 2. Si se movió (se quitó de la vieja), hay que intentar ponerla en la nueva
            if (moved && newStatus) {
                // Si la columna destino existe en memoria, la agregamos
                if (newCols[newStatus]) {
                    // Insertar al principio para feedback inmediato
                    const targetItems = [order, ...newCols[newStatus].items];
                    // Validar unicidad por si acaso (aunque acabamos de limpiar)
                    const uniqueItems = Array.from(new Map(targetItems.map(item => [item.id, item])).values());

                    newCols[newStatus] = {
                        ...newCols[newStatus],
                        items: uniqueItems
                    };
                }
                // Si no existe la columna destino en memoria (ej. no scrolleada aun), no hacemos nada, 
                // cuando el usuario vaya allá, se cargará.
            }

            // 3. Tambien actualizar selectedOrder si es el mismo
            const newSelected = state.selectedOrder?.id === order.id
                ? { ...state.selectedOrder, ...order }
                : state.selectedOrder;

            return { columns: newCols, selectedOrder: newSelected };
        }),

    moveOrder: (orderId, fromStatus, toStatus, orderData) =>
        set((state) => {
            const newCols = { ...state.columns };

            // 1. Remove from source
            if (newCols[fromStatus]) {
                newCols[fromStatus] = {
                    ...newCols[fromStatus],
                    items: newCols[fromStatus].items.filter(o => o.id !== orderId)
                };
            }

            // 2. Add to destination (al principio o ordenado por fecha)
            if (!newCols[toStatus]) {
                // Si la columna destino no está inicializada aún en el store
                newCols[toStatus] = { id: toStatus, items: [], page: 1, hasMore: true, isLoading: false };
            }

            // Asumimos que queremos verlo arriba de todo por ahora para feedback inmediato
            const targetItems = [orderData, ...newCols[toStatus].items];
            newCols[toStatus] = { ...newCols[toStatus], items: targetItems };

            return { columns: newCols };
        }),

    setSelectedOrder: (order) => set({ selectedOrder: order }),
    setSelectedAgentId: (id) => set({ selectedAgentId: id }),
    setSearchTerm: (term) => set({ searchTerm: term }),
}));