import React, { useEffect, useState } from "react";
import {
    Box, Paper, Typography, TextField, Table, TableHead, TableRow, TableCell,
    TableBody, CircularProgress, Divider, Card, CardContent, Stack, Chip,
    Avatar, Tooltip, MenuItem, FormControl, InputLabel, Select,
    Collapse, IconButton
} from "@mui/material";
import * as XLSX from 'xlsx';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import Grid from "@mui/material/Grid";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { request } from "../../common/request";
import { RequireRole } from "../../components/auth/RequireRole";
import { IResponse } from "../../interfaces/response-type";
import { fmtMoney } from "../../lib/money";
import { Layout } from "../../components/ui/Layout";
import { ButtonCustom } from "../../components/custom";
import { useValidateSession } from "../../hooks/useValidateSession";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import CurrencyExchangeRoundedIcon from '@mui/icons-material/CurrencyExchangeRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import { OrderDialog } from "../../components/orders/OrderDialog";

type SummaryData = {
    vendors: any[];
    deliverers: any[];
    managers: any[];
    agencies: any[];
    upsells: any[];
    global_users: any[];
    orders_with_change: any[];
    agency_settlement: any[];
    totals: {
        all_usd: number;
        vendors_usd: number;
        deliverers_usd: number;
        managers_usd: number;
        agencies_usd: number;
        upsells_usd: number;
    };
    rates: {
        bcv: number;
        binance: number;
        bcv_eur: number;
    };
};

