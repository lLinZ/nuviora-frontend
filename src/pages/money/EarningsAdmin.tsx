import React, { useEffect, useMemo, useState } from "react";
import { Box, Paper, Typography, TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";

import dayjs from "dayjs";
import { request } from "../../common/request";
import { RequireRole } from "../../components/auth/RequireRole";
import { IResponse } from "../../interfaces/response-type";
import { fmtMoney } from "../../lib/money";
import { Layout } from "../../components/ui/Layout";
import { ButtonCustom } from "../../components/custom";

type Row = { user_id: number; names: string; surnames?: string; role: string; orders_count: number; amount_usd: number; };
const roles = ["Todos", "Vendedor", "Repartidor", "Gerente"];

export const EarningsAdmin: React.FC = () => {
    const [from, setFrom] = useState(dayjs().format("YYYY-MM-DD"));
    const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
    const [role, setRole] = useState("Todos");
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("from", from);
            params.append("to", to);
            if (role !== "Todos") params.append("role", role);
            const { status, response }: IResponse = await request(`/earnings/summary?${params.toString()}`, "GET"); // <-- resumen por usuario
            if (status) {
                const data = await response.json();
                setRows(data.data ?? []);
            } else {
                toast.error("No se pudieron cargar las ganancias");
            }
        } catch {
            toast.error("Error al cargar ganancias");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []); // carga inicial

    const total = useMemo(() => rows.reduce((acc, r) => acc + (r.amount_usd ?? 0), 0), [rows]);

    return (
        <RequireRole allowedRoles={["Admin"]}>
            <Layout>
                <Box sx={{ p: 3, display: "grid", gap: 2 }}>
                    <Typography variant="h5" fontWeight={700}>Ganancias por usuario</Typography>
                    <Paper sx={{ p: 2, display: "grid", gap: 2, gridTemplateColumns: "repeat(4, minmax(160px, 1fr))" }}>
                        <TextField label="Desde" type="date" value={from} onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <TextField label="Hasta" type="date" value={to} onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <TextField label="Rol" select value={role} onChange={e => setRole(e.target.value)}>
                            {roles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </TextField>
                        <Box />
                        <Box sx={{ gridColumn: "1/-1" }}>
                            <ButtonCustom variant="contained" onClick={load} >Filtrar</ButtonCustom>
                        </Box>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        {loading ? <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box> : (
                            <>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Usuario</TableCell>
                                            <TableCell>Rol</TableCell>
                                            <TableCell align="center">Órdenes</TableCell>
                                            <TableCell align="right">Ganancia (USD)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map(r => (
                                            <TableRow key={r.user_id} hover>
                                                <TableCell>{r.names} {r.surnames ?? ""}</TableCell>
                                                <TableCell>{r.role}</TableCell>
                                                <TableCell align="center">{r.orders_count}</TableCell>
                                                <TableCell align="right">{fmtMoney(r.amount_usd, "USD")}</TableCell>
                                            </TableRow>
                                        ))}
                                        {rows.length === 0 && <TableRow><TableCell colSpan={4} align="center">Sin datos</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                                <Box sx={{ mt: 2, textAlign: "right", fontWeight: 700 }}>
                                    Total: {fmtMoney(total, "USD")}
                                </Box>
                            </>
                        )}
                    </Paper>
                </Box>
            </Layout>
        </RequireRole>
    );
};
