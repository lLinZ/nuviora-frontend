import { Box, darken, Fab, lighten } from "@mui/material";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { DescripcionDeVista } from "../components/ui/content/DescripcionDeVista";
import { Loading } from "../components/ui/content/Loading";
import { Layout } from "../components/ui/Layout";
import { useUserStore } from "../store/user/UserStore";
import { request } from "../common/request";
import { IResponse } from "../interfaces/response-type";
import { useOrdersStore } from "../store/orders/OrdersStore";
import { OrderList } from "../components/orders/OrderList";
import { toast } from "react-toastify";
import { ButtonCustom } from "../components/custom";
import { ProductSearchDialog } from "../components/products/ProductsSearchDialog";
import { SearchRounded, FilterListRounded, FilterListOffRounded } from "@mui/icons-material";
import { TextField, MenuItem, Select, FormControl, InputLabel, Button, Grid, IconButton, Tooltip, Chip } from "@mui/material";
import { OrderDialog } from "../components/orders/OrderDialog";


export const Orders = () => {
    const user = useUserStore((state) => state.user);
    const { orders, setOrders, searchTerm, setSearchTerm } = useOrdersStore();
    const validateToken = useUserStore((state) => state.validateToken);
    const [openSearch, setOpenSearch] = useState(false);
    const [cities, setCities] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        city_id: '',
        agency_id: '',
        date_from: '',
        date_to: ''
    });
    const [visibleColumns, setVisibleColumns] = useState<string[] | null>(null);

    const [countdown, setCountdown] = useState(30);
    const filtersRef = useRef(filters);

    // Update ref whenever filters change
    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);



    const handlePickProduct = (product: any) => {
        toast.info(`Seleccionaste: ${product.name ?? product.title}`);
        setOpenSearch(false);
    };

    const fetchFiltersData = async () => {
        try {
            const [citiesRes, agenciesRes] = await Promise.all([
                request("/cities", "GET"),
                request("/users/role/Agencia", "GET")
            ]);
            if (citiesRes.status) setCities(await citiesRes.response.json());
            if (agenciesRes.status) {
                const data = await agenciesRes.response.json();
                setAgencies(data.data);
            }
        } catch (e) {
            console.error("Error fetching filters data", e);
        }
    };

    // Unified notifications handled by NotificationMonitor

    const fetchOrders = useCallback(async (silent = false) => {
        try {
            const queryParams = new URLSearchParams();
            // Usamos el ref para que el polling siempre tenga lo último
            const currentFilters = filtersRef.current;
            if (currentFilters.city_id) queryParams.append('city_id', currentFilters.city_id);
            if (currentFilters.agency_id) queryParams.append('agency_id', currentFilters.agency_id);
            if (currentFilters.date_from) queryParams.append('date_from', currentFilters.date_from);
            if (currentFilters.date_to) queryParams.append('date_to', currentFilters.date_to);

            const { status, response }: IResponse = await request(`/orders?${queryParams.toString()}`, "GET");
            if (status) {
                const data = await response.json();
                setOrders(data.data);
                if (!silent) toast.success("Órdenes cargadas ✅");
                setCountdown(30);
            } else if (!silent) {
                toast.error("Error al cargar las órdenes ❌");
            }
        } catch (e) {
            if (!silent) toast.error("No se pudieron cargar las órdenes 🚨");
        }
    }, []); // El ref nos permite no depender de nada cambiante aquí

    useEffect(() => {
        const init = async () => {
            const result = await validateToken();
            if (!result.status) {
                toast.error("Sesión expirada, inicia sesión nuevamente.");
                return (window.location.href = "/");
            }
            if (['Admin', 'Gerente'].includes(user.role?.description || '')) {
                fetchFiltersData();
            } else {
                // Load dynamic columns for other roles
                request('/config/flow', 'GET').then(async ({ status, response }) => {
                    if (status === 200) {
                        try {
                            const data = await response.json();
                            if (data && data.visible_columns) {
                                setVisibleColumns(data.visible_columns);
                            }
                        } catch (e) {
                            console.error("Error parsing flow config", e);
                        }
                    }
                });
            }
            fetchOrders();
        };

        init();

        // Polling every second to update UI countdown
        const timer = setInterval(() => {
            // Si hay una orden seleccionada (diálogo abierto), pausamos el polling
            // para evitar que los datos se sobrescriban mientras el usuario edita.
            if (useOrdersStore.getState().selectedOrder) return;

            setCountdown(prev => {
                if (prev <= 1) {
                    fetchOrders(true);
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleClearFilters = () => {
        const resetFilters = {
            city_id: '',
            agency_id: '',
            date_from: '',
            date_to: ''
        };
        setFilters(resetFilters);
        setSearchTerm(""); // Limpiar búsqueda también
        // El ref se actualizará solo por el useEffect previo
        setTimeout(() => fetchOrders(), 100);
        toast.info("Filtros limpiados ✨");
    };


    if (!user.token) return <Loading />;

    return (
        <Layout>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={2}
                sx={{ width: '100%', mb: 2 }}
            >
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                    <DescripcionDeVista title={"Kanban de ordenes"} description={"Gestiona el flujo de entregas y novedades"} />
                    <Chip
                        label={`🔄 Próxima actualización en: ${countdown}s`}
                        variant="outlined"
                        color="primary"
                        sx={{ fontWeight: 'bold', borderStyle: 'dashed' }}
                    />
                </Box>
                <Box flexGrow={1} display="flex" justifyContent="center">
                    <TextField
                        size="small"
                        placeholder="Buscar por orden, cliente, telf..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: <SearchRounded sx={{ color: 'action.active', mr: 1 }} />,
                            },
                        }}
                        sx={{ maxWidth: 400, width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}
                    />
                </Box>
                {['Admin'].includes(user.role?.description || '') && (
                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Ciudad</InputLabel>
                            <Select
                                value={filters.city_id}
                                label="Ciudad"
                                onChange={(e) => {
                                    setFilters({ ...filters, city_id: e.target.value });
                                    setTimeout(() => fetchOrders(), 100);
                                }}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                {cities.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Agencia</InputLabel>
                            <Select
                                value={filters.agency_id}
                                label="Agencia"
                                onChange={(e) => {
                                    setFilters({ ...filters, agency_id: e.target.value });
                                    setTimeout(() => fetchOrders(), 100);
                                }}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                {agencies.map(a => <MenuItem key={a.id} value={a.id}>{a.names}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Tooltip title="Limpiar Filtros">
                            <IconButton onClick={handleClearFilters}>
                                <FilterListOffRounded color="error" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Filtrar">
                            <IconButton onClick={() => fetchOrders()}>
                                <FilterListRounded color="primary" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                )}
            </Box>

            <Fab sx={{ position: 'fixed', right: 24, bottom: 24 }} onClick={() => setOpenSearch(true)}>
                <SearchRounded />
            </Fab>

            <Box
                sx={{
                    display: "flex",
                    flexFlow: "row nowrap",
                    overflow: "hidden",
                    width: "100%",
                    mt: 2
                }}
            >
                <Box
                    sx={{
                        cursor: "pointer",
                        pb: 2,
                        display: "flex",
                        flexFlow: "row nowrap",
                        overflowX: "auto", // Cambiar scroll por auto para que sea más limpio
                        overflowY: "hidden",
                        width: "100%",
                        minHeight: "75vh",
                        "&::-webkit-scrollbar": {
                            height: "15px",
                            width: "15px",
                        },
                        "&::-webkit-scrollbar-track": {
                            borderRadius: "15px",
                            backgroundColor: darken(user.color, 0.8),
                        },
                        "&::-webkit-scrollbar-thumb": {
                            borderRadius: "15px",
                            backgroundColor: lighten(user.color, 0.2),
                        },
                    }}
                >


                    <ProductSearchDialog
                        open={openSearch}
                        onClose={() => setOpenSearch(false)}
                        onPick={handlePickProduct}
                    />
                    <Box sx={{ display: "flex", gap: 2, flexFlow: "row nowrap" }}>
                        {visibleColumns && visibleColumns.length > 0 ? (
                            // 🌟 Renderizado Dinámico basado en Configuración
                            visibleColumns.map((col) => (
                                <OrderList key={col} title={col} />
                            ))
                        ) : (
                            // 🔒 Renderizado Fallback / Admin (Vista Completa Legacy)
                            <>
                                <OrderList title="Novedades" />
                                <OrderList title="Novedad Solucionada" />

                                {['Admin', 'Gerente', 'Master'].includes(user.role?.description || '') && (
                                    <>
                                        <OrderList title="Nuevo" />
                                        <OrderList title="Sin Stock" />
                                    </>
                                )}

                                {!['Agencia'].includes(user.role?.description || '') && (
                                    <>
                                        <OrderList title="Reprogramado" />
                                        <OrderList title="Asignado a vendedor" />
                                        <OrderList title="Llamado 1" />
                                        <OrderList title="Llamado 2" />
                                        <OrderList title="Llamado 3" />
                                        <OrderList title="Esperando Ubicacion" />
                                        <OrderList title="Confirmado" />
                                    </>
                                )}

                                <OrderList title="Asignar a agencia" />

                                {['Admin', 'Gerente', 'Master', 'Agencia'].includes(user.role?.description || '') && (
                                    <>
                                        <OrderList title="Asignado a repartidor" />
                                        <OrderList title="En ruta" />
                                    </>
                                )}

                                {!['Agencia'].includes(user.role?.description || '') && (
                                    <>
                                        <OrderList title="Programado para mas tarde" />
                                        <OrderList title="Programado para otro dia" />
                                    </>
                                )}

                                <OrderList title="Entregado" />
                                <OrderList title="Cancelado" />
                            </>
                        )}
                    </Box>
                </Box>
            </Box>

        </Layout>
    );
};
