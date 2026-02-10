import { Toolbar, Box, Grid, Paper, Stack, Avatar, Divider, Tooltip, Chip, Checkbox, TextField } from "@mui/material";
import {
    ShoppingCartRounded,
    AttachMoneyRounded,
    TrendingUpRounded,
    WarningAmberRounded,
    AssignmentIndRounded,
    LocalShippingRounded,
    CancelRounded,
    ApartmentRounded,
    LocationOnRounded,
    StarRounded,
    CheckCircleRounded,
    HistoryRounded,
    Inventory2Outlined as Inventory2OutlinedIcon,
    FileDownloadRounded as FileDownloadRoundedIcon
} from "@mui/icons-material";
import Masonry from "@mui/lab/Masonry";
import { useEffect, useState, FC } from "react";
import * as XLSX from 'xlsx';
import dayjs from "dayjs";
import { darken, lighten } from "@mui/material/styles";
import { Layout } from "../components/ui/Layout";
import { useUserStore } from "../store/user/UserStore";
import { TypographyCustom, ButtonCustom } from "../components/custom";
import { Loading } from "../components/ui/content/Loading";
import { Widget } from "../components/widgets/Widget";
import { toast } from "react-toastify";
import { useValidateSession } from "../hooks/useValidateSession";
import { request } from "../common/request";
import { IResponse } from "../interfaces/response-type";
import { OrderDialog } from "../components/orders/OrderDialog";

interface DashboardStats {
    total_sales?: number;
    orders_sin_stock_count?: number;
    orders_sin_stock?: Array<{ id: number; name: string; current_total_price: number; created_at: string }>;
    unassigned_agency_count?: number;
    unassigned_agency_orders?: Array<{ id: number; name: string; current_total_price: number; created_at: string }>;
    inventory_deficit?: Array<{
        agency_id: number;
        agency_name: string;
        products: Array<{ name: string; current_stock: number; total_required: number }>;
    }>;
    low_stock_alerts?: Array<{
        warehouse_name: string;
        products: Array<{ name: string; quantity: number }>;
    }>;
    unassigned_city_count?: number;
    unassigned_city_orders?: Array<{ id: number; name: string; current_total_price: number, client?: any }>;
    missing_cities_summary?: Record<string, number>;
    pending_reviews?: {
        rejections: number;
        locations: number;
    };
    orders_today?: {
        created?: number;
        delivered?: number;
        cancelled?: number;
        assigned?: number;
        pending?: number;
    };
    top_sellers?: Array<{ id: number; names: string; agent_orders_count: number }>;
    top_deliverers?: Array<{ id: number; names: string; deliverer_orders_count: number }>;
    sales_history?: Array<{ date: string; count: number }>;
    pending_route_orders?: Array<any>;

    // Legacy support for non-admin roles
    orders?: {
        assigned?: number;
        completed?: number;
        delivered?: number;
        cancelled?: number;
    };
    recent_orders?: Array<any>;
    earnings_breakdown?: {
        orders?: number;
        upsells?: number;
        upsell_count?: number;
    };
    pending_vueltos?: Array<any>;
    earnings_usd?: number;
    earnings_local?: number;
    rule?: string;
    message?: string;
}

interface DashboardData {
    role: string;
    today: string;
    rate: number;
    stats: DashboardStats;
}

interface PendingVuelto {
    id: number;
    name: string;
    change_amount: number;
    change_amount_company: number;
    change_method_company: string;
    client: { first_name: string; last_name: string };
    agency?: { names: string };
}

