import React, { useEffect, useState } from "react";
import { Layout } from "../components/ui/Layout";
import { DescripcionDeVista } from "../components/ui/content/DescripcionDeVista";
import { Loading } from "../components/ui/content/Loading";
import { useValidateSession } from "../hooks/useValidateSession";
import { request } from "../common/request";
import { IResponse } from "../interfaces/response-type";
import {
    Box, Card, CardContent, Grid, Typography, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, TextField, Button, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { fmtMoney } from "../lib/money";
import { toast } from "react-toastify";
import { Add as AddIcon, TrendingUp, Close as CloseIcon, LocalShipping as ShippedIcon, ShoppingCartCheckout } from "@mui/icons-material";

export const Metrics = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [openAdSpend, setOpenAdSpend] = useState(false);
    const [products, setProducts] = useState<any[]>([]);

    const fetchMetrics = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request(`/metrics?start_date=${startDate}&end_date=${endDate}`, "GET");
            if (status) {
                const data = await response.json();
                setMetrics(data);
            }
        } catch (e) {
            toast.error("Error al cargar métricas");
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const { status, response }: IResponse = await request("/inventory/products", "GET");
            if (status) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (e) { }
    };

    useEffect(() => {
        if (isValid) {
            fetchMetrics();
            fetchProducts();
        }
    }, [isValid, startDate, endDate]);

    const handleSaveAdSpend = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const { status }: IResponse = await request("/metrics/ad-spend", "POST", data as any);
            if (status) {
                toast.success("Inversión guardada");
                setOpenAdSpend(false);
                fetchMetrics();
            }
        } catch (e) {
            toast.error("Error al guardar inversión");
        }
    };

    if (loadingSession || (loading && !metrics)) return <Loading />;

    const summary = metrics?.summary || {};

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <DescripcionDeVista title="Sistema de Métricas" description="Análisis de efectividad, rentabilidad y ventas" />
                <Box display="flex" gap={2}>
                    <TextField size="small" type="date" label="Desde" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField size="small" type="date" label="Hasta" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAdSpend(true)}>Ad Spend</Button>
                </Box>
            </Box>

            <Grid container spacing={3} mb={4}>
                <SummaryCard title="Valor Promedio Orden" value={fmtMoney(summary.avg_order_value, 'USD')} icon={<TrendingUp color="primary" />} />
                <SummaryCard title="Upsells Realizados" value={summary.upsells_count} icon={<ShoppingCartCheckout color="success" />} />
                <SummaryCard title="Cancelaciones" value={summary.cancellations_count} icon={<CloseIcon color="error" />} />
                <SummaryCard title="Rechazados post-envío" value={summary.rejected_after_shipping_count} icon={<ShippedIcon color="warning" />} />
            </Grid>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Card elevation={3} sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Efectividad y Ganancia por Producto</Typography>
                            <TableContainer component={Paper} elevation={0}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Producto</TableCell>
                                            <TableCell align="right">Efectividad</TableCell>
                                            <TableCell align="right">Ganancia Neta</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {metrics?.products.map((p: any) => (
                                            <TableRow key={p.id}>
                                                <TableCell>{p.title || p.name}</TableCell>
                                                <TableCell align="right">{p.effectiveness}%</TableCell>
                                                <TableCell align="right" sx={{ color: p.net_profit >= 0 ? 'success.main' : 'error.main' }}>
                                                    {fmtMoney(p.net_profit, 'USD')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, lg: 5 }}>
                    <Card elevation={3} sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Efectividad de Vendedoras</Typography>
                            <TableContainer component={Paper} elevation={0}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Vendedora</TableCell>
                                            <TableCell align="right">Efectividad</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {metrics?.sellers.map((s: any) => (
                                            <TableRow key={s.id}>
                                                <TableCell>{s.names || s.name}</TableCell>
                                                <TableCell align="right">{s.effectiveness}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Card elevation={3} sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Ganancia Neta Diaria</Typography>
                            <TableContainer component={Paper} elevation={0}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Día</TableCell>
                                            <TableCell align="right">Ingresos</TableCell>
                                            <TableCell align="right">Costos</TableCell>
                                            <TableCell align="right">Ad Spend</TableCell>
                                            <TableCell align="right">Ganancia Neta</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {metrics?.daily.map((d: any) => (
                                            <TableRow key={d.date}>
                                                <TableCell>{d.date}</TableCell>
                                                <TableCell align="right">{fmtMoney(d.revenue, 'USD')}</TableCell>
                                                <TableCell align="right" color="error">{fmtMoney(d.cost, 'USD')}</TableCell>
                                                <TableCell align="right" color="error">{fmtMoney(d.ad_spend, 'USD')}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: d.net_profit >= 0 ? 'success.main' : 'error.main' }}>
                                                    {fmtMoney(d.net_profit, 'USD')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Dialog Ad Spend */}
            <Dialog open={openAdSpend} onClose={() => setOpenAdSpend(false)}>
                <form onSubmit={handleSaveAdSpend}>
                    <DialogTitle>Registrar Inversión Publicitaria</DialogTitle>
                    <DialogContent>
                        <Box display="flex" flexDirection="column" gap={2} mt={1} minWidth={300}>
                            <TextField select name="product_id" label="Producto" fullWidth required>
                                {products.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>{p.title || p.name}</MenuItem>
                                ))}
                            </TextField>
                            <TextField name="date" label="Fecha" type="date" fullWidth required defaultValue={new Date().toISOString().split('T')[0]} InputLabelProps={{ shrink: true }} />
                            <TextField name="amount" label="Monto Invertido ($)" type="number" fullWidth required inputProps={{ step: "0.01" }} />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenAdSpend(false)}>Cancelar</Button>
                        <Button variant="contained" type="submit">Guardar</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Layout>
    );
};

const SummaryCard = ({ title, value, icon }: any) => (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card elevation={3} sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">{title}</Typography>
                        <Typography variant="h5" fontWeight="bold">{value}</Typography>
                    </Box>
                    {icon}
                </Box>
            </CardContent>
        </Card>
    </Grid>
);
