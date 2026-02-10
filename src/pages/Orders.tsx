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
import { CreateOrderDialog } from "../components/orders/CreateOrderDialog";
import { BankAccountsDialog } from "../components/orders/BankAccountsDialog";
import { DailyRatesDialog } from "../components/orders/DailyRatesDialog";
import { AccountBalanceRounded, AddCircleOutline, CurrencyExchange } from "@mui/icons-material";


export const Orders = () => {
    const user = useUserStore((state) => state.user);
    const { searchTerm, setSearchTerm, selectedOrder, setSelectedOrder } = useOrdersStore();
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
    const [openBankDialog, setOpenBankDialog] = useState(false);
    const [openRatesDialog, setOpenRatesDialog] = useState(false);
    const [openCreateDialog, setOpenCreateDialog] = useState(false);



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

    // NOTA: La carga de órdenes ahora es responsabilidad de cada columna (OrderList)
    // Orders.tsx solo gestiona los filtros globales.

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
        };

        init();
    }, []);

    const handleClearFilters = () => {
        const resetFilters = {
            city_id: '',
            agency_id: '',
            date_from: new Date().toISOString().slice(0, 10), // Reset to today by default for Admin convenience? Or clear? Let's clear.
            date_to: new Date().toISOString().slice(0, 10)
        };
        // Actually, user requested a filter so let's default to empty (All time) or Today?
        // Usually admin wants to see EVERYTHING unless filtered.
        const emptyFilters = {
            city_id: '',
            agency_id: '',
            date_from: '',
            date_to: ''
        };
        setFilters(emptyFilters);
        useOrdersStore.getState().setFilters(emptyFilters);
        setSearchTerm("");
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
                                    const newVal = { ...filters, city_id: e.target.value };
                                    setFilters(newVal);
                                    useOrdersStore.getState().setFilters(newVal);
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
                                    const newVal = { ...filters, agency_id: e.target.value };
                                    setFilters(newVal);
                                    useOrdersStore.getState().setFilters(newVal);
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
                        {/* Remove manual filter button as it updates automatically via store */}
                    </Box>
                )}
                {['Admin', 'Gerente'].includes(user.role?.description || '') && (
                    <Box display="flex" gap={1} alignItems="center">
                        <TextField
                            label="Desde"
                            type="date"
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={filters.date_from}
                            onChange={(e) => {
                                const newVal = { ...filters, date_from: e.target.value };
                                setFilters(newVal);
                                useOrdersStore.getState().setFilters(newVal);
                            }}
                        />
                        <TextField
                            label="Hasta"
                            type="date"
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={filters.date_to}
                            onChange={(e) => {
                                const newVal = { ...filters, date_to: e.target.value };
                                setFilters(newVal);
                                useOrdersStore.getState().setFilters(newVal);
                            }}
                        />
                    </Box>
                )}

                <Tooltip title="Cuentas Bancarias">
                    <IconButton
                        onClick={() => setOpenBankDialog(true)}
                        sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
                    >
                        <AccountBalanceRounded color="primary" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Tasas del Día">
                    <IconButton
                        onClick={() => setOpenRatesDialog(true)}
                        sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
                    >
                        <CurrencyExchange color="success" />
                    </IconButton>
                </Tooltip>
                <Box sx={{ width: { xs: '100%', lg: '10%' } }}>

                    <ButtonCustom
                        variant="outlined"
                        startIcon={<AddCircleOutline />}
                        onClick={() => setOpenCreateDialog(true)}
                    >
                        Crear Orden
                    </ButtonCustom>
                </Box>
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
                                        <OrderList title="Reprogramado para hoy" />
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
            <BankAccountsDialog open={openBankDialog} onClose={() => setOpenBankDialog(false)} />
            <DailyRatesDialog open={openRatesDialog} onClose={() => setOpenRatesDialog(false)} />
            <CreateOrderDialog
                open={openCreateDialog}
                onClose={() => setOpenCreateDialog(false)}
                onSuccess={() => {
                    // Force refresh of visible lists
                    // Since lists refresh on interval or signal, we might need to trigger a global event 
                    // or just let the auto-refresh handle it. For now, simple toast in dialog is enough.
                    useOrdersStore.getState().setRefreshSignal(Date.now());
                }}
            />

            {/* GLOBAL ORDER DIALOG (Triggered by Notifications/Search) */}
            {selectedOrder && (
                <OrderDialog
                    open={!!selectedOrder}
                    setOpen={(val) => {
                        if (!val) setSelectedOrder(null);
                    }}
                    id={selectedOrder.id}
                />
            )}
        </Layout>
    );
};