export const EarningsAdmin: React.FC = () => {
    const [from, setFrom] = useState(dayjs().startOf('month').format("YYYY-MM-DD"));
    const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
    const [data, setData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(false);
    const { loadingSession, isValid, user } = useValidateSession();


    // Order Dialog
    const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>(undefined);
    const [openDialog, setOpenDialog] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("from", from);
            params.append("to", to);
            const { status, response }: IResponse = await request(`/earnings/summary?${params.toString()}`, "GET");
            if (status) {
                const json = await response.json();
                setData(json.data);
            } else {
                toast.error("No se pudieron cargar las ganancias");
            }
        } catch {
            toast.error("Error al cargar ganancias");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (isValid) load(); }, [isValid]);

    const openOrder = (id: number) => {
        setSelectedOrderId(id);
        setOpenDialog(true);
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;


    return (
        <RequireRole allowedRoles={["Admin", "Gerente"]}>
            <Layout>
                <DescripcionDeVista title="Panel de Ganancias Globales" description="Monitoreo centralizado de comisiones, métricas de conversión y gestión de vueltos." />

                <Box sx={{ p: { xs: 1, md: 3 }, display: "grid", gap: 3 }}>
                    <Paper sx={{
                        p: 3,
                        borderRadius: 4,
                        bgcolor: 'background.paper',
                        boxShadow: 2,
                        border: '1px solid',
                        borderColor: 'divider'
                    }} elevation={0}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
                            <TextField
                                label="Desde"
                                type="date"
                                size="small"
                                value={from}
                                onChange={e => setFrom(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                            />
                            <TextField
                                label="Hasta"
                                type="date"
                                size="small"
                                value={to}
                                onChange={e => setTo(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                            />
                            <ButtonCustom variant="contained" onClick={load} disabled={loading} sx={{ minWidth: 200 }}>Consultar Periodo</ButtonCustom>
                        </Stack>
                    </Paper>

                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 10 }}><CircularProgress size={60} /></Box>
                    ) : (data && (
                        <>
                            {/* Tasas del Día */}
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <RateCard title="Tasa BCV (USD/VES)" rate={data.rates.bcv} icon={<CurrencyExchangeRoundedIcon />} color="#2196f3" />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <RateCard title="Tasa Binance (P2P)" rate={data.rates.binance} icon={<CurrencyExchangeRoundedIcon />} color="#fbc02d" />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <RateCard title="Tasa BCV (EUR/VES)" rate={data.rates.bcv_eur} icon={<CurrencyExchangeRoundedIcon />} color="#9c27b0" />
                                </Grid>
                            </Grid>

                            {/* Totales Globales Proyectados */}
                            <Paper sx={{ p: 4, borderRadius: 5, background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white', overflow: 'hidden', position: 'relative' }}>
                                <Box sx={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}>
                                    <TrendingUpRoundedIcon sx={{ fontSize: 200, color: 'white' }} />
                                </Box>
                                <Grid container spacing={4} alignItems="center">
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 2, color: 'white' }}>TOTAL GENERAL COMISIONES</Typography>
                                        <Typography variant="h2" fontWeight="900" sx={{ mb: 1, color: 'white' }}>{fmtMoney(data.totals.all_usd, 'USD')}</Typography>
                                        <Chip label="Periodo Seleccionado" size="small" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} variant="outlined" />
                                    </Grid>
                                    <Grid item xs={12} md={8}>
                                        <Grid container spacing={3}>
                                            <TotalProjection title="Proyección BCV" amountUsd={data.totals.all_usd} rate={data.rates.bcv} />
                                            <TotalProjection title="Proyección Binance" amountUsd={data.totals.all_usd} rate={data.rates.binance} />
                                            <TotalProjection title="Proyección BCV EUR" amountUsd={data.totals.all_usd} rate={data.rates.bcv_eur} />
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Paper>

                            {/* SECCIÓN: DESGLOSE CONSOLIDADO POR USUARIO */}
                            <Paper sx={{ p: 4, borderRadius: 5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 3 }}>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                                    <AccountBalanceWalletRoundedIcon sx={{ color: 'primary.main', fontSize: 32 }} />
                                    <Box>
                                        <Typography variant="h5" fontWeight="900">Desglose Consolidado</Typography>
                                        <Typography variant="caption" color="text.secondary">Total acumulado por cada usuario (todos sus roles combinados)</Typography>
                                    </Box>
                                </Stack>
                                <Divider sx={{ mb: 3 }} />
                                <Table size="medium">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Usuario</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Rol Principal</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Órdenes</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Comisión Local (Estimada)</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total a Pagar (USD)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.global_users.map(u => (
                                            <TableRow key={u.user_id} hover>
                                                <TableCell>
                                                    <Stack direction="row" spacing={2} alignItems="center">
                                                        <Avatar sx={{ bgcolor: u.color || 'primary.main', width: 32, height: 32, fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                            {u.names.charAt(0)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="body1" fontWeight="bold">{u.names} {u.surnames}</Typography>
                                                            <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                                                        </Box>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip label={u.role_name} size="small" variant="filled" color="primary" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }} />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Typography variant="body2" fontWeight="bold">{u.orders_count}</Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Calculado a tasa BCV USD">
                                                        <Typography variant="body2" color="text.secondary">{fmtMoney(u.amount_local, 'VES')}</Typography>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="h6" fontWeight="900" color="primary.main">{fmtMoney(u.amount_usd, 'USD')}</Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {data.global_users.length === 0 && (
                                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>Sin actividad registrada</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Paper>

                            {/* SECCIÓN: LIQUIDACIÓN DE AGENCIAS */}
                            <AgencySettlementTable settlement={data.agency_settlement} openOrder={openOrder} />


                            <Typography variant="h6" fontWeight="bold" sx={{ mt: 2, mb: -1 }}>Detalle por Categoría</Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} lg={6}>
                                    <EarningsTable title="Vendedoras ($1.00 / orden)" rows={data.vendors} icon={<GroupsRoundedIcon color="primary" />} />
                                </Grid>
                                <Grid item xs={12} lg={6}>
                                    <EarningsTable title="Repartidores ($2.50 / orden)" rows={data.deliverers} icon={<GroupsRoundedIcon color="secondary" />} />
                                </Grid>

                                <Grid item xs={12} lg={6}>
                                    <EarningsTable title="Upsells ($1.00 / producto adicional)" rows={data.upsells} icon={<TrendingUpRoundedIcon sx={{ color: '#ff9800' }} />} />
                                </Grid>
                                <Grid item xs={12}>
                                    <EarningsTable title="Resumen Gerentes ($0.50 / venta exitosa)" rows={data.managers} icon={<GroupsRoundedIcon sx={{ color: '#e91e63' }} />} />
                                </Grid>
                            </Grid>
                        </>
                    ))}
                </Box>
                <OrderDialog id={selectedOrderId} open={openDialog} setOpen={setOpenDialog} />
            </Layout>
        </RequireRole>
    );
};

const RateCard = ({ title, rate, icon, color }: any) => (
    <Card sx={{
        borderRadius: 4,
        borderLeft: `6px solid ${color}`,
        boxShadow: 2,
        bgcolor: 'background.paper'
    }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${color}15`, color: color }}>{icon}</Box>
            <Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">{title}</Typography>
                <Typography variant="h5" fontWeight="bold" color="text.primary">{rate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Typography>
            </Box>
        </CardContent>
    </Card>
);

const TotalProjection = ({ title, amountUsd, rate }: any) => (
    <Grid item xs={4}>
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5, color: 'white' }}>{title}</Typography>
        <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>{fmtMoney(amountUsd * rate, 'VES')}</Typography>
    </Grid>
);

const EarningsTable = ({ title, rows, icon }: { title: string, rows: any[], icon: React.ReactNode }) => (
    <Paper sx={{
        p: 4,
        borderRadius: 5,
        boxShadow: 1,
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
    }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            {icon}
            <Typography variant="h6" fontWeight="bold" color="text.primary">{title}</Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Usuario</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cant.</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total (USD)</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map(r => (
                    <TableRow key={r.user_id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor: r.color || 'action.disabled', width: 28, height: 28, fontSize: '0.7rem' }}>
                                    {r.names.charAt(0)}
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" fontWeight="medium" color="text.primary">{r.names}</Typography>
                                    <Typography variant="caption" color="text.secondary">{r.email}</Typography>
                                </Box>
                            </Stack>
                        </TableCell>
                        <TableCell align="center">
                            <Chip label={r.orders_count} size="small" variant="outlined" sx={{ fontWeight: 'bold' }} />
                        </TableCell>
                        <TableCell align="right">
                            <Typography variant="body1" fontWeight="bold" color="primary.main">{fmtMoney(r.amount_usd, "USD")}</Typography>
                        </TableCell>
                    </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={3} align="center"><Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>Sin datos en este periodo</Typography></TableCell></TableRow>}
            </TableBody>
        </Table>
    </Paper>
);

const AgencySettlementTable = ({ settlement, openOrder }: { settlement: any[], openOrder: (id: number) => void }) => {
    const exportToExcel = (agency: any) => {
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

    return (
        <Paper sx={{ p: 4, borderRadius: 5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <BusinessRoundedIcon sx={{ color: 'success.main', fontSize: 32 }} />
                <Box>
                    <Typography variant="h5" fontWeight="900">Liquidación de Agencias</Typography>
                    <Typography variant="caption" color="text.secondary">Saldo de efectivo recaudado vs vueltos entregados por agencias externas.</Typography>
                </Box>
            </Stack>
            <Divider sx={{ mb: 3 }} />

            {settlement.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">No hay liquidaciones pendientes para este periodo.</Typography>
                </Box>
            ) : (
                <Table size="medium">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Agencia</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Entregados</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total Envíos</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>A Pagar (Envío)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Saldo Final (USD)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Saldo Final (BS)</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {settlement.map(a => (
                            <React.Fragment key={a.agency_id}>
                                <TableRow hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Avatar sx={{ bgcolor: a.agency_color || 'success.main', width: 32, height: 32 }}>
                                                {a.agency_name.charAt(0)}
                                            </Avatar>
                                            <Typography variant="body1" fontWeight="bold">{a.agency_name}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip label={a.count_delivered || 0} size="small" color="success" variant="outlined" sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip label={a.count_shipped || 0} size="small" color="info" variant="outlined" sx={{ fontWeight: 'bold' }} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" color="error.main" fontWeight="bold">{fmtMoney(a.total_shipping_cost, 'USD')}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="h6" fontWeight="900" color="success.main">{fmtMoney(a.balance_usd, 'USD')}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="h6" fontWeight="900" color="primary.main">{fmtMoney(a.balance_ves, 'VES')}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} justifyContent="center">
                                            <Tooltip title="Descargar Detalle Excel">
                                                <IconButton color="primary" onClick={() => exportToExcel(a)}>
                                                    <FileDownloadRoundedIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Paper>
    );
};

