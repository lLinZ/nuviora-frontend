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
import { SearchRounded, FilterListOffRounded } from "@mui/icons-material";
import { TextField, MenuItem, Select, FormControl, InputLabel, IconButton, Tooltip } from "@mui/material";
import { OrderDialog } from "../components/orders/OrderDialog";
import { CreateOrderDialog } from "../components/orders/CreateOrderDialog";
import { BankAccountsDialog } from "../components/orders/BankAccountsDialog";
import { DailyRatesDialog } from "../components/orders/DailyRatesDialog";
import { AssignAgentDialog } from "../components/orders/AssignAgentDialog";
import { AssignDelivererDialog } from "../components/orders/AssignDelivererDialog";
import { PostponeOrderDialog } from "../components/orders/PostponeOrderDialog";
import { AssignAgencyDialog } from "../components/orders/AssignAgencyDialog";
import { NoveltyDialog } from "../components/orders/NoveltyDialog";
import { ResolveNovedadDialog } from "../components/orders/ResolveNovedadDialog";
import { MarkDeliveredDialog } from "../components/orders/MarkDeliveredDialog";
import { AccountBalanceRounded, AddCircleOutline, CurrencyExchange } from "@mui/icons-material";
import { usePermissions } from "../hooks/usePermissions";
import { ORDER_STATUS } from "../constants/OrderStatus";


