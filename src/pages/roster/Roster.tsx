// src/pages/RosterPage.tsx
import React, { useEffect, useState } from "react";
import {
    Box, Paper, Typography, List, ListItem, ListItemIcon, Checkbox, ListItemText,
    IconButton, Divider, TextField
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { request } from "../../common/request";
import { RequireRole } from "../../components/auth/RequireRole";
import { ButtonCustom } from "../../components/custom";
import { IResponse } from "../../interfaces/response-type";
import { useValidateSession } from "../../hooks/useValidateSession";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";

export const Roster: React.FC = () => {
    const [allAgents, setAllAgents] = useState<any[]>([]);
    const [activeIds, setActiveIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const { loadingSession, isValid, user } = useValidateSession();

    const load = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/roster/today", "GET");
            if (status) {
                const data = await response.json();
                setAllAgents(data.data.all ?? []);
                setActiveIds((data.data.active ?? []).map((a: any) => a.id));
            } else {
                toast.error("No se pudo cargar el roster");
            }
        } catch {
            toast.error("Error cargando roster");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const toggle = (id: number) => {
        setActiveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const save = async () => {
        if (activeIds.length === 0) {
            toast.error("Selecciona al menos una vendedora");
            return;
        }
        try {
            const body = new URLSearchParams();
            activeIds.forEach(id => body.append("agent_ids[]", String(id)));

            const { status }: IResponse = await request("/roster/today", "POST", body);
            if (status) {
                toast.success("Roster guardado ✅");
                load();
            } else {
                toast.error("No se pudo guardar el roster ❌");
            }
        } catch {
            toast.error("Error guardando roster 🚨");
        }
    };

    const assignBacklog = async () => {
        setAssigning(true);
        try {
            const { status, response }: IResponse = await request("/orders/assign-backlog", "POST");
            if (status) {
                const data = await response.json();
                toast.success(data.message ?? "Backlog asignado ✅");
            } else {
                toast.error("No se pudo asignar el backlog ❌");
            }
        } catch {
            toast.error("Error asignando backlog 🚨");
        } finally {
            setAssigning(false);
        }
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;
    return (
        <Layout>
            <DescripcionDeVista title={"Seleccion de vendedoras"} description={"Seleccionar vendedoras activas y reparticion de ordenes"} />
            <RequireRole allowedRoles={["Gerente", "Admin"]}>
                <Box sx={{ p: 3, display: "grid", gap: 2, gridTemplateColumns: "1fr 360px" }}>
                    <Paper sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                            <Typography variant="h6" fontWeight={700}>Roster del día</Typography>
                            <IconButton onClick={load} disabled={loading}><RefreshRoundedIcon /></IconButton>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <List dense>
                            {allAgents.map(a => (
                                <ListItem key={a.id} disablePadding secondaryAction={
                                    <Checkbox edge="end" checked={activeIds.includes(a.id)} onChange={() => toggle(a.id)} />
                                }>
                                    <ListItemIcon><Checkbox checked={activeIds.includes(a.id)} onChange={() => toggle(a.id)} /></ListItemIcon>
                                    <ListItemText primary={`${a.names} ${a.surnames ?? ""}`} secondary={a.email} />
                                </ListItem>
                            ))}
                            {allAgents.length === 0 && <Box sx={{ p: 2, textAlign: "center" }}>{loading ? "Cargando…" : "No hay vendedoras"}</Box>}
                        </List>
                        <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
                            <ButtonCustom variant="contained" startIcon={<SaveRoundedIcon />} onClick={save}>Guardar roster</ButtonCustom>
                            <ButtonCustom startIcon={<PlayArrowRoundedIcon />} variant="outlined" onClick={assignBacklog} disabled={assigning}>
                                Asignar backlog ahora
                            </ButtonCustom>
                        </Box>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <SettingsRoundedIcon />
                            <Typography variant="subtitle1" fontWeight={700}>Configuración</Typography>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Estrategia actual se define en <code>settings.assignment_strategy</code> (round_robin | load_balanced).
                            Horarios con <code>settings.business_open_at</code> y <code>settings.business_close_at</code>.
                        </Typography>
                        <Typography variant="body2">
                            Si quieres, te preparo un mini panel aquí mismo para editar esos settings.
                        </Typography>
                    </Paper>
                </Box>
            </RequireRole>
        </Layout>
    );
};