export const Dashboard = () => {
    const user = useUserStore((state) => state.user);
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<DashboardData | null>(null);
    const [pendingVueltos, setPendingVueltos] = useState<PendingVuelto[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoAssigning, setAutoAssigning] = useState(false);
    const [agencySettlement, setAgencySettlement] = useState<any[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('month').format("YYYY-MM-DD"));
    const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [fetchingSettlement, setFetchingSettlement] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [showOrderDialog, setShowOrderDialog] = useState(false);

    const fetchData = async () => {
        if (!user.token) return;
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/dashboard', 'GET');
            if (status) {
                const json = await response.json();
                if (json.status) {
                    setData(json.data);
                }
            }

            // Fetch pending vueltos if admin/gerente
            if (['Admin', 'Gerente'].includes(user.role?.description || '')) {
                const { status: vStatus, response: vResponse } = await request('/orders/pending-vueltos', 'GET');
                if (vStatus) {
                    const vJson = await vResponse.json();
                    console.log({ vJson });
                    if (vJson.status) {
                        setPendingVueltos(vJson.orders);
                    }
                }
            }

            // Fetch agency settlement if agency
            if (user.role?.description === 'Agencia') {
                await fetchSettlement();
            }

        } catch (error) {
            console.error(error);
            toast.error("Error al cargar datos del dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isValid && !loadingSession) {
            fetchData();
        }
    }, [user.token, isValid, loadingSession]);

    if (loadingSession || !isValid || !user.token) {
        return <Loading />;
    }

    if (loading || !data) {
        return <Loading />;
    }

    const { role, today, stats } = data;

    const handleOpenOrder = (id: number) => {
        setSelectedOrderId(id);
        setShowOrderDialog(true);
    };

    const handleToggleNotification = async (order: any) => {
        try {
            const { status } = await request(`/orders/${order.id}/toggle-notification`, 'PUT');
            if (status) {
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const autoAssignLogistics = async () => {
        setAutoAssigning(true);
        try {
            const { status, response }: IResponse = await request("/orders/auto-assign-logistics", "POST");
            if (status) {
                const result = await response.json();
                toast.success(result.message);
                fetchData(); // Refresh stats
            } else {
                toast.error("Error al auto-asignar logística");
            }
        } catch (e) {
            toast.error("Error en el servidor");
        } finally {
            setAutoAssigning(false);
        }
    };

    const autoAssignCities = async () => {
        setLoading(true); // Reuse loading state or add a new one
        try {
            const { status, response }: IResponse = await request("/orders/auto-assign-cities", "POST");
            if (status) {
                const result = await response.json();
                toast.success(result.message);
                fetchData(); // Refresh stats
            } else {
                toast.error("Error al asignar ciudades");
            }
        } catch (e) {
            toast.error("Error en el servidor");
        } finally {
            setLoading(false);
        }
    };

    const fetchSettlement = async () => {
        setFetchingSettlement(true);
        try {
            const { status, response } = await request(`/earnings/summary?from=${fromDate}&to=${toDate}`, 'GET');
            if (status) {
                const json = await response.json();
                if (json.status) {
                    setAgencySettlement(json.data.agency_settlement || []);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingSettlement(false);
        }
    };

    const exportToExcel = (agency: any) => {
        if (!agency) return;
        const worksheetData = agency.order_details.map((d: any) => ({
            "Orden": `#${d.order_name}`,
            "Fecha": dayjs(d.updated_at).format('DD/MM/YYYY HH:mm'),
            "Total Orden": d.total_price,
            "Cobrado USD (Efec)": d.collected_usd,
            "Cobrado VES (Efec)": d.collected_ves,
            "Vuelto Agencia USD": d.change_usd,
            "Vuelto Agencia VES": d.change_ves,
            "Tasa Usada (Bs)": d.rate_ves ?? 0,
            "Vuelto Empresa (Monto)": d.change_company,
            "Vuelto Empresa (Método)": d.method_company,
            "Saldo Final USD": d.net_usd,
            "Saldo Final VES": d.net_ves,
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Liquidación");
        XLSX.writeFile(wb, `Liquidacion_${agency.agency_name.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.xlsx`);
    };

    const renderWidgetsByRole = () => {
        switch (role) {
            case "Admin":
            case "Gerente":
            case "Master":
                return (
                    <Grid container spacing={3}>
                        {/* 💰 PRIMARY METRICS */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper elevation={0} sx={{
                                p: 3, borderRadius: 5,
                                background: `linear-gradient(135deg, ${user.color} 0%, ${darken(user.color, 0.4)} 100%)`,
                                color: 'white', position: 'relative', overflow: 'hidden'
                            }}>
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                    <TypographyCustom variant="overline" sx={{ opacity: 0.8, fontWeight: 'bold' }}>Ventas Entregadas Hoy</TypographyCustom>
                                    <TypographyCustom variant="h3" fontWeight="900" sx={{ my: 1 }}>
                                        ${Number(stats.total_sales || 0).toFixed(2)}
                                    </TypographyCustom>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <TrendingUpRounded fontSize="small" />
                                        <TypographyCustom variant="caption">Actualizado en tiempo real</TypographyCustom>
                                    </Stack>
                                </Box>
                                <AttachMoneyRounded sx={{ position: 'absolute', right: -20, bottom: -20, fontSize: 180, opacity: 0.1, transform: 'rotate(-15deg)' }} />
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, md: 8 }}>
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Nuevas Hoy', value: stats.orders_today?.created, color: 'info.main', icon: <ShoppingCartRounded /> },
                                    { label: 'Entregadas Hoy', value: stats.orders_today?.delivered, color: 'success.main', icon: <LocalShippingRounded /> },
                                    { label: 'Canceladas Hoy', value: stats.orders_today?.cancelled, color: 'error.main', icon: <CancelRounded /> },
                                ].map((item, idx) => (
                                    <Grid size={{ xs: 12, sm: 4 }} key={idx}>
                                        <Paper elevation={0} sx={{
                                            p: 2.5, borderRadius: 4, bgcolor: 'background.paper',
                                            border: '1px solid', borderColor: 'divider',
                                            display: 'flex', alignItems: 'center', gap: 2,
                                            height: '100%'
                                        }}>
                                            <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, borderRadius: 3 }}>
                                                {item.icon}
                                            </Avatar>
                                            <Box>
                                                <TypographyCustom variant="h5" fontWeight="bold">{item.value ?? 0}</TypographyCustom>
                                                <TypographyCustom variant="caption" color="text.secondary">{item.label}</TypographyCustom>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>

                        {/* ⚠️ ACTION CENTER (ALERTS) */}
                        <Grid size={{ xs: 12, md: 5 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <WarningAmberRounded color="warning" /> Centro de Acción
                            </TypographyCustom>
                            <Stack spacing={2}>
                                {pendingVueltos.length > 0 && (
                                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(25, 118, 210, 0.05)', border: '2px solid', borderColor: 'primary.main' }}>
                                        <Stack spacing={2}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}>
                                                    <AttachMoneyRounded />
                                                </Avatar>
                                                <Box>
                                                    <TypographyCustom variant="subtitle1" fontWeight="900" color="primary.main">VUELTOS PENDIENTES</TypographyCustom>
                                                    <TypographyCustom variant="body2" color="text.secondary">Órdenes entregadas que requieren pago de vuelto</TypographyCustom>
                                                </Box>
                                            </Stack>
                                            <Divider />
                                            <Stack spacing={1} sx={{ maxHeight: 300, overflowY: 'auto' }}>
                                                {pendingVueltos.map((pv) => (
                                                    <Box key={pv.id}
                                                        onClick={() => handleOpenOrder(pv.id)}
                                                        sx={{
                                                            p: 2, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider',
                                                            cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }
                                                        }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <TypographyCustom variant="subtitle2" fontWeight="bold">#{pv.name} - {pv.client?.first_name} {pv.client?.last_name}</TypographyCustom>
                                                            <Chip label={`$${pv.change_amount}`} size="small" color="primary" sx={{ fontWeight: 'bold' }} />
                                                        </Box>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <TypographyCustom variant="caption" sx={{ bgcolor: 'action.selected', px: 1, py: 0.5, borderRadius: 1 }}>
                                                                {pv.change_method_company || 'Por definir'}
                                                            </TypographyCustom>
                                                            {pv.agency && (
                                                                <TypographyCustom variant="caption" color="text.secondary">
                                                                    Agencia: {pv.agency.names}
                                                                </TypographyCustom>
                                                            )}
                                                        </Stack>
                                                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                                            <ButtonCustom size="small" variant="contained" fullWidth onClick={(e: any) => {
                                                                e.stopPropagation();
                                                                handleOpenOrder(pv.id);
                                                            }}>
                                                                Gestionar Vuelto
                                                            </ButtonCustom>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                )}

                                {stats.inventory_deficit && stats.inventory_deficit.length > 0 && (
                                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(211, 47, 47, 0.05)', border: '2px solid', borderColor: 'error.main' }}>
                                        <Stack spacing={2}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar sx={{ bgcolor: 'error.main', color: 'white' }}>
                                                    <Inventory2OutlinedIcon />
                                                </Avatar>
                                                <Box>
                                                    <TypographyCustom variant="subtitle1" fontWeight="900" color="error.main">DÉFICIT DE INVENTARIO</TypographyCustom>
                                                    <TypographyCustom variant="body2" color="text.secondary">Productos faltantes para procesar órdenes "Sin Stock"</TypographyCustom>
                                                </Box>
                                            </Stack>

                                            <Divider />

                                            <Stack spacing={2.5}>
                                                {stats.inventory_deficit.map((agency, i) => (
                                                    <Box key={i}>
                                                        <TypographyCustom variant="caption" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'text.primary', textTransform: 'uppercase' }}>
                                                            <ApartmentRounded sx={{ fontSize: '1rem' }} /> {agency.agency_name}
                                                        </TypographyCustom>
                                                        <Stack spacing={1}>
                                                            {agency.products.map((p, j) => (
                                                                <Box key={j} sx={{
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    bgcolor: 'background.paper', p: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider'
                                                                }}>
                                                                    <Box>
                                                                        <TypographyCustom variant="body2" fontWeight="bold">{p.name}</TypographyCustom>
                                                                        <TypographyCustom variant="caption" color={p.current_stock === 0 ? "error" : "warning.main"}>
                                                                            Stock actual: {p.current_stock} un.
                                                                        </TypographyCustom>
                                                                    </Box>
                                                                    <Chip
                                                                        label={`Faltan ${p.total_required - p.current_stock} un.`}
                                                                        size="small"
                                                                        color="error"
                                                                        sx={{ fontWeight: 'bold' }}
                                                                    />
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                )}

                                {stats.low_stock_alerts && stats.low_stock_alerts.length > 0 && (
                                    <Paper elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255, 152, 0, 0.05)', border: '1px solid', borderColor: 'warning.main' }}>
                                        <Stack spacing={1.5}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <WarningAmberRounded color="warning" />
                                                    <Box>
                                                        <TypographyCustom variant="subtitle2" fontWeight="bold">Alertas de Stock Bajo</TypographyCustom>
                                                        <TypographyCustom variant="body2">Hay {stats.low_stock_alerts.reduce((acc, group) => acc + group.products.length, 0)} productos con menos de 15 unidades</TypographyCustom>
                                                    </Box>
                                                </Box>
                                                <Chip label="Reponer" color="warning" size="small" sx={{ fontWeight: 'bold' }} />
                                            </Stack>

                                            <Divider sx={{ borderColor: 'rgba(255, 152, 0, 0.1)' }} />

                                            <Stack spacing={2}>
                                                {stats.low_stock_alerts.map((group, i) => (
                                                    <Box key={i}>
                                                        <TypographyCustom variant="caption" fontWeight="bold" sx={{ color: 'warning.main', mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                            {group.warehouse_name}
                                                        </TypographyCustom>
                                                        <Stack spacing={1}>
                                                            {group.products.map((p, j) => (
                                                                <Box key={j} sx={{
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    bgcolor: 'background.paper', p: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider'
                                                                }}>
                                                                    <TypographyCustom variant="body2">{p.name}</TypographyCustom>
                                                                    <Chip label={`${p.quantity} u.`} size="small" color="warning" variant="outlined" sx={{ height: 20, fontWeight: 'bold' }} />
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                )}

                                {Number(stats.unassigned_agency_count) > 0 && (
                                    <Paper elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255, 152, 0, 0.1)', border: '1px solid', borderColor: 'warning.main' }}>
                                        <Stack spacing={1.5}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <ApartmentRounded color="warning" />
                                                    <Box>
                                                        <TypographyCustom variant="subtitle2" fontWeight="bold">Sin Agencia Asignada</TypographyCustom>
                                                        <TypographyCustom variant="body2">Hay {stats.unassigned_agency_count} órdenes pendientes de ruta</TypographyCustom>
                                                    </Box>
                                                </Box>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <ButtonCustom
                                                        variant="contained"
                                                        size="small"
                                                        color="warning"
                                                        onClick={autoAssignLogistics}
                                                        loading={autoAssigning}
                                                        disabled={autoAssigning}
                                                        sx={{ fontSize: '0.7rem', py: 0.5 }}
                                                    >
                                                        Auto-Asignar
                                                    </ButtonCustom>
                                                    <Chip label="Urgente" color="warning" size="small" sx={{ fontWeight: 'bold' }} />
                                                </Stack>
                                            </Stack>

                                            <Divider sx={{ borderColor: 'rgba(255, 152, 0, 0.2)' }} />

                                            <Stack spacing={1}>
                                                {stats.unassigned_agency_orders?.map((o: any, i: number) => (
                                                    <Box
                                                        key={i}
                                                        onClick={() => handleOpenOrder(o.id)}
                                                        sx={{
                                                            display: 'flex', justifyContent: 'space-between', p: 1,
                                                            borderRadius: 2, bgcolor: 'rgba(255, 152, 0, 0.05)',
                                                            cursor: 'pointer', transition: '0.2s',
                                                            '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.15)' }
                                                        }}
                                                    >
                                                        <TypographyCustom variant="caption" fontWeight="bold">#{o.name}</TypographyCustom>
                                                        <TypographyCustom variant="caption">${o.current_total_price}</TypographyCustom>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                )}

                                {Number(stats.unassigned_city_count) > 0 && (
                                    <Paper elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(244, 67, 54, 0.1)', border: '1px solid', borderColor: 'error.main' }}>
                                        <Stack spacing={1.5}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <LocationOnRounded color="error" />
                                                    <Box>
                                                        <TypographyCustom variant="subtitle2" fontWeight="bold">Ciudades No Registradas</TypographyCustom>
                                                        <TypographyCustom variant="body2">Hay {stats.unassigned_city_count} órdenes pendientes</TypographyCustom>
                                                    </Box>
                                                </Box>
                                                <ButtonCustom
                                                    variant="contained"
                                                    size="small"
                                                    color="error"
                                                    onClick={autoAssignCities}
                                                    loading={loading}
                                                    disabled={loading}
                                                    sx={{ fontSize: '0.7rem', py: 0.5 }}
                                                >
                                                    Asignar Automáticamente
                                                </ButtonCustom>
                                            </Stack>

                                            <Divider sx={{ borderColor: 'rgba(244, 67, 54, 0.2)' }} />

                                            {/* Summary List */}
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {Object.entries(stats.missing_cities_summary || {}).slice(0, 5).map(([city, count], i) => (
                                                    <Box key={i} sx={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        bgcolor: 'rgba(244, 67, 54, 0.1)', p: 1, borderRadius: 2
                                                    }}>
                                                        <TypographyCustom variant="body2" fontWeight="bold">{city}</TypographyCustom>
                                                        <Chip label={`${count} órdenes`} size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
                                                    </Box>
                                                ))}
                                                {Object.keys(stats.missing_cities_summary || {}).length > 5 && (
                                                    <TypographyCustom variant="caption" align="center" sx={{ opacity: 0.7 }}>
                                                        + {Object.keys(stats.missing_cities_summary || {}).length - 5} ciudades más
                                                    </TypographyCustom>
                                                )}
                                            </Box>

                                            {/* Scrollable Order List (Collapsed by default or small) */}
                                            <Box sx={{ maxHeight: 150, overflowY: 'auto', mt: 1, pr: 1 }}>
                                                <TypographyCustom variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>Detalle de órdenes:</TypographyCustom>
                                                <Stack spacing={0.5}>
                                                    {stats.unassigned_city_orders?.map((o: any, i: number) => (
                                                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.8 }}>
                                                            <span>#{o.name} ({o.city_name})</span>
                                                            <span>${o.current_total_price}</span>
                                                        </Box>
                                                    ))}
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                )}
                                {(Number(stats.pending_reviews?.rejections) > 0 || Number(stats.pending_reviews?.locations) > 0) && (
                                    <Paper elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(33, 150, 243, 0.1)', border: '1px solid', borderColor: 'info.main' }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <StarRounded color="info" />
                                                <Box>
                                                    <TypographyCustom variant="subtitle2" fontWeight="bold">Validaciones Pendientes</TypographyCustom>
                                                    <TypographyCustom variant="body2">
                                                        {stats.pending_reviews?.rejections || 0} Rechazos y {stats.pending_reviews?.locations || 0} Ubicaciones
                                                    </TypographyCustom>
                                                </Box>
                                            </Box>
                                            <Chip label="Revisar" color="info" size="small" sx={{ fontWeight: 'bold' }} />
                                        </Stack>
                                    </Paper>
                                )}
                                {!stats.unassigned_agency_count && !stats.pending_reviews?.rejections && (
                                    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider', textAlign: 'center' }}>
                                        <TypographyCustom variant="body2" color="text.secondary">✨ ¡Todo al día! No hay acciones pendientes.</TypographyCustom>
                                    </Paper>
                                )}
                            </Stack>
                        </Grid>

                        {/* 🏆 TOP PERFORMERS */}
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Top Vendedoras (7 días)</TypographyCustom>
                                    <Paper elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                        <Stack spacing={2}>
                                            {stats.top_sellers?.map((s: any, i: number) => (
                                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: user.color }}>{s.names.split(' ').map((n: string) => n[0]).join('')}</Avatar>
                                                        <TypographyCustom variant="body2">{s.names}</TypographyCustom>
                                                    </Box>
                                                    <TypographyCustom variant="caption" fontWeight="bold">{s.agent_orders_count} órdenes</TypographyCustom>
                                                </Box>
                                            ))}
                                            {!stats.top_sellers?.length && <TypographyCustom variant="caption">Sin datos en los últimos 7 días</TypographyCustom>}
                                        </Stack>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Top Repartidores (7 días)</TypographyCustom>
                                    <Paper elevation={0} sx={{ p: 2, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                        <Stack spacing={2}>
                                            {stats.top_deliverers?.map((s: any, i: number) => (
                                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: 'secondary.main' }}>{s.names.split(' ').map((n: string) => n[0]).join('')}</Avatar>
                                                        <TypographyCustom variant="body2">{s.names}</TypographyCustom>
                                                    </Box>
                                                    <TypographyCustom variant="caption" fontWeight="bold">{s.deliverer_orders_count} entr.</TypographyCustom>
                                                </Box>
                                            ))}
                                            {!stats.top_deliverers?.length && <TypographyCustom variant="caption">Sin datos en los últimos 7 días</TypographyCustom>}
                                        </Stack>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid >
                );


            case "Vendedor":
                return (
                    <Grid container spacing={3}>
                        {/* 💰 HERO CARD: EARNINGS */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper elevation={0} sx={{
                                p: 3, borderRadius: 5,
                                background: `linear-gradient(135deg, ${user.color} 0%, ${darken(user.color, 0.4)} 100%)`,
                                color: 'white', position: 'relative', overflow: 'hidden', height: '100%'
                            }}>
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                    <TypographyCustom variant="overline" sx={{ opacity: 0.8, fontWeight: 'bold', letterSpacing: 1 }}>Tus Comisiones Hoy</TypographyCustom>
                                    <TypographyCustom variant="h3" fontWeight="900" sx={{ mt: 1, mb: 0 }}>
                                        ${Number(stats.earnings_usd || 0).toFixed(2)}
                                    </TypographyCustom>
                                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                        <TypographyCustom variant="subtitle2" sx={{ opacity: 0.7 }}>
                                            {Number(stats.earnings_local || 0).toFixed(2)} Bs
                                        </TypographyCustom>
                                    </Stack>

                                    {/* Breakdown */}
                                    <Stack direction="row" spacing={2} sx={{ bgcolor: 'rgba(0,0,0,0.1)', p: 1.5, borderRadius: 2, backdropFilter: 'blur(10px)' }}>
                                        <Box>
                                            <TypographyCustom variant="caption" sx={{ opacity: 0.8, display: 'block', mb: -0.5 }}>Órdenes</TypographyCustom>
                                            <TypographyCustom variant="h6" fontWeight="bold">
                                                ${Number(stats.earnings_breakdown?.orders || 0).toFixed(2)}
                                            </TypographyCustom>
                                        </Box>
                                        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                                        <Box>
                                            <TypographyCustom variant="caption" sx={{ opacity: 0.8, display: 'block', mb: -0.5 }}>Upsell ({stats.earnings_breakdown?.upsell_count || 0})</TypographyCustom>
                                            <TypographyCustom variant="h6" fontWeight="bold">
                                                ${Number(stats.earnings_breakdown?.upsells || 0).toFixed(2)}
                                            </TypographyCustom>
                                        </Box>
                                    </Stack>

                                    <TypographyCustom variant="caption" sx={{ display: 'block', mt: 2, opacity: 0.6 }}>
                                        Regla: {stats.rule}
                                    </TypographyCustom>
                                </Box>
                                <AttachMoneyRounded sx={{ position: 'absolute', right: -20, bottom: -20, fontSize: 180, opacity: 0.1, transform: 'rotate(-15deg)' }} />
                            </Paper>
                        </Grid>

                        {/* 📊 ORDER STATS GRID */}
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AssignmentIndRounded color="primary" /> Resumen del Día
                            </TypographyCustom>
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Asignadas', value: stats.orders?.assigned, color: 'info.main', icon: <AssignmentIndRounded /> },
                                    { label: 'Completadas', value: stats.orders?.completed, color: 'success.main', icon: <CheckCircleRounded /> },
                                    { label: 'Entregadas', value: stats.orders?.delivered, color: 'secondary.main', icon: <LocalShippingRounded /> },
                                    { label: 'Canceladas', value: stats.orders?.cancelled, color: 'error.main', icon: <CancelRounded /> },
                                ].map((item, idx) => (
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                                        <Paper elevation={0} sx={{
                                            p: 2, borderRadius: 4, bgcolor: 'background.paper',
                                            border: '1px solid', borderColor: 'divider',
                                            display: 'flex', flexDirection: 'column', gap: 1,
                                            alignItems: 'center', textAlign: 'center',
                                            transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' }
                                        }}>
                                            <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, borderRadius: 3, width: 48, height: 48 }}>
                                                {item.icon}
                                            </Avatar>
                                            <Box>
                                                <TypographyCustom variant="h4" fontWeight="bold" color="text.primary">{item.value ?? 0}</TypographyCustom>
                                                <TypographyCustom variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase' }}>{item.label}</TypographyCustom>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>

                        {/* 🛒 RECENT ORDERS + CHART */}
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <HistoryRounded /> Órdenes Recientes
                            </TypographyCustom>
                            <Paper elevation={0} sx={{ borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                                {(stats.recent_orders && stats.recent_orders.length > 0) ? (
                                    <Stack divider={<Divider />}>
                                        {stats.recent_orders.map((o: any) => (
                                            <Box key={o.id} onClick={() => handleOpenOrder(o.id)} sx={{
                                                p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, transition: '0.2s'
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar sx={{ bgcolor: 'primary.light', color: 'white', width: 40, height: 40, fontWeight: 'bold' }}>
                                                        {o.client?.first_name?.[0]}{o.client?.last_name?.[0]}
                                                    </Avatar>
                                                    <Box>
                                                        <TypographyCustom variant="subtitle2" fontWeight="bold">
                                                            {o.client?.first_name} {o.client?.last_name}
                                                        </TypographyCustom>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <TypographyCustom variant="caption" color="text.secondary">#{o.name}</TypographyCustom>
                                                            <TypographyCustom variant="caption" color="text.disabled">•</TypographyCustom>
                                                            <TypographyCustom variant="caption" color="text.secondary">${o.current_total_price}</TypographyCustom>
                                                        </Stack>
                                                    </Box>
                                                </Box>
                                                <Chip
                                                    label={o.status?.description}
                                                    size="small"
                                                    color={
                                                        ['Entregado', 'Confirmado'].includes(o.status?.description) ? 'success' :
                                                            (['Cancelado'].includes(o.status?.description) ? 'error' : 'default')
                                                    }
                                                    sx={{ fontWeight: 'bold', borderRadius: 2 }}
                                                />
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
                                        <TypographyCustom variant="body2">No tienes órdenes recientes</TypographyCustom>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        {/* 📨 VUELTOS PENDIENTES */}
                        <Grid size={{ xs: 12, md: 8 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Inventory2OutlinedIcon /> Vueltos con Comprobante
                            </TypographyCustom>
                            <Paper elevation={0} sx={{ borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                                {(stats.pending_vueltos && stats.pending_vueltos.length > 0) ? (
                                    <Stack divider={<Divider />}>
                                        {stats.pending_vueltos.map((o: any) => (
                                            <Box key={o.id} sx={{
                                                p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                bgcolor: o.client_notified ? 'action.selected' : 'transparent',
                                                transition: '0.2s'
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Checkbox
                                                        checked={o.client_notified}
                                                        onChange={() => handleToggleNotification(o)}
                                                        color="success"
                                                        icon={<CheckCircleRounded sx={{ opacity: 0.3 }} />}
                                                        checkedIcon={<CheckCircleRounded />}
                                                    />
                                                    <Box onClick={() => handleOpenOrder(o.id)} sx={{ cursor: 'pointer' }}>
                                                        <TypographyCustom variant="subtitle2" fontWeight="bold" sx={{ textDecoration: o.client_notified ? 'line-through' : 'none', opacity: o.client_notified ? 0.6 : 1 }}>
                                                            #{o.name} - {o.client?.names || o.client?.first_name}
                                                        </TypographyCustom>
                                                        <TypographyCustom variant="caption" color="text.secondary">
                                                            Vuelto: {o.change_covered_by} • {o.status?.description}
                                                        </TypographyCustom>
                                                    </Box>
                                                </Box>
                                                {o.change_extra?.change_receipt && (
                                                    <Chip
                                                        label="Ver Recibo"
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => window.open(`${import.meta.env.VITE_BACKEND_API_URL}/orders/${o.id}/change-receipt`, '_blank')}
                                                        sx={{ cursor: 'pointer' }}
                                                    />
                                                )}
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
                                        <TypographyCustom variant="body2">No hay vueltos pendientes de notificar</TypographyCustom>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingUpRounded /> Rendimiento Semanal
                            </TypographyCustom>
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: 'fit-content' }}>
                                {stats.sales_history && (
                                    <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ height: 200, pt: 2 }}>
                                        {stats.sales_history.map((day: any, i: number) => {
                                            // Normalize height
                                            const max = Math.max(...stats.sales_history!.map((d: any) => d.count), 1);
                                            const height = (day.count / max) * 150;

                                            return (
                                                <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 1 }}>
                                                    <Tooltip title={`${day.count} Ventas`}>
                                                        <Box sx={{
                                                            width: '60%',
                                                            background: `linear-gradient(to top, ${user.color} 0%, ${lighten(user.color, 0.5)} 100%)`,
                                                            borderRadius: 2,
                                                            height: `${Math.max(height, 4)}px`,
                                                            transition: 'height 0.5s',
                                                            '&:hover': { filter: 'brightness(1.1)' }
                                                        }} />
                                                    </Tooltip>
                                                    <TypographyCustom variant="caption" fontWeight="bold" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                        {day.date}
                                                    </TypographyCustom>
                                                </Box>
                                            )
                                        })}
                                    </Stack>
                                )}
                                <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                                    <TypographyCustom variant="caption" align="center" display="block" color="text.secondary">
                                        Ventas confirmadas en los últimos 7 días
                                    </TypographyCustom>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                );

            case "Repartidor":
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Tus ganancias de hoy">
                            <TypographyCustom variant="body1">
                                Ganancia por entregas
                            </TypographyCustom>
                            <TypographyCustom variant="h5" fontWeight="bold">
                                ${Number(stats.earnings_usd || 0).toFixed(2)} USD
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary">
                                {Number(stats.earnings_local || 0).toFixed(2)} Bs
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                                Regla: {stats.rule}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Tus Entregas">
                            <TypographyCustom variant="body2">
                                Asignadas hoy: {stats.orders?.assigned ?? 0}
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Entregadas hoy: {stats.orders?.delivered ?? 0}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );

            case "Agencia":
                return (
                    <Grid container spacing={3}>
                        {/* 📊 AGENCY PRIMARY METRICS */}
                        {/* 📊 AGENCY PRIMARY METRICS */}
                        {/* <Grid size={{ xs: 12, md: 4 }}>
                            <Paper elevation={0} sx={{
                                p: 3, borderRadius: 5,
                                background: `linear-gradient(135deg, ${user.color} 0%, ${darken(user.color, 0.3)} 100%)`,
                                color: 'white', position: 'relative', overflow: 'hidden'
                            }}>
                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                    <TypographyCustom variant="overline" sx={{ opacity: 0.8, fontWeight: 'bold' }}>Tus Ganancias Hoy</TypographyCustom>
                                    <TypographyCustom variant="h3" fontWeight="900" sx={{ my: 1 }}>
                                        ${Number(stats.earnings_usd || 0).toFixed(2)}
                                    </TypographyCustom>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <TrendingUpRounded fontSize="small" />
                                        <TypographyCustom variant="caption">{Number(stats.earnings_local || 0).toFixed(2)} Bs</TypographyCustom>
                                    </Stack>
                                </Box>
                                <AttachMoneyRounded sx={{ position: 'absolute', right: -20, bottom: -20, fontSize: 180, opacity: 0.1, transform: 'rotate(-15deg)' }} />
                            </Paper>
                        </Grid> */}

                        <Grid size={{ xs: 12, md: 8 }}>
                            <Grid container spacing={2}>
                                {[
                                    { label: 'Asignadas Hoy', value: stats.orders_today?.assigned, color: 'info.main', icon: <AssignmentIndRounded /> },
                                    { label: 'Entregadas Hoy', value: stats.orders_today?.delivered, color: 'success.main', icon: <LocalShippingRounded /> },
                                    { label: 'Pendientes Ruta', value: stats.orders_today?.pending, color: 'warning.main', icon: <LocationOnRounded /> },
                                ].map((item, idx) => (
                                    <Grid size={{ xs: 12, sm: 4 }} key={idx}>
                                        <Paper elevation={0} sx={{
                                            p: 2.5, borderRadius: 4, bgcolor: 'background.paper',
                                            border: '1px solid', borderColor: 'divider',
                                            display: 'flex', alignItems: 'center', gap: 2,
                                            height: '100%'
                                        }}>
                                            <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, borderRadius: 3 }}>
                                                {item.icon}
                                            </Avatar>
                                            <Box>
                                                <TypographyCustom variant="h5" fontWeight="bold">{item.value ?? 0}</TypographyCustom>
                                                <TypographyCustom variant="caption" color="text.secondary">{item.label}</TypographyCustom>
                                            </Box>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Grid>

                        {/* 🏢 AGENCY INFO */}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TypographyCustom variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ApartmentRounded color="primary" /> Resumen de Agencia
                            </TypographyCustom>
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                <TypographyCustom variant="body1" sx={{ mb: 2 }}>
                                    {stats.message || "Gestiona las entregas y repartidores de tu zona asignada."}
                                </TypographyCustom>
                                <Divider sx={{ my: 2 }} />
                                <Stack direction="row" spacing={2} justifyContent="space-around">
                                    <Box textAlign="center">
                                        <TypographyCustom variant="h4" fontWeight="bold" color="primary.main">
                                            {stats.orders_today?.delivered || 0}
                                        </TypographyCustom>
                                        <TypographyCustom variant="caption" color="text.secondary">Total Entregadas</TypographyCustom>
                                    </Box>
                                    <Box textAlign="center">
                                        <TypographyCustom variant="h4" fontWeight="bold" color="success.main">
                                            ${Number(stats.total_sales || 0).toFixed(0)}
                                        </TypographyCustom>
                                        <TypographyCustom variant="caption" color="text.secondary">Volumen Ventas</TypographyCustom>
                                    </Box>
                                </Stack>
                                <Divider sx={{ my: 2 }} />
                                <Stack spacing={2} sx={{ mb: 3 }}>
                                    <TypographyCustom variant="subtitle2" fontWeight="bold">Periodo de Liquidación</TypographyCustom>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <TextField
                                            label="Desde"
                                            type="date"
                                            size="small"
                                            fullWidth
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                        <TextField
                                            label="Hasta"
                                            type="date"
                                            size="small"
                                            fullWidth
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Stack>
                                    <ButtonCustom
                                        variant="outlined"
                                        onClick={fetchSettlement}
                                        loading={fetchingSettlement}
                                    >
                                        Actualizar Reporte
                                    </ButtonCustom>
                                </Stack>
                                <Divider sx={{ my: 2 }} />
                                <ButtonCustom
                                    variant="contained"
                                    fullWidth
                                    startIcon={<FileDownloadRoundedIcon />}
                                    disabled={agencySettlement.length === 0 || fetchingSettlement}
                                    onClick={() => exportToExcel(agencySettlement[0])}
                                    sx={{
                                        borderRadius: 3,
                                        py: 1.5,
                                        fontWeight: 'bold',
                                        textTransform: 'none',
                                        boxShadow: 2
                                    }}
                                >
                                    Descargar Liquidación (Excel)
                                </ButtonCustom>
                            </Paper>
                        </Grid>
                    </Grid>
                );

            default:
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Resumen">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {stats.message || "Bienvenido al sistema."}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );
        }
    };

    return (
        <Layout>
            <Toolbar />
            <Box sx={{ mb: 2 }}>
                <TypographyCustom fontWeight={"bold"} variant="h4">
                    ¡Bienvenido {user.names}!
                </TypographyCustom>
                <TypographyCustom color={"text.secondary"} variant="body1">
                    Hoy es {today}. Aquí tienes un resumen de tu día como {role || user.role?.description || "usuario"}.
                </TypographyCustom>
            </Box>

            {renderWidgetsByRole()}

            {showOrderDialog && selectedOrderId && (
                <OrderDialog
                    open={showOrderDialog}
                    setOpen={(isOpen) => {
                        setShowOrderDialog(isOpen);
                        if (!isOpen) { // If dialog is closing
                            setSelectedOrderId(null); // Clear selected order
                            fetchData(); // Refetch data
                        }
                    }}
                    id={selectedOrderId}
                />
            )}
        </Layout>
    );
};
