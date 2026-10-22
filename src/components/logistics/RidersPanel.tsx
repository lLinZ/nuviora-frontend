// src/components/logistics/RidersPanel.tsx
// Los riders del centro para el operador (logística propia, §21.2): su GPS, el ETA al centro, si la app está lista para
// la alarma, lo que llevan ahora y sus rutas del día. Efectivo, retornos y confiabilidad llegan con la caja (§17) y las
// métricas. Se refresca cada 30 segundos: el ETA se le pide a Google solo si tiene más de un minuto (§7.2).
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Chip, Link, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { ago, api, CenterRider, clock, errorMessage, mapsLink } from "./logistics";

/** Por qué no le sonaría la alarma (§6.1: "app con notificaciones habilitadas… permisos de ubicación"). */
const alarmProblem = (r: CenterRider) =>
    !r.has_push ? "No abrió la app en su teléfono" :
    r.notifications_enabled === false ? "Notificaciones apagadas" :
    r.location_permission !== "siempre" ? "Ubicación no permitida siempre" : null;

export const RidersPanel: React.FC<{ centerId: number }> = ({ centerId }) => {
    const [riders, setRiders] = useState<CenterRider[] | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    const load = useCallback(() => {
        api<{ riders: CenterRider[]; warning: string | null }>(`/logistics/centers/${centerId}/riders`)
            .then((r) => { setRiders(r.riders); setWarning(r.warning); })
            .catch((e) => toast.error(errorMessage(e)));
    }, [centerId]);

    useEffect(() => {
        load();
        const poll = setInterval(load, 30000);
        return () => clearInterval(poll);
    }, [load]);

    if (!riders) return <Typography color="text.secondary" sx={{ p: 2 }}>Cargando riders…</Typography>;

    return (
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            {warning && <Alert severity="warning" sx={{ m: 2, mb: 0 }}>{warning}</Alert>}
            {riders.length === 0 ? <Typography color="text.secondary" sx={{ p: 2 }}>El centro todavía no tiene riders. Los da de alta el Admin en Configuración.</Typography> : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Rider</TableCell><TableCell>GPS</TableCell><TableCell>Llega al centro</TableCell><TableCell>Alarma</TableCell>
                                <TableCell>Ahora</TableCell><TableCell align="right">Rutas hoy</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {riders.map((r) => {
                                const problem = alarmProblem(r);
                                const off = !r.is_active || !!r.suspended_at;
                                return (
                                    <TableRow key={r.id} sx={off ? { opacity: 0.55 } : undefined}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.user?.names ?? `#${r.user_id}`}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {r.suspended_at ? `Suspendido${r.suspended_reason ? `: ${r.suspended_reason}` : ""}` : !r.is_active ? "Inactivo" : r.user?.phone ?? ""}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip size="small" variant="outlined" color={r.gps_ok ? "success" : "warning"} label={ago(r.last_location_at)} />
                                            {r.last_lat !== null && r.last_lng !== null && (
                                                <Link href={mapsLink(r.last_lat, r.last_lng)} target="_blank" rel="noopener" variant="caption" sx={{ display: "block", mt: 0.5 }}>Ver en el mapa</Link>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {r.eta_center_seconds !== null ? `${clock(r.eta_center_seconds)} min` : "—"}
                                            {r.eta_center_meters !== null && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{(r.eta_center_meters / 1000).toFixed(1)} km</Typography>}
                                        </TableCell>
                                        <TableCell>
                                            {r.alarm_ready ? <Chip size="small" color="success" label="Lista" /> : <Chip size="small" color="warning" label={problem ?? "Revisar"} />}
                                            {r.push_error && <Typography variant="caption" color="error" sx={{ display: "block" }}>{r.push_error}</Typography>}
                                        </TableCell>
                                        <TableCell>
                                            {r.current.length === 0 ? <Typography variant="body2" color="text.secondary">Libre</Typography> : (
                                                <Stack spacing={0.5}>
                                                    {r.current.map((c) => <Typography key={c.logistics_order_id} variant="body2">{c.order} · {c.status_label}</Typography>)}
                                                </Stack>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">{r.routes_today}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};
