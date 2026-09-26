// src/pages/my-group/MyGroup.tsx
// Fase de la Líder: lo que ve y hace con su grupo, además de todo lo de vendedora.
// Métricas (Fran, 2026-09-26), % de sus vendedoras, roster de hoy y reasignación dentro del grupo.
// Cada acción la valida el servidor (MyGroupController): aquí solo se muestra y se pide.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
    ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from "@mui/material";
import {
    ArrowBackRounded, BalanceRounded, RefreshRounded, SaveRounded, StarRounded, SwapHorizRounded,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { useUserStore } from "../../store/user/UserStore";
import { assignmentApi } from "../round-robin/assignmentApi";
import { BulkReassignDialog } from "../round-robin/BulkReassignDialog";
import { fmtPct, groupShares, weightsError, weightsSummary } from "../sales-groups/weights";
import { GroupMetrics, GroupMetricsRow, MyGroupData, MyGroupMember, SellerRef } from "../../interfaces/assignment.types";

/* ─────────────────────────── utilidades ─────────────────────────── */

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const money = (n: number) => `$${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const firstName = (name: string) => name.split(" ")[0];

type Preset = "hoy" | "ayer" | "7d" | "mes" | "mes_pasado" | "otro";

function presetRange(p: Exclude<Preset, "otro">): [string, string] {
    const now = new Date();
    const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    switch (p) {
        case "hoy": return [iso(now), iso(now)];
        case "ayer": return [iso(day(-1)), iso(day(-1))];
        case "7d": return [iso(day(-6)), iso(now)];
        case "mes": return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)];
        case "mes_pasado": return [iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))];
    }
}

/** Semáforo de efectividad de la spec §8.5: rojo < 45 %, amarillo 45–49,99 %, verde ≥ 50 %. */
const effectivenessColor = (v: number | null): "error" | "warning" | "success" | "default" =>
    v === null ? "default" : v < 45 ? "error" : v < 50 ? "warning" : "success";

const PctCell: React.FC<{ pct: number | null; count: number; title: string }> = ({ pct, count, title }) => (
    <TableCell align="right">
        <Tooltip title={title}>
            <Box component="span">
                <Typography variant="body2" component="span">{pct === null ? "—" : fmtPct(pct)}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">{count}</Typography>
            </Box>
        </Tooltip>
    </TableCell>
);

const NameCell: React.FC<{ member?: MyGroupMember; label?: string }> = ({ member, label }) => (
    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: label ? 700 : member?.is_leader ? 600 : 400 }}>
        {member?.is_leader && <StarRounded sx={{ fontSize: 14, color: "warning.main", verticalAlign: -2, mr: 0.5 }} />}
        {label ?? member?.name}
    </TableCell>
);

/* ─────────────────────────── Ahora mismo ─────────────────────────── */

const MAIN_STATUSES = ["Asignado a vendedor", "Llamado 1", "Llamado 2", "Llamado 3", "Reprogramado para hoy"];
const SHORT: Record<string, string> = { "Asignado a vendedor": "Asignadas", "Reprogramado para hoy": "Reprog. hoy" };

const NowCard: React.FC<{ data: MyGroupData }> = ({ data }) => {
    const main = MAIN_STATUSES.map((d) => data.statuses.find((s) => s.description === d)).filter(Boolean) as MyGroupData["statuses"];
    const rest = data.statuses.filter((s) => !MAIN_STATUSES.includes(s.description));
    const count = (m: MyGroupMember, id: number) => m.pipeline?.[id] ?? 0;
    const restOf = (m: MyGroupMember) => rest.reduce((a, s) => a + count(m, s.id), 0);
    const totalOf = (m: MyGroupMember) => data.statuses.reduce((a, s) => a + count(m, s.id), 0);
    const restDetail = (m: MyGroupMember) => rest.filter((s) => count(m, s.id) > 0).map((s) => `${s.description}: ${count(m, s.id)}`).join(" · ") || "Ninguna";
    const sum = (f: (m: MyGroupMember) => number) => data.members.reduce((a, m) => a + f(m), 0);

    return (
        <Paper elevation={2} sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Ahora mismo</Typography>
            <Typography variant="caption" color="text.secondary">Órdenes que cada una tiene en curso en este momento.</Typography>
            <TableContainer sx={{ mt: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ "& th": { whiteSpace: "nowrap" } }}>
                            <TableCell>Vendedora</TableCell>
                            <TableCell align="right">Activas</TableCell>
                            {main.map((s) => <TableCell key={s.id} align="right">{SHORT[s.description] ?? s.description}</TableCell>)}
                            <TableCell align="right">Otras</TableCell>
                            <TableCell align="right">Total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.members.map((m) => {
                            const full = m.max_active_orders !== null && m.active_orders >= m.max_active_orders;
                            return (
                                <TableRow key={m.id} hover>
                                    <NameCell member={m} />
                                    <TableCell align="right">
                                        <Tooltip title="Asignado a vendedor y Llamado 1-3, sumando todas las tiendas. Al llegar a su máximo deja de recibir.">
                                            <Typography variant="body2" component="span" color={full ? "error.main" : undefined} fontWeight={full ? 700 : 400}>
                                                {m.active_orders}{m.max_active_orders !== null ? ` / ${m.max_active_orders}` : ""}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    {main.map((s) => <TableCell key={s.id} align="right">{count(m, s.id)}</TableCell>)}
                                    <TableCell align="right"><Tooltip title={restDetail(m)}><span>{restOf(m)}</span></Tooltip></TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>{totalOf(m)}</TableCell>
                                </TableRow>
                            );
                        })}
                        <TableRow sx={{ "& td": { fontWeight: 700, borderTop: 2, borderColor: "divider" } }}>
                            <NameCell label="Grupo" />
                            <TableCell align="right">{sum((m) => m.active_orders)}</TableCell>
                            {main.map((s) => <TableCell key={s.id} align="right">{sum((m) => count(m, s.id))}</TableCell>)}
                            <TableCell align="right">{sum(restOf)}</TableCell>
                            <TableCell align="right">{sum(totalOf)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

/* ─────────────────────────── Rendimiento ─────────────────────────── */

const MetricsCard: React.FC<{ data: MyGroupData; reloadKey: number }> = ({ data, reloadKey }) => {
    const [preset, setPreset] = useState<Preset>("7d");
    const [range, setRange] = useState<[string, string]>(presetRange("7d"));
    const [metrics, setMetrics] = useState<GroupMetrics | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!range[0] || !range[1] || range[0] > range[1]) return;
        let cancelled = false;
        setLoading(true);
        assignmentApi<GroupMetrics>(`/my-group/metrics?start_date=${range[0]}&end_date=${range[1]}`).then((res) => {
            if (cancelled) return;
            setLoading(false);
            if (res.ok && res.data) setMetrics(res.data);
            else toast.error(res.message);
        });
        return () => {
            cancelled = true;
        };
    }, [range, reloadKey]);

    const choose = (p: Preset | null) => {
        if (!p) return;
        setPreset(p);
        if (p !== "otro") setRange(presetRange(p));
    };

    const rowOf = (id: number) => metrics?.rows.find((r) => r.user_id === id);

    const cells = (r: GroupMetricsRow | undefined) => (
        <>
            <TableCell align="right">{r?.assigned ?? 0}</TableCell>
            <TableCell align="right">{r?.delivered ?? 0}</TableCell>
            <TableCell align="right">
                <Chip size="small" color={effectivenessColor(r?.effectiveness ?? null)} label={r?.effectiveness == null ? "—" : fmtPct(r.effectiveness)} />
            </TableCell>
            <PctCell pct={r?.cancelled_pct ?? null} count={r?.cancelled ?? 0} title="Canceladas ÷ asignadas" />
            <PctCell pct={r?.to_agency_pct ?? null} count={r?.to_agency ?? 0} title="Pasadas a agencia ÷ asignadas" />
            <PctCell pct={r?.upsell_pct ?? null} count={r?.delivered_with_upsell ?? 0} title="Entregadas con upsell ÷ entregadas" />
            <TableCell align="right">{money(r?.commission_sales ?? 0)}</TableCell>
            <TableCell align="right">{money(r?.commission_upsells ?? 0)}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>{money(r?.commission_total ?? 0)}</TableCell>
        </>
    );

    return (
        <Paper elevation={2} sx={{ borderRadius: 3, p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap">
                <Box>
                    <Typography variant="subtitle1" fontWeight={700}>Rendimiento</Typography>
                    <Typography variant="caption" color="text.secondary">Órdenes que entraron en el período, contadas para la vendedora que las recibió primero.</Typography>
                </Box>
                {loading && <CircularProgress size={18} />}
            </Box>

            <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap alignItems="center">
                <ToggleButtonGroup size="small" exclusive value={preset} onChange={(_, v) => choose(v)} sx={{ flexWrap: "wrap" }}>
                    <ToggleButton value="hoy">Hoy</ToggleButton>
                    <ToggleButton value="ayer">Ayer</ToggleButton>
                    <ToggleButton value="7d">7 días</ToggleButton>
                    <ToggleButton value="mes">Este mes</ToggleButton>
                    <ToggleButton value="mes_pasado">Mes pasado</ToggleButton>
                    <ToggleButton value="otro">Otro</ToggleButton>
                </ToggleButtonGroup>
                {preset === "otro" && (
                    <>
                        <TextField size="small" type="date" label="Desde" value={range[0]} onChange={(e) => setRange([e.target.value, range[1]])} slotProps={{ inputLabel: { shrink: true } }} />
                        <TextField size="small" type="date" label="Hasta" value={range[1]} onChange={(e) => setRange([range[0], e.target.value])} slotProps={{ inputLabel: { shrink: true } }} error={range[0] > range[1]} />
                    </>
                )}
            </Stack>

            <TableContainer sx={{ mt: 1.5 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ "& th": { whiteSpace: "nowrap" } }}>
                            <TableCell>Vendedora</TableCell>
                            <TableCell align="right">Asignadas</TableCell>
                            <TableCell align="right">Entregadas</TableCell>
                            <TableCell align="right">Efectividad</TableCell>
                            <TableCell align="right">Canceladas</TableCell>
                            <TableCell align="right">A agencia</TableCell>
                            <TableCell align="right">Upsells</TableCell>
                            <TableCell align="right">Comisión ventas</TableCell>
                            <TableCell align="right">Comisión upsells</TableCell>
                            <TableCell align="right">Comisión total</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.members.map((m) => (
                            <TableRow key={m.id} hover>
                                <NameCell member={m} />
                                {cells(rowOf(m.id))}
                            </TableRow>
                        ))}
                        <TableRow sx={{ "& td": { fontWeight: 700, borderTop: 2, borderColor: "divider" } }}>
                            <NameCell label="Grupo" />
                            {cells(metrics?.totals)}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                Efectividad = entregadas ÷ asignadas (rojo por debajo de 45 %, amarillo hasta 50 %, verde desde 50 %). Canceladas y A agencia también sobre las asignadas.
                Upsells = entregadas con upsell ÷ entregadas. Las comisiones son lo que ganó cada una en esas fechas; solo se consultan.
            </Typography>
        </Paper>
    );
};

/* ─────────────────────────── Reparto de órdenes (%) ─────────────────────────── */

const WeightsCard: React.FC<{ data: MyGroupData; onSaved: (d: MyGroupData) => void }> = ({ data, onSaved }) => {
    const leader = data.members.find((m) => m.is_leader) ?? null;
    const sellers = useMemo(() => data.members.filter((m) => !m.is_leader), [data.members]);
    const initial = useMemo(
        () => Object.fromEntries(sellers.map((m) => [m.id, m.weight != null ? String(Number(m.weight)) : ""])),
        [sellers]
    );
    const [weights, setWeights] = useState<Record<number, string>>(initial);
    const [saving, setSaving] = useState(false);

    useEffect(() => setWeights(initial), [initial]);

    const value = (id: number): number | null => ((weights[id] ?? "") === "" ? null : Number(weights[id]));
    const dirty = sellers.some((m) => (weights[m.id] ?? "") !== initial[m.id]);
    const leaderEntry = leader ? { id: leader.id, name: leader.name, pct: leader.weight != null ? Number(leader.weight) : null } : null;
    const sellerValues = sellers.map((m) => ({ id: m.id, name: m.name, pct: value(m.id) }));
    const error = weightsError(leaderEntry, sellerValues, "Para repartir con % primero el administrador tiene que fijar el tuyo. Mientras tanto puedes dejarlas parejo.");
    const shares = error ? null : groupShares(leaderEntry, sellerValues);
    const summary = error ? null : weightsSummary(leaderEntry, sellerValues);
    const shareText = (id: number) => (
        <Tooltip title="Lo que recibe del total que llega al grupo, si hoy trabajan todas">
            <Typography variant="caption" color="text.secondary" sx={{ width: 120 }}>≈ {shares ? fmtPct((shares[id] ?? 0) * 100) : "—"} del grupo</Typography>
        </Tooltip>
    );

    const save = async () => {
        setSaving(true);
        const res = await assignmentApi<MyGroupData>("/my-group/weights", "PUT", {
            weights: sellers.map((m) => ({ user_id: m.id, weight: value(m.id) })),
        });
        setSaving(false);
        if (res.ok && res.data) {
            toast.success("Porcentajes guardados");
            onSaved(res.data);
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Paper elevation={2} sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Reparto de órdenes</Typography>
            <Typography variant="caption" color="text.secondary">Cuánto de lo que llega al grupo recibe cada una. Con %, tiene que sumar 100 contando el tuyo.</Typography>

            <Stack spacing={1.25} mt={1.5}>
                {leader && (
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="body2" fontWeight={600} sx={{ flex: "1 1 140px", minWidth: 0 }} noWrap title={leader.name}>
                            <StarRounded sx={{ fontSize: 14, color: "warning.main", verticalAlign: -2 }} /> {leader.name} (tú)
                        </Typography>
                        <Tooltip title="Tu % lo fija el administrador">
                            <Chip size="small" variant="outlined" label={leader.weight != null ? fmtPct(Number(leader.weight)) : "como una vendedora"} sx={{ width: 90 }} />
                        </Tooltip>
                        {shareText(leader.id)}
                    </Box>
                )}
                {sellers.map((m) => (
                    <Box key={m.id} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Typography variant="body2" sx={{ flex: "1 1 140px", minWidth: 0 }} noWrap title={m.name}>{m.name}</Typography>
                        <TextField
                            size="small"
                            type="number"
                            label="%"
                            placeholder="parejo"
                            value={weights[m.id] ?? ""}
                            onChange={(e) => setWeights({ ...weights, [m.id]: e.target.value })}
                            slotProps={{ htmlInput: { min: 0, max: 100 }, inputLabel: { shrink: true } }}
                            sx={{ width: 90 }}
                        />
                        {shareText(m.id)}
                    </Box>
                ))}
            </Stack>

            {sellers.length === 0 && (
                <Typography variant="body2" color="text.secondary" fontStyle="italic" mt={1}>Tu grupo todavía no tiene vendedoras. Las asigna el administrador.</Typography>
            )}
            {error && <Typography variant="caption" color="error" display="block" mt={1.5}>{error}</Typography>}
            {summary && (
                <Typography variant="caption" color={summary.ok ? "success.main" : "text.secondary"} fontWeight={summary.ok ? 700 : 400} display="block" mt={1.5}>
                    {summary.text}
                </Typography>
            )}

            {sellers.length > 0 && (
                <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
                    <Button size="small" startIcon={<BalanceRounded />} onClick={() => setWeights(Object.fromEntries(sellers.map((m) => [m.id, ""])))}>
                        Repartir parejo
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={14} /> : <SaveRounded />}
                        disabled={!dirty || !!error || saving}
                        onClick={save}
                    >
                        Guardar %
                    </Button>
                </Stack>
            )}
        </Paper>
    );
};

/* ─────────────────────────── Roster de hoy ─────────────────────────── */

const QUICK_REASONS = ["No vino hoy", "Saturada", "Tiene un inconveniente", "Por rendimiento"];

const RosterCard: React.FC<{ data: MyGroupData; onSaved: (d: MyGroupData) => void }> = ({ data, onSaved }) => {
    const [pending, setPending] = useState<{ shopId: number; userId: number } | null>(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const name = (id: number) => data.members.find((m) => m.id === id)?.name ?? "";
    const shopName = (id: number) => data.shops.find((s) => s.id === id)?.name ?? "";

    const send = async (shopId: number, userId: number, active: boolean, why?: string) => {
        setBusy(`${shopId}:${userId}`);
        const res = await assignmentApi<MyGroupData>("/my-group/roster", "PUT", { shop_id: shopId, user_id: userId, active, reason: why ?? null });
        setBusy(null);
        if (res.ok && res.data) {
            toast.success(res.message ?? "Roster actualizado");
            onSaved(res.data);
            setPending(null);
            setReason("");
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Paper elevation={2} sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Roster de hoy</Typography>
            <Typography variant="caption" color="text.secondary">
                Quién recibe órdenes nuevas hoy en cada tienda. Sacar a alguien no la cambia de grupo ni le quita las órdenes que ya tiene.
            </Typography>

            <Stack spacing={2} mt={1.5}>
                {data.shops.map((shop) => {
                    const members = shop.members.filter((m) => m.linked || m.in_roster);
                    return (
                        <Box key={shop.id}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                <Typography variant="body2" fontWeight={700}>{shop.name}</Typography>
                                <Chip size="small" color={shop.is_open ? "success" : "default"} variant={shop.is_open ? "filled" : "outlined"} label={shop.is_open ? "Jornada abierta" : "Cerrada"} />
                            </Box>
                            {members.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">Nadie de tu grupo trabaja en esta tienda.</Typography>
                            ) : (
                                <Stack spacing={0.25}>
                                    {members.map((m) => {
                                        const key = `${shop.id}:${m.user_id}`;
                                        const canTurnOn = shop.is_open && m.linked;
                                        const last = m.last_change;
                                        return (
                                            <Box key={m.user_id} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                <Switch
                                                    size="small"
                                                    checked={m.in_roster}
                                                    disabled={busy === key || (!m.in_roster && !canTurnOn)}
                                                    onChange={(e) => (e.target.checked ? send(shop.id, m.user_id, true) : setPending({ shopId: shop.id, userId: m.user_id }))}
                                                />
                                                <Typography variant="body2" sx={{ minWidth: 120 }}>{name(m.user_id)}</Typography>
                                                {last && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {last.active ? "Entró" : "Salió"} a las {last.at} ({last.by}){last.reason ? `: ${last.reason}` : ""}
                                                    </Typography>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Box>
                    );
                })}
            </Stack>

            <Dialog open={!!pending} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Sacar a {pending ? firstName(name(pending.userId)) : ""} del roster de hoy</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={1.5}>
                        {pending ? shopName(pending.shopId) : ""}. Deja de recibir órdenes nuevas ahí hasta que la vuelvas a meter. ¿Por qué?
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mb={1.5}>
                        {QUICK_REASONS.map((r) => (
                            <Chip key={r} label={r} size="small" color={reason === r ? "primary" : "default"} onClick={() => setReason(r)} />
                        ))}
                    </Stack>
                    <TextField fullWidth size="small" label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} autoFocus />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPending(null)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="warning"
                        disabled={reason.trim() === "" || !!busy}
                        onClick={() => pending && send(pending.shopId, pending.userId, false, reason.trim())}
                    >
                        Sacar del roster
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

/* ─────────────────────────── Página ─────────────────────────── */

/** Las vendedoras con vista simple no tienen menú lateral: se les da una barra con "volver". */
const Shell: React.FC<{ lite: boolean; children: React.ReactNode }> = ({ lite, children }) => {
    const navigate = useNavigate();
    const theme = useUserStore((s) => s.user.theme);
    if (!lite) return <Layout>{children}</Layout>;
    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 2 }}>
            <Button startIcon={<ArrowBackRounded />} onClick={() => navigate("/ordenes")} sx={{ mb: 1, textTransform: "none" }}>
                Mis órdenes
            </Button>
            {children}
            <ToastContainer stacked position="top-right" autoClose={5000} theme={theme} transition={Bounce} />
        </Box>
    );
};

export const MyGroup: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const user = useUserStore((s) => s.user);
    const [data, setData] = useState<MyGroupData | null>(null);
    const [forbidden, setForbidden] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [reassignOpen, setReassignOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await assignmentApi<MyGroupData>("/my-group");
        setLoading(false);
        if (res.ok && res.data) {
            setData(res.data);
            setForbidden(false);
        } else {
            setForbidden(true);
            toast.error(res.message);
        }
    }, []);

    useEffect(() => {
        if (isValid) fetchData();
    }, [isValid, fetchData]);

    const refresh = () => {
        fetchData();
        setReloadKey((k) => k + 1);
    };

    const sellerRefs: SellerRef[] = useMemo(
        () => (data?.members ?? []).map((m) => ({ id: m.id, name: m.name, group: data ? { id: data.group.id, name: data.group.name } : null, active_orders: m.active_orders })),
        [data]
    );

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Shell lite={!!user.is_lite_view}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap" mb={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Mi grupo{data ? ` · ${data.group.name}` : ""}</Typography>
                    <Typography variant="body2" color="text.secondary">Cómo van tus vendedoras, cómo se reparten las órdenes y quién trabaja hoy.</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button size="small" startIcon={loading ? <CircularProgress size={14} /> : <RefreshRounded />} onClick={refresh} disabled={loading}>Actualizar</Button>
                    <Button size="small" variant="contained" startIcon={<SwapHorizRounded />} onClick={() => setReassignOpen(true)} disabled={!data}>Reasignar en bloque</Button>
                </Stack>
            </Box>

            {forbidden && !data && (
                <Alert severity="info">Esta sección es solo para la Líder de un grupo de venta. Los grupos los arma el administrador.</Alert>
            )}

            {data && (
                <Stack spacing={2}>
                    <NowCard data={data} />
                    <MetricsCard data={data} reloadKey={reloadKey} />
                    <Box display="grid" gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }} gap={2} alignItems="start">
                        <WeightsCard data={data} onSaved={setData} />
                        <RosterCard data={data} onSaved={setData} />
                    </Box>
                </Stack>
            )}

            {data && (
                <BulkReassignDialog
                    open={reassignOpen}
                    sellers={sellerRefs}
                    apiBase="/my-group"
                    excludeTargetIds={[data.me]}
                    onClose={() => setReassignOpen(false)}
                    onDone={() => {
                        setReassignOpen(false);
                        refresh();
                    }}
                />
            )}
        </Shell>
    );
};

export default MyGroup;