export const Orders = () => {
    const { isAdmin, isSupervisor, canCreateOrders, userRole, isAgency, isDeliverer } = usePermissions();
    const userStore = useUserStore();
    const { searchTerm, setSearchTerm, selectedOrder, setSelectedOrder, filters, setFilters: setStoreFilters, activeModal, setActiveModal, setBulkColumns, changeStatus, registerNovelty } = useOrdersStore();
    const validateToken = useUserStore((state) => state.validateToken);

    const [openSearch, setOpenSearch] = useState(false);
    const [cities, setCities] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [sellers, setSellers] = useState<any[]>([]);

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
            const [citiesRes, agenciesRes, sellersRes] = await Promise.all([
                request("/cities", "GET"),
                request("/users/role/Agencia", "GET"),
                request("/users/role/Vendedor", "GET")
            ]);
            if (citiesRes.status) setCities(await citiesRes.response.json());
            if (agenciesRes.status) {
                const data = await agenciesRes.response.json();
                setAgencies(data.data);
            }
            if (sellersRes.status) {
                const data = await sellersRes.response.json();
                setSellers(data.data);
            }
        } catch (e) {
            console.error("Error fetching filters data", e);
        }
    };

    // NOTA: La carga de órdenes ahora es responsabilidad de cada columna (OrderList)
    // Orders.tsx solo gestiona los filtros globales.

    useEffect(() => {
        const validate = async () => {
            const result = await validateToken();
            if (!result.status) {
                toast.error("Sesión expirada, inicia sesión nuevamente.");
                return (window.location.href = "/");
            }
            if (isSupervisor) {
                fetchFiltersData();
            } else {
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

        validate();
    }, []);

    useEffect(() => {
        const fetchKanbanData = async () => {
            const params = new URLSearchParams();
            if (filters.city_id) params.append('city_id', filters.city_id);
            if (filters.agency_id) params.append('agency_id', filters.agency_id);
            if (filters.seller_id) params.append('seller_id', filters.seller_id);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (searchTerm) params.append('search', searchTerm);

            const queryString = params.toString();
            const { ok, response } = await request(`/kanban-data${queryString ? `?${queryString}` : ""}`, 'GET');
            if (ok) {
                const result = await response.json();
                setBulkColumns(result.data);
            }
        };
        const timer = setTimeout(() => {
            fetchKanbanData();
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [filters, searchTerm, setBulkColumns]);


    const handleClearFilters = () => {
        const emptyFilters = {
            city_id: '',
            agency_id: '',
            seller_id: '',
            date_from: '',
            date_to: ''
        };
        setStoreFilters(emptyFilters);
        setSearchTerm("");
        toast.info("Filtros limpiados ✨");
    };


    if (!userStore.user.token) return <Loading />;

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
                {isSupervisor && (
                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Ciudad</InputLabel>
                            <Select
                                value={filters.city_id}
                                label="Ciudad"
                                onChange={(e) => {
                                    setStoreFilters({ city_id: e.target.value });
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
                                    setStoreFilters({ agency_id: e.target.value });
                                }}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                {agencies.map(a => <MenuItem key={a.id} value={a.id}>{a.names}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Vendedora</InputLabel>
                            <Select
                                value={filters.seller_id}
                                label="Vendedora"
                                onChange={(e) => {
                                    setStoreFilters({ seller_id: e.target.value });
                                }}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                {sellers.map(s => <MenuItem key={s.id} value={s.id}>{s.names}</MenuItem>)}
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
                {isSupervisor && (
                    <Box display="flex" gap={1} alignItems="center">
                        <TextField
                            label="Desde"
                            type="date"
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={filters.date_from}
                            onChange={(e) => {
                                setStoreFilters({ date_from: e.target.value });
                            }}
                        />
                        <TextField
                            label="Hasta"
                            type="date"
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={filters.date_to}
                            onChange={(e) => {
                                setStoreFilters({ date_to: e.target.value });
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
                {canCreateOrders && (
                    <Box sx={{ width: { xs: '100%', lg: '10%' } }}>
                        <ButtonCustom
                            variant="outlined"
                            startIcon={<AddCircleOutline />}
                            onClick={() => setOpenCreateDialog(true)}
                        >
                            Crear Orden
                        </ButtonCustom>
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
                            backgroundColor: darken(userStore.user.color, 0.8),
                        },
                        "&::-webkit-scrollbar-thumb": {
                            borderRadius: "15px",
                            backgroundColor: lighten(userStore.user.color, 0.2),
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

                                {isSupervisor && (
                                    <>
                                        <OrderList title="Nuevo" />
                                        <OrderList title="Sin Stock" />
                                    </>
                                )}

                                {!isAgency && (
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

                                {(isSupervisor || isAgency) && (
                                    <>
                                        <OrderList title="Asignado a repartidor" />
                                        <OrderList title="En ruta" />
                                    </>
                                )}

                                {!isAgency && (
                                    <>
                                        <OrderList title="Programado para mas tarde" />
                                        <OrderList title="Programado para otro dia" />
                                    </>
                                )}

                                <OrderList title="Entregado" />
                                {!(isAgency || isDeliverer) && (
                                    <OrderList title="Cancelado" />
                                )}
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
            />
            {selectedOrder && (
                <OrderDialog
                    open={!!selectedOrder}
                    setOpen={(val) => {
                        if (!val) setSelectedOrder(null);
                    }}
                    id={selectedOrder.id}
                />
            )}

            {/* Centralized Modals */}
            {activeModal.type === 'assign_agent' && activeModal.data && (
                <AssignAgentDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    orderId={activeModal.data.id}
                />
            )}
            {activeModal.type === 'assign_deliverer' && activeModal.data && (
                <AssignDelivererDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    orderId={activeModal.data.id}
                />
            )}
            {activeModal.type === 'postpone' && activeModal.data && (
                <PostponeOrderDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    orderId={activeModal.data.id}
                    targetStatus={activeModal.data.targetStatus}
                />
            )}
            {activeModal.type === 'assign_agency' && activeModal.data && (
                <AssignAgencyDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    orderId={activeModal.data.id}
                />
            )}
            {activeModal.type === 'novelty' && activeModal.data && (
                <NoveltyDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    onSubmit={(type, desc) => {
                        registerNovelty(activeModal.data.id, type, desc);
                        setActiveModal(null);
                    }}
                />
            )}
            {activeModal.type === 'resolve_novelty' && activeModal.data && (
                <ResolveNovedadDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    onConfirm={(resolution) => {
                        changeStatus(activeModal.data.id, activeModal.data.pendingStatus?.description, { novedad_resolution: resolution });
                        setActiveModal(null);
                    }}
                />
            )}
            {activeModal.type === 'mark_delivered' && activeModal.data && (
                <MarkDeliveredDialog
                    open={true}
                    onClose={() => setActiveModal(null)}
                    order={activeModal.data}
                    binanceRate={activeModal.data.binance_rate ?? 0}
                    onConfirm={(extraData) => {
                        changeStatus(activeModal.data.id, activeModal.data.pendingStatus?.description, extraData);
                        setActiveModal(null);
                    }}
                />
            )}
        </Layout>
    );
};
