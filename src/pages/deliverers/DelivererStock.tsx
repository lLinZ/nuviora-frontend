import React, { useEffect, useMemo, useState } from "react";
import { Box, Grid, Paper, Typography, TextField, Button, IconButton, Chip } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { RequireRole } from "../../components/auth/RequireRole";
import { IResponse } from "../../interfaces/response-type";
import { ButtonCustom } from "../../components/custom";
import { Layout } from "../../components/ui/Layout";

type Item = { product_id: number; title: string; available: number; qty: number; };

export const DelivererStock: React.FC = () => {
    const [catalog, setCatalog] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            // devuelve productos disponibles y mi stock actual de hoy (qty si ya lo tengo)
            const { status, response }: IResponse = await request("/deliverers/me/stock/catalog", "GET");
            if (status) {
                const data = await response.json();
                setCatalog(data.data ?? []);
            } else {
                toast.error("No se pudo cargar el catálogo");
            }
        } catch {
            toast.error("Error al cargar catálogo");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const inc = (pid: number) => setCatalog(prev => prev.map(i => i.product_id === pid ? { ...i, qty: Math.min(i.qty + 1, i.available) } : i));
    const dec = (pid: number) => setCatalog(prev => prev.map(i => i.product_id === pid ? { ...i, qty: Math.max(i.qty - 1, 0) } : i));

    const save = async () => {
        setSubmitting(true);
        try {
            const body = new URLSearchParams();
            catalog.filter(i => i.qty > 0).forEach(i => {
                body.append("items[]", JSON.stringify({ product_id: i.product_id, qty: i.qty }));
            });
            const { status, response }: IResponse = await request("/deliverers/me/stock", "POST", body); // crea/actualiza stock del día
            if (status) {
                const data = await response.json();
                toast.success(data.message ?? "Stock guardado ✅");
                load();
            } else {
                toast.error("No se pudo guardar el stock");
            }
        } catch {
            toast.error("Error al guardar stock");
        } finally {
            setSubmitting(false);
        }
    };

    const closeDay = async () => {
        if (!confirm("¿Cerrar jornada de reparto y devolver sobrantes?")) return;
        try {
            const { status, response }: IResponse = await request("/deliverers/me/stock/close", "POST"); // cierre de stock: devuelve sobrantes
            if (status) {
                const data = await response.json();
                toast.success(data.message ?? "Jornada cerrada ✅");
                load();
            } else {
                toast.error("No se pudo cerrar la jornada");
            }
        } catch {
            toast.error("Error al cerrar jornada");
        }
    };

    return (
        <RequireRole allowedRoles={["Repartidor"]}>
            <Layout>
                <Box sx={{ p: 3, display: "grid", gap: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="h5" fontWeight={700}>Mi stock del día</Typography>
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <IconButton onClick={load} disabled={loading}><RefreshRoundedIcon /></IconButton>
                        </Box>
                    </Box>

                    <Paper sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                            {catalog.map(item => (
                                <Grid size={{ xs: 12, md: 6 }} key={item.product_id}>
                                    <Paper sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <Box>
                                            <Typography fontWeight={700}>{item.title}</Typography>
                                            <Typography variant="body2" color="text.secondary">Disponible: <Chip label={item.available} size="small" /></Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <IconButton onClick={() => dec(item.product_id)}><RemoveRoundedIcon /></IconButton>
                                            <TextField
                                                value={item.qty}
                                                inputProps={{ readOnly: true, style: { width: 40, textAlign: "center" } }}
                                            />
                                            <IconButton onClick={() => inc(item.product_id)}><AddRoundedIcon /></IconButton>
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>

                        <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
                            <ButtonCustom variant="contained" onClick={save} disabled={submitting}>Guardar</ButtonCustom>
                            <ButtonCustom variant="outlined" color="error" onClick={closeDay}>Cerrar jornada</ButtonCustom>
                        </Box>
                    </Paper>
                </Box>
            </Layout>
        </RequireRole>
    );
};
