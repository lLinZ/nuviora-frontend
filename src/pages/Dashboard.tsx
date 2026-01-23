import { Toolbar, Box, Grid, Paper, Stack, Avatar, Divider, Tooltip, Chip } from "@mui/material";
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
    StarRounded
} from "@mui/icons-material";
import Masonry from "@mui/lab/Masonry";
import { useEffect, useState, FC } from "react";
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
    unassigned_agency_count?: number;
    unassigned_orders?: Array<{ id: number; name: string; current_total_price: number }>;
    pending_reviews?: {
        rejections: number;
        locations: number;
    };
    orders_today?: {
        created: number;
        delivered: number;
        cancelled: number;
    };
    top_sellers?: Array<{ id: number; names: string; agent_orders_count: number }>;
    top_deliverers?: Array<{ id: number; names: string; deliverer_orders_count: number }>;
    sales_history?: Array<{ date: string; count: number }>;

    // Legacy support for non-admin roles
    orders?: {
        assigned?: number;
        completed?: number;
        delivered?: number;
    };
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

export const Dashboard = () => {
    const user = useUserStore((state) => state.user);
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoAssigning, setAutoAssigning] = useState(false);
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
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
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
                                                {stats.unassigned_orders?.map((o: any, i: number) => (
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
                    </Grid>
                );

            case "Vendedor":
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Tus ganancias de hoy">
                            <TypographyCustom variant="body1">
                                Ganancia por ventas
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

                        <Widget title="Tus Órdenes">
                            <TypographyCustom variant="body2">
                                Asignadas hoy: {stats.orders?.assigned ?? 0}
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Completadas hoy: {stats.orders?.completed ?? 0}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
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
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Tus Órdenes">
                            <TypographyCustom variant="body2">
                                Asignadas a tu agencia hoy: {stats.orders?.assigned ?? 0}
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Entregadas por tu agencia hoy: {stats.orders?.delivered ?? 0}
                            </TypographyCustom>
                        </Widget>
                        <Widget title="Resumen">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {stats.message || "Bienvenido al panel de agencia."}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
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
