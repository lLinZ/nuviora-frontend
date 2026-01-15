import React, { useEffect, useMemo, useState } from "react";
import { Box, Paper, Typography, TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Chip, Divider } from "@mui/material";
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

type SummaryData = {
    vendors: any[];
    deliverers: any[];
    managers: any[];
    totals: {
        all_usd: number;
        all_local: number;
    };
    rate: number;
};

export const EarningsAdmin: React.FC = () => {
    const [from, setFrom] = useState(dayjs().startOf('month').format("YYYY-MM-DD"));
    const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
    const [data, setData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(false);
    const { loadingSession, isValid, user } = useValidateSession();

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

    useEffect(() => { load(); }, []);

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <RequireRole allowedRoles={["Admin", "Gerente"]}>
            <Layout>
                <DescripcionDeVista title="Ganancias Globales" description="Seguimiento de comisiones para todo el equipo" />

                <Box sx={{ p: 1, display: "grid", gap: 3 }}>
                    <Paper sx={{ p: 3, borderRadius: 4 }} elevation={2}>
                        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end", flexWrap: "wrap" }}>
                            <TextField label="Desde" type="date" size="small" value={from} onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                            <TextField label="Hasta" type="date" size="small" value={to} onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                            <ButtonCustom variant="contained" onClick={load} disabled={loading}>Consultar Rango</ButtonCustom>
                        </Box>
                    </Paper>

                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
                    ) : (data && (
                        <>
                            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
                                <Paper sx={{ p: 2, borderRadius: 4, bgcolor: 'primary.main', color: 'white' }}>
                                    <Typography variant="subtitle2">Total Comisiones (USD)</Typography>
                                    <Typography variant="h4" fontWeight="bold">{fmtMoney(data.totals.all_usd, 'USD')}</Typography>
                                </Paper>
                                <Paper sx={{ p: 2, borderRadius: 4, bgcolor: 'success.main', color: 'white' }}>
                                    <Typography variant="subtitle2">Total Equiv. Local (BCV: {data.rate})</Typography>
                                    <Typography variant="h4" fontWeight="bold">{fmtMoney(data.totals.all_local, 'VES')}</Typography>
                                </Paper>
                            </Box>

                            <EarningsTable title="Vendedoras ($1.00 / orden)" rows={data.vendors} />
                            <EarningsTable title="Repartidores ($2.50 / orden)" rows={data.deliverers} />
                            <EarningsTable title="Gerentes ($0.50 / venta exitosa)" rows={data.managers} />
                        </>
                    ))}
                </Box>
            </Layout>
        </RequireRole>
    );
};

const EarningsTable = ({ title, rows }: { title: string, rows: any[] }) => (
    <Paper sx={{ p: 3, borderRadius: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>{title}</Typography>
        <Divider sx={{ mb: 2 }} />
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Usuario</TableCell>
                    <TableCell align="center">Órdenes</TableCell>
                    <TableCell align="right">Ganancia (USD)</TableCell>
                    <TableCell align="right">Equiv. Local</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map(r => (
                    <TableRow key={r.user_id} hover>
                        <TableCell>{r.names} {r.surnames ?? ""}</TableCell>
                        <TableCell align="center">{r.orders_count}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmtMoney(r.amount_usd, "USD")}</TableCell>
                        <TableCell align="right" color="text.secondary">{fmtMoney(r.amount_local, "VES")}</TableCell>
                    </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={4} align="center">Sin movimientos en este periodo</TableCell></TableRow>}
            </TableBody>
        </Table>
    </Paper>
);
