import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Stack,
    Pagination,
    CircularProgress,
    Tooltip,
    IconButton,
    LinearProgress,
    alpha,
    useTheme
} from '@mui/material';
import {
    RefreshRounded,
    HistoryRounded,
    AssignmentIndRounded,
    FilterAltRounded,
    VisibilityRounded
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { request } from '../common/request';
import { IResponse } from '../interfaces/response-type';
import { Layout } from '../components/ui/Layout';
import { OrderDialog } from '../components/orders/OrderDialog';
import { useSocketStore } from '../store/sockets/SocketStore';
import { useUserStore } from '../store/user/UserStore';

export const OrderTrackingReport: React.FC = () => {
    const theme = useTheme();
    // Filters
    const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [agentId, setAgentId] = useState('');
    const [statusId, setStatusId] = useState('');

    // Data
    const [logs, setLogs] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any>({
        by_status: [],
        by_seller: [],
        total_movements: 0,
        total_orders: 0,
        agency_rate: '0%',
        novelty_stats: { total: 0, resolved: 0, rate: '0%' }
    });

    // Sockets
    const echo = useSocketStore((s) => s.echo);
    const user = useUserStore((s) => s.user);

    // Filter Options
    const [agents, setAgents] = useState<any[]>([]);
    const [statuses, setStatuses] = useState<any[]>([]);

    // Order Dialog
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [showOrderDialog, setShowOrderDialog] = useState(false);

    const fetchFilters = async () => {
        try {
            const { status, response }: IResponse = await request('/reports/tracking-comprehensive/filters', 'GET');
            if (status === 200) {
                const json = await response.json();
                setAgents(json.agents || []);
                setStatuses(json.statuses || []);
            } else {
                console.error("Non-200 status fetching filters:", status);
            }
        } catch (error) {
            console.error("Error fetching filters", error);
        }
    };

    const fetchLogs = async (p = page) => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                start_date: startDate,
                end_date: endDate,
                agent_id: agentId,
                status_id: statusId,
                page: p.toString()
            });
            const { status, response }: IResponse = await request(`/reports/tracking-comprehensive?${query.toString()}`, 'GET');
            if (status === 200) {
                const json = await response.json();
                if (json.data) {
                    setLogs(json.data.data || []);
                    setTotalPages(json.data.last_page || 1);
                    setStats(json.stats || { by_status: [], by_seller: [], total_movements: 0 });
                }
            } else {
                console.error("Non-200 status fetching logs:", status);
            }
        } catch (error) {
            console.error("Error fetching logs", error);
        } finally {
            setLoading(false);
        }
    };

    // 1. Carga inicial (Solo al montar)
    useEffect(() => {
        fetchFilters();
        fetchLogs(1);
    }, []);

    // 2. Escucha de Sockets (Refresca con filtros actuales)
    useEffect(() => {
        if (!echo || !user?.id) return;

        const role = user.role?.description?.toLowerCase() || '';
        let channelName = 'orders';

        if (role.includes('agencia')) {
            channelName = `orders.agency.${user.id}`;
        } else if (role.includes('vendedor')) {
            channelName = `orders.agent.${user.id}`;
        } else if (role.includes('repartidor')) {
            channelName = `orders.deliverer.${user.id}`;
        }

        const channel = echo.private(channelName);

        // Función de refresco que captura el estado actual gracias a las dependencias
        const handleOrderUpdate = () => {
            console.log("Order updated via WebSocket, refreshing tracking logs...");
            fetchLogs(page);
        };

        channel.listen('OrderUpdated', handleOrderUpdate);

        return () => {
            channel.stopListening('OrderUpdated');
        };
    }, [echo, user?.id, page, startDate, endDate, agentId, statusId]);

    const handleSearch = () => {
        setPage(1);
        fetchLogs(1);
    };

    const statusFlowOrder = [
        'Reprogramado para hoy',
        'Asignado a vendedor',
        'Llamado 1',
        'Llamado 2',
        'Llamado 3',
        'Esperando Ubicacion',
        'Programado para mas tarde',
        'Programado para otro dia',
        'Asignar a agencia',
        'Asignado a repartidor',
        'Novedades',
        'Novedad Solucionada',
        'En ruta',
        'Cancelado',
        'Entregado'
    ];

    const sortedStatusStats = [...(stats.by_status || [])].sort((a, b) => {
        const indexA = statusFlowOrder.indexOf(a.status);
        const indexB = statusFlowOrder.indexOf(b.status);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const handlePageChange = (_: any, value: number) => {
        setPage(value);
        fetchLogs(value);
    };

    const handleOpenOrder = (id: number) => {
        setSelectedOrderId(id);
        setShowOrderDialog(true);
    };

    return (
        <Layout>
            <Box sx={{ p: 3 }}>
                <Box mb={3}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>Seguimiento de Órdenes Detallado</Typography>
                    <Typography color="text.secondary">Movimientos en tiempo real y auditoría por vendedora</Typography>
                </Box>

                <Paper sx={{ p: 3, mb: 3, borderRadius: 4 }}>
                    <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                        <FilterAltRounded color="primary" />
                        <Typography variant="h6" fontWeight="bold">Filtros de Búsqueda</Typography>
                    </Stack>

                    <Grid container spacing={2} alignItems="flex-end">
                        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                            <TextField
                                fullWidth
                                label="Desde"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                            <TextField
                                fullWidth
                                label="Hasta"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <FormControl fullWidth>
                                <InputLabel>Vendedora</InputLabel>
                                <Select
                                    value={agentId}
                                    label="Vendedora"
                                    onChange={(e) => setAgentId(e.target.value)}
                                >
                                    <MenuItem value="">Todas</MenuItem>
                                    {agents?.map((a) => (
                                        <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>Estado Destino</InputLabel>
                                <Select
                                    value={statusId}
                                    label="Estado Destino"
                                    onChange={(e) => setStatusId(e.target.value)}
                                >
                                    <MenuItem value="">Todos</MenuItem>
                                    {statuses?.map((s) => (
                                        <MenuItem key={s.id} value={s.id}>{s.description}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, md: 3 }}>
                            <Stack direction="row" spacing={1}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={handleSearch}
                                    startIcon={<RefreshRounded />}
                                    sx={{ borderRadius: 2, py: 1.5 }}
                                >
                                    Buscar / Refrescar
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>

                {stats.total_movements > 0 && (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper sx={{ p: 2, borderRadius: 4, height: '100%', bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <HistoryRounded fontSize="small" /> Distribución por Estado (Flujo)
                                </Typography>
                                <Stack spacing={1.5} mt={2}>
                                    {sortedStatusStats.map((s: any, i: number) => (
                                        <Box key={i}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography variant="caption" fontWeight="bold">{s.status}</Typography>
                                                <Typography variant="caption" fontWeight="bold" color="primary">{s.total}</Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={(s.total / stats.total_movements) * 100}
                                                sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)', '& .MuiLinearProgress-bar': { borderRadius: 3 } }}
                                            />
                                        </Box>
                                    ))}
                                </Stack>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Paper sx={{ p: 2, borderRadius: 4, height: '100%', bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Typography variant="subtitle2" color="secondary" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AssignmentIndRounded fontSize="small" /> Rendimiento por Vendedora (ENT%)
                                </Typography>
                                <Stack spacing={1.5} mt={2}>
                                    {stats.by_seller.map((s: any, i: number) => (
                                        <Box key={i}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="caption" fontWeight="bold">{s.seller}</Typography>
                                                    <Typography variant="caption" color="success.main" sx={{ fontSize: '10px', fontWeight: 'bold' }}>
                                                        {s.delivery_rate} ENT | {s.unique_orders} OUP
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" fontWeight="bold" color="secondary" title="Acciones Totales">{s.total} Mov.</Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={s.delivery_rate_numeric || 0}
                                                color="success"
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    bgcolor: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    '& .MuiLinearProgress-bar': { borderRadius: 4 }
                                                }}
                                            />
                                        </Box>
                                    ))}
                                </Stack>
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                            <Paper sx={{ p: 2, borderRadius: 4, height: '100%', bgcolor: 'rgba(25, 118, 210, 0.08)', border: '1px solid rgba(25, 118, 210, 0.2)' }}>
                                <Typography variant="subtitle2" color="info.main" fontWeight="bold" gutterBottom>
                                    🚀 Eficiencia Operativa
                                </Typography>
                                <Stack spacing={2} mt={1}>
                                    <Box>
                                        <Typography variant="caption" display="block" color="text.secondary">Tasa de Asignación a Agencia</Typography>
                                        <Typography variant="h6" fontWeight="extrabold">{stats.agency_rate}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" display="block" color="text.secondary">Resolución de Novedades</Typography>
                                        <Stack direction="row" spacing={1} alignItems="baseline">
                                            <Typography variant="h6" fontWeight="extrabold">{stats.novelty_stats.rate}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ({stats.novelty_stats.resolved}/{stats.novelty_stats.total})
                                            </Typography>
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, md: 8 }}>
                            <Paper sx={{ p: 2, borderRadius: 4, height: '100%', bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <HistoryRounded fontSize="small" /> Movimientos por Estado
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                    {(() => {
                                        const assignedToSeller = stats.by_status.find((s: any) => s.status === 'Asignado a vendedor');
                                        const baseTotal = assignedToSeller ? assignedToSeller.total : 0;

                                        return sortedStatusStats.map((s: any, i: number) => {
                                            const percentage = baseTotal > 0 ? ((s.total / baseTotal) * 100).toFixed(1) : null;
                                            const isBaseStatus = s.status === 'Asignado a vendedor';

                                            return (
                                                <Paper key={i} sx={{
                                                    px: 1.5, py: 0.5,
                                                    borderRadius: 2,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    bgcolor: isBaseStatus ? alpha(theme.palette.primary.main, 0.1) : 'background.paper',
                                                    border: isBaseStatus ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}` : 'none'
                                                }}>
                                                    <Typography variant="caption" fontWeight="bold">{s.status}:</Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <Chip size="small" label={s.total} color="primary" sx={{ height: 20, fontWeight: 'bold' }} />
                                                        {percentage && !isBaseStatus && (
                                                            <Typography variant="caption" sx={{ fontWeight: 'black', color: 'success.main', fontSize: '0.65rem' }}>
                                                                {percentage}%
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Paper>
                                            );
                                        });
                                    })()}
                                </Box>
                                <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.6 }}>
                                    Total de órdenes únicas procesadas: <b>{stats.total_orders}</b> | Movimientos totales: <b>{stats.total_movements}</b> | <i>Base conversión (Asig. Vendedor): <b>{stats.by_status.find((s: any) => s.status === 'Asignado a vendedor')?.total || 0}</b></i>
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                )}

                <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden' }}>
                    {loading && <Box sx={{ width: '100%', position: 'absolute' }}><CircularProgress size={24} sx={{ m: 2 }} /></Box>}
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell><b>Fecha/Hora</b></TableCell>
                                <TableCell><b>Orden</b></TableCell>
                                <TableCell><b>Movimiento</b></TableCell>
                                <TableCell><b>Vendedora Encargada</b></TableCell>
                                <TableCell><b>Usuario Acción</b></TableCell>
                                <TableCell><b>Detalle Automático</b></TableCell>
                                <TableCell align="center"><b>Acciones</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                                        <Typography color="text.secondary">No se encontraron movimientos registrados</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                            {logs.map((log) => (
                                <TableRow key={log.id} hover>
                                    <TableCell>{dayjs(log.updated_at).format('DD/MM/YYYY HH:mm:ss')}</TableCell>
                                    <TableCell>
                                        <Typography fontWeight="bold" color="primary">
                                            #{log.order?.number}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Stack spacing={0.5}>
                                            <Chip
                                                size="small"
                                                label={log.from_status?.description || 'Inicio'}
                                                variant="outlined"
                                            />
                                            <Typography align="center" variant="caption">➔</Typography>
                                            <Chip
                                                size="small"
                                                label={log.to_status?.description}
                                                color="primary"
                                            />
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <AssignmentIndRounded fontSize="small" color="action" />
                                            <Typography variant="body2">{log.seller?.name || '---'}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">
                                            {log.user?.name || 'Sistema'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                            {log.description}
                                        </Typography>
                                        {(log.was_reassigned || log.was_unassigned) && (
                                            <Box mt={0.5}>
                                                <Chip
                                                    size="small"
                                                    label={log.was_reassigned ? "Reasignación" : "Desasignación"}
                                                    color="warning"
                                                    sx={{ fontSize: '10px', height: '18px' }}
                                                />
                                            </Box>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Ver Pedido">
                                            <IconButton onClick={() => handleOpenOrder(log.order_id)}>
                                                <VisibilityRounded color="primary" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={handlePageChange}
                        color="primary"
                    />
                </Box>
            </Box>

            <OrderDialog
                open={showOrderDialog}
                setOpen={setShowOrderDialog}
                id={selectedOrderId || undefined}
            />
        </Layout>
    );
};
