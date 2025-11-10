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
    const [business, setBusiness] = useState<{ date: string, open_at: string | null, close_at: string | null, is_open: boolean, last_close_at: string | null } | null>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [openDt, setOpenDt] = useState<string | null>(null);
    const [closeDt, setCloseDt] = useState<string | null>(null);

    const loadBusinessStatus = async () => {
        try {
            const { status, response }: IResponse = await request("/business/status", "GET");
            if (status) {
                const data = await response.json();
                const d = data.data;
                setIsOpen(!!d.is_open);
                setOpenDt(d.open_dt);
                setCloseDt(d.close_dt);
            } else {
                toast.error("No se pudo obtener el estado de la jornada");
            }
        } catch {
            toast.error("Error de conexión al cargar estado");
        }
    };

    useEffect(() => { loadBusinessStatus(); }, []);

    const openDay = async (assignBacklog: boolean = false) => {
        try {
            const body = new URLSearchParams();
            body.append("assign_backlog", assignBacklog ? "1" : "0");

            const { status, response }: IResponse = await request("/business/open", "POST", body);
            if (status) {
                const data = await response.json();
                toast.success(data.message || "Jornada abierta ✅");
                await loadBusinessStatus();
            } else {
                toast.error("No se pudo abrir la jornada ❌");
            }
        } catch {
            toast.error("Error abriendo la jornada 🚨");
        }
    };

    const closeDay = async () => {
        try {
            const { status, response }: IResponse = await request("/business/close", "POST");
            if (status) {
                const data = await response.json();
                toast.success(data.message || "Jornada cerrada ✅");
                await loadBusinessStatus();
            } else {
                toast.error("No se pudo cerrar la jornada ❌");
            }
        } catch {
            toast.error("Error cerrando la jornada 🚨");
        }
    };
    // al cargar (además del roster)
    const loadBusiness = async () => {
        try {
            const { status, response }: IResponse = await request("/business/today", "GET");
            if (status) {
                const data = await response.json();
                setBusiness(data.data);
            }
        } catch {
            toast.error("No se pudo cargar la jornada");
        }
    };

    // en useEffect junto a load() del roster
    useEffect(() => { load(); loadBusiness(); }, []);


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

                    <Paper sx={{ p: 2, mt: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Jornada</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: "flex", gap: 1.5 }}>
                            <ButtonCustom
                                variant="contained"
                                onClick={() => openDay(false)}
                                disabled={isOpen}
                            >
                                Abrir jornada
                            </ButtonCustom>
                            {/* <ButtonCustom
                                variant="outlined"
                                onClick={() => openDay(true)}
                                disabled={isOpen}
                            >
                                Abrir + Asignar backlog
                            </ButtonCustom> */}
                            <ButtonCustom
                                variant="contained"
                                color="error"
                                onClick={closeDay}
                                disabled={!isOpen}
                            >
                                Cerrar jornada
                            </ButtonCustom>
                        </Box>

                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Estado: {isOpen ? "Abierta" : "Cerrada"}<br />
                            {openDt && <>Apertura: {new Date(openDt).toLocaleString()}<br /></>}
                            {closeDt && <>Cierre: {new Date(closeDt).toLocaleString()}</>}
                        </Typography>
                    </Paper>
                </Box>
            </RequireRole>
        </Layout>
    );
};
