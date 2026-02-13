import { Badge, Box, CircularProgress, Typography } from "@mui/material";
import { darken } from "@mui/material/styles";
import React, { FC, useCallback, useEffect, useRef } from "react";
import { OrderItem, statusColors } from "./OrderItem";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { useUserStore } from "../../store/user/UserStore";
import { grey } from "@mui/material/colors";
import { request } from "../../common/request";
import { toast } from "react-toastify";

interface OrderListProps {
    title: string;
}

export const OrderList: FC<OrderListProps> = ({ title }) => {
    const user = useUserStore((state) => state.user);

    // Selectores Atómicos para evitar re-renders masivos
    const column = useOrdersStore(useCallback((state) => state.columns[title], [title]));
    const filters = useOrdersStore((state) => state.filters);
    const searchTerm = useOrdersStore((state) => state.searchTerm);
    const refreshSignal = useOrdersStore((state) => state.refreshSignal);


    // Acciones (son estables, no causan re-render)
    const setColumnsOrder = useOrdersStore((state) => state.setColumnsOrder);
    const setColumnLoading = useOrdersStore((state) => state.setColumnLoading);

    // Derivar estado local de los props obtenidos
    const items = column?.items || [];
    const currentPage = column?.page || 0;
    const hasMore = column?.hasMore ?? true;
    const isLoading = column?.isLoading || false;

    // Ref para evitar doble fetch en strict mode o race conditions
    const loadingRef = useRef(false);

    // Función de carga
    const fetchColumnData = useCallback(async (pageToLoad = 1) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setColumnLoading(title, true);

        try {
            const params = new URLSearchParams();
            params.append('per_page', '25');
            params.append('page', pageToLoad.toString());

            // Filtros Globales
            if (filters.city_id) params.append('city_id', filters.city_id);
            if (filters.agency_id) params.append('agency_id', filters.agency_id);
            if (filters.seller_id) params.append('seller_id', filters.seller_id);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);

            // Búsqueda Global
            if (searchTerm) params.append('search', searchTerm);

            // Filtro STATUS (Clave para Kanban por columnas)
            params.append('status', title);

            const { status, response } = await request(`/orders?${params.toString()}`, 'GET');
            if (status) {
                const data = await response.json();
                const isAppend = pageToLoad > 1;
                // Actualizar store con total desde meta
                setColumnsOrder(title, data.data, isAppend, data.meta.last_page > pageToLoad, data.meta.total);
            } else {
                // toast.error(`Error cargando ${title}`); 
                // Silencioso mejor, para no spammear 10 toasts
            }
        } catch (e) {
            console.error(e);
        } finally {
            setColumnLoading(title, false);
            loadingRef.current = false;
        }
    }, [title, filters, searchTerm]);

    // Disparador Inicial (Carga Página 1)
    // Se dispara si: 
    // 1. La página es 0 (primera vez o reset)
    // 2. Cambian filtros/busqueda (lo cual debería resetear page a 0 en el store, pero lo simulamos aqui)
    useEffect(() => {
        // Diferir la carga hasta después del render para evitar warning de React
        // "Cannot update component while rendering a different component"
        const timer = setTimeout(() => {
            fetchColumnData(1);
        }, 0);

        return () => clearTimeout(timer);
    }, [filters, searchTerm, fetchColumnData, refreshSignal]); // Si cambian filtros, busqueda o signal, recargar columna completa

    // --- Polling Logic --- 🔇 DISABLED: Using WebSocket Instead
    /*
    const POLLING_COLS = [
        'Nuevo',
        'Novedades',
        'Novedad Solucionada',
        'Asignado a vendedor',
        'Asignar a agencia',
        'Reprogramado para hoy'
    ];
    const enablePolling = currentPage <= 1 && POLLING_COLS.includes(title);

    // Timer state - Random offset to prevent all columns fetching at exact same time
    const [countdown, setCountdown] = React.useState(30 + Math.floor(Math.random() * 10));

    useEffect(() => {
        if (!enablePolling) return; // Si no es polling col, no timer

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    // Check conditions to Run Refresh:
                    // 1. Not already loading
                    // 2. Tab is visible (save resources)
                    // 3. No Dialog is open (prevent blocking user interaction/network)
                    const isDialogBookingNetwork = document.querySelector('.MuiDialog-root');
                    const isTabVisible = !document.hidden;

                    if (!loadingRef.current && isTabVisible && !isDialogBookingNetwork) {
                        fetchColumnData(1); // Auto-refresh
                    }
                    return 30; // Reset
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [enablePolling, fetchColumnData]);
    */
    const enablePolling = false; // Forced to false - using WebSocket

    const handleManualRefresh = () => {
        fetchColumnData(1);
    };

    // Scroll Infinito Handler
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100; // 100px buffer

        if (bottom && hasMore && !isLoading && !loadingRef.current && currentPage > 0) {
            fetchColumnData(currentPage + 1);
        }
    };

    return (
        <Box
            id={`order-list-${title}`}
            onScroll={handleScroll}
            sx={{
                zIndex: 999,
                background: (theme) =>
                    theme.palette.mode === "dark"
                        ? darken(user.color, 0.8)
                        : "white",
                p: 2,
                boxShadow: "0 8px 20px rgba(150,150,150,0.1)",
                overflowX: "hidden",
                minHeight: "600px",
                maxHeight: "600px",
                gap: 2,
                borderRadius: 5,
                height: "fit-content",
                overflowY: "scroll",
                "&::-webkit-scrollbar": {
                    width: "5px",
                },
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6">
                        {title}
                    </Typography>
                    <Badge
                        badgeContent={column?.total || 0}
                        max={999}
                        sx={{
                            "& .MuiBadge-badge": {
                                backgroundColor: statusColors[title] || grey[400],
                                color: "#fff",
                                fontSize: 12,
                                height: 20,
                                minWidth: 20,
                            },
                        }}
                    />
                </Box>

                {/* Controls */}
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography
                        variant="caption"
                        onClick={handleManualRefresh}
                        sx={{
                            cursor: 'pointer',
                            fontSize: '1rem',
                            '&:hover': { transform: 'rotate(180deg)', transition: '0.3s' }
                        }}
                        title="Actualizar lista manualmente"
                    >
                        🔄
                    </Typography>
                </Box>
            </Box>
            <Box
                sx={{
                    p: 2,
                    gap: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: "300px",
                }}
            >
                {items.map((order: any) => (
                    <OrderItem key={order.id} order={order} />
                ))}

                {isLoading && (
                    <Box py={2} display="flex" justifyContent="center" width="100%">
                        <CircularProgress size={24} />
                    </Box>
                )}

                {!hasMore && items.length > 0 && (
                    <Box py={2} display="flex" justifyContent="center" width="100%">
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Fin de la lista
                        </Typography>
                    </Box>
                )}

                {!isLoading && items.length === 0 && (
                    <Box py={4} display="flex" justifyContent="center" width="100%">
                        <Typography variant="body2" color="text.secondary">
                            Sin órdenes
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
