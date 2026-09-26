// src/pages/sales-groups/SalesGroups.tsx
// Fase 4: el Admin arma los grupos de venta, elige a la Líder y define los % de reparto dentro de cada grupo.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, IconButton, InputAdornment, MenuItem, Paper, Stack, TextField,
    Tooltip, Typography,
} from "@mui/material";
import {
    AddRounded, DeleteOutlineRounded, EditRounded, GroupAddRounded, StarRounded,
    SaveRounded, BalanceRounded, PersonOffRounded,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { assignmentApi } from "../round-robin/assignmentApi";
import { GroupSeller, SalesGroup, SalesGroupsData } from "../../interfaces/assignment.types";

/* ─────────────────────────── Máximo de órdenes activas ─────────────────────────── */

const MaxActiveInput: React.FC<{ seller?: GroupSeller; onSaved: () => void }> = ({ seller, onSaved }) => {
    const initial = seller?.max_active_orders != null ? String(seller.max_active_orders) : "";
    const [value, setValue] = useState(initial);
    const [saving, setSaving] = useState(false);

    useEffect(() => setValue(initial), [initial]);

    if (!seller) return null;

    const save = async () => {
        if (value === initial) return;
        const max = value === "" ? null : Number(value);
        if (max !== null && (!Number.isInteger(max) || max < 1)) {
            toast.error("El máximo debe ser un número entero mayor que 0, o quedar vacío");
            setValue(initial);
            return;
        }
        setSaving(true);
        const res = await assignmentApi(`/assignment/sellers/${seller.id}`, "PUT", { max_active_orders: max });
        setSaving(false);
        if (res.ok) {
            toast.success(`Máximo de ${seller.name}: ${max ?? "sin tope"}`);
            onSaved();
        } else {
            toast.error(res.message);
            setValue(initial);
        }
    };

    const full = seller.max_active_orders != null && seller.active_orders >= seller.max_active_orders;

    return (
        <Tooltip title="Máximo de órdenes activas (Asignado a vendedor y Llamado 1-3), sumando todas las tiendas. Vacío = sin tope.">
            <TextField
                size="small"
                type="number"
                label="Máximo"
                placeholder="sin tope"
                helperText={full ? `${seller.active_orders} activas: llena` : `${seller.active_orders} activas`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                disabled={saving}
                error={full}
                slotProps={{ htmlInput: { min: 1, max: 999 }, inputLabel: { shrink: true } }}
                sx={{ width: 110 }}
            />
        </Tooltip>
    );
};

/* ─────────────────────────── Tarjeta de un grupo ─────────────────────────── */

interface GroupCardProps {
    group: SalesGroup;
    sellersById: Map<number, GroupSeller>;
    onEdit: (g: SalesGroup) => void;
    onMembers: (g: SalesGroup) => void;
    onDelete: (g: SalesGroup) => void;
    onReload: (data?: SalesGroupsData) => void;
}

/** Lo que recibiría cada una si hoy vinieran todas (misma cuenta que EffectiveWeights en el backend). */
function groupShares(leader: { id: number; pct: number | null } | null, sellers: { id: number; pct: number | null }[]): Record<number, number> {
    const set = sellers.filter((s) => s.pct !== null).map((s) => s.pct as number);
    const average = set.length ? set.reduce((a, v) => a + v, 0) / set.length : 1;
    const shares = sellers.map((s) => ({ id: s.id, share: s.pct ?? average }));
    const sum = shares.reduce((a, s) => a + s.share, 0);
    const n = sellers.length;
    const weights: Record<number, number> = {};
    shares.forEach((s) => (weights[s.id] = sum > 0 ? (n * s.share) / sum : 0));
    if (leader) {
        const p = leader.pct;
        weights[leader.id] = p === null ? 1 : p <= 0 ? 0 : sum <= 0 || p >= 100 ? Math.max(n, 1) : (n * p) / (100 - p);
    }
    const total = Object.values(weights).reduce((a, v) => a + v, 0);
    return Object.fromEntries(Object.entries(weights).map(([id, w]) => [id, total > 0 ? w / total : 0]));
}

const fmt = (n: number) => `${Number(n.toFixed(2)).toLocaleString("es-VE")} %`;

const GroupCard: React.FC<GroupCardProps> = ({ group, sellersById, onEdit, onMembers, onDelete, onReload }) => {
    const leader = group.leader;
    const people = useMemo(
        () => [...(leader ? [{ user_id: leader.id, weight: leader.weight }] : []), ...group.members],
        [leader, group.members]
    );
    const initial = useMemo(
        () => Object.fromEntries(people.map((m) => [m.user_id, m.weight != null ? String(Number(m.weight)) : ""])),
        [people]
    );
    const [weights, setWeights] = useState<Record<number, string>>(initial);
    const [saving, setSaving] = useState(false);

    useEffect(() => setWeights(initial), [initial]);

    const value = (id: number): number | null => ((weights[id] ?? "") === "" ? null : Number(weights[id]));
    const dirty = people.some((m) => (weights[m.user_id] ?? "") !== initial[m.user_id]);
    const leaderPct = leader ? value(leader.id) : null;
    const sellerValues = group.members.map((m) => ({ id: m.user_id, name: m.name, pct: value(m.user_id) }));
    const missing = sellerValues.filter((s) => s.pct === null);
    const filled = sellerValues.length - missing.length;
    const total = sellerValues.reduce((a, s) => a + (s.pct ?? 0), 0) + (leaderPct ?? 0);
    const outOfRange = people.some((m) => {
        const v = value(m.user_id);
        return v !== null && (Number.isNaN(v) || v < 0 || v > 100);
    });

    // Mismas reglas que el backend (SalesGroupController::weights).
    let error: string | null = null;
    if (outOfRange) error = "Cada % tiene que estar entre 0 y 100.";
    else if (filled > 0 && missing.length > 0) error = `Falta el % de ${missing.map((s) => s.name).join(", ")}. Ponlo, o deja vacías a todas las vendedoras para que se repartan parejo.`;
    else if (filled > 0 && leader && leaderPct === null) error = `Falta el % de la Líder, ${leader.name}.`;
    else if (filled > 0 && Math.abs(total - 100) > 0.01) error = `Suman ${fmt(total)}: ${total > 100 ? "sobran" : "faltan"} ${fmt(Math.abs(100 - total))}. Tienen que sumar 100 %.`;
    else if (filled === 0 && sellerValues.length > 0 && leaderPct !== null && leaderPct >= 100) error = "Si la Líder recibe el 100 %, pon 0 % a las vendedoras.";

    const shares = error ? null : groupShares(leader ? { id: leader.id, pct: leaderPct } : null, sellerValues);
    const shareOf = (id: number) => (shares ? fmt((shares[id] ?? 0) * 100) : "—");

    let summary: { text: string; color: "success.main" | "text.secondary" } | null = null;
    if (!error && people.length > 0) {
        if (filled > 0) summary = { text: "Total: 100 %", color: "success.main" };
        else if (leaderPct !== null && sellerValues.length > 0) summary = { text: `Las vendedoras se reparten parejo el ${fmt(100 - leaderPct)} que no recibe la Líder.`, color: "text.secondary" };
        else if (sellerValues.length > 0) summary = { text: leader ? "Todo vacío: parejo, la Líder recibe igual que una vendedora." : "Todo vacío: parejo.", color: "text.secondary" };
    }

    const save = async () => {
        setSaving(true);
        const res = await assignmentApi<SalesGroupsData>(`/sales-groups/${group.id}/weights`, "PUT", {
            weights: people.map((m) => ({ user_id: m.user_id, weight: value(m.user_id) })),
        });
        setSaving(false);
        if (res.ok) {
            toast.success(`${group.name}: porcentajes guardados`);
            onReload(res.data);
        } else {
            toast.error(res.message);
        }
    };

    const pctInput = (id: number) => (
        <TextField
            size="small"
            type="number"
            label="%"
            placeholder="parejo"
            value={weights[id] ?? ""}
            onChange={(e) => setWeights({ ...weights, [id]: e.target.value })}
            slotProps={{ htmlInput: { min: 0, max: 100 }, inputLabel: { shrink: true } }}
            sx={{ width: 90 }}
        />
    );
    const shareText = (id: number) => (
        <Tooltip title="Lo que recibe del total que llega al grupo, si hoy trabajan todas">
            <Typography variant="caption" color="text.secondary" sx={{ width: 120 }}>≈ {shareOf(id)} del grupo</Typography>
        </Tooltip>
    );

    return (
        <Paper elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5, bgcolor: "action.hover", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                <Box>
                    <Typography variant="subtitle1" fontWeight={700}>{group.name}</Typography>
                    {leader ? (
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                            <Chip size="small" color="warning" icon={<StarRounded />} label={`Líder: ${leader.name}`} />
                            <Chip size="small" variant="outlined" label={`comisión ${group.leader_commission_pct} %`} />
                        </Stack>
                    ) : (
                        <Typography variant="caption" color="text.secondary">Sin Líder</Typography>
                    )}
                </Box>
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Editar grupo y Líder">
                        <IconButton size="small" onClick={() => onEdit(group)}><EditRounded fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Elegir vendedoras">
                        <IconButton size="small" color="primary" onClick={() => onMembers(group)}><GroupAddRounded fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar grupo">
                        <IconButton size="small" color="error" onClick={() => onDelete(group)}><DeleteOutlineRounded fontSize="small" /></IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            <Box sx={{ p: 2 }}>
                <Stack spacing={1.25}>
                    {leader && (
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="body2" fontWeight={600} sx={{ flex: "1 1 140px", minWidth: 0 }} noWrap title={leader.name}>
                                <StarRounded sx={{ fontSize: 14, color: "warning.main", verticalAlign: -2 }} /> {leader.name}
                            </Typography>
                            {pctInput(leader.id)}
                            {shareText(leader.id)}
                            <MaxActiveInput seller={sellersById.get(leader.id)} onSaved={() => onReload()} />
                        </Box>
                    )}
                    {group.members.map((m) => (
                        <Box key={m.user_id} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="body2" sx={{ flex: "1 1 140px", minWidth: 0 }} noWrap title={m.name}>{m.name}</Typography>
                            {pctInput(m.user_id)}
                            {shareText(m.user_id)}
                            <MaxActiveInput seller={sellersById.get(m.user_id)} onSaved={() => onReload()} />
                        </Box>
                    ))}
                </Stack>

                {group.members.length === 0 && (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic" mt={leader ? 1.5 : 0}>
                        Todavía no tiene vendedoras. Usa el botón <GroupAddRounded sx={{ fontSize: 14, verticalAlign: -2 }} /> para agregarlas.
                    </Typography>
                )}

                {error && (
                    <Typography variant="caption" color="error" display="block" mt={1.5}>{error}</Typography>
                )}
                {summary && (
                    <Typography variant="caption" color={summary.color} fontWeight={summary.color === "success.main" ? 700 : 400} display="block" mt={1.5}>
                        {summary.text}
                    </Typography>
                )}

                {people.length > 0 && (
                    <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
                        <Tooltip title={leader ? "Vacía el % de las vendedoras: se reparten parejo lo que no recibe la Líder" : "Vacía los %: todas reciben igual"}>
                            <span>
                                <Button
                                    size="small"
                                    startIcon={<BalanceRounded />}
                                    disabled={group.members.length === 0}
                                    onClick={() => setWeights({ ...weights, ...Object.fromEntries(group.members.map((m) => [m.user_id, ""])) })}
                                >
                                    Repartir parejo
                                </Button>
                            </span>
                        </Tooltip>
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
            </Box>
        </Paper>
    );
};

/* ─────────────────────────── Crear o editar un grupo ─────────────────────────── */

interface GroupForm {
    name: string;
    leader_id: number | "";
    leader_commission_pct: string;
}

const GroupDialog: React.FC<{
    open: boolean;
    group: SalesGroup | null;
    sellers: GroupSeller[];
    onClose: () => void;
    onSaved: (data: SalesGroupsData) => void;
}> = ({ open, group, sellers, onClose, onSaved }) => {
    const [form, setForm] = useState<GroupForm>({ name: "", leader_id: "", leader_commission_pct: "0" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setForm({
            name: group?.name ?? "",
            leader_id: group?.leader?.id ?? "",
            leader_commission_pct: String(group?.leader_commission_pct ?? 0),
        });
    }, [open, group]);

    // Puede ser Líder cualquier vendedora que no lidere ya otro grupo.
    const leaderOptions = sellers.filter((s) => !s.is_leader || s.id === group?.leader?.id);
    const commission = Number(form.leader_commission_pct);
    const invalid = form.name.trim() === "" || !(commission >= 0 && commission <= 100);

    const save = async () => {
        setSaving(true);
        const body = {
            name: form.name.trim(),
            leader_id: form.leader_id === "" ? null : form.leader_id,
            leader_commission_pct: commission,
        };
        const res = group
            ? await assignmentApi<SalesGroupsData>(`/sales-groups/${group.id}`, "PUT", body)
            : await assignmentApi<SalesGroupsData>("/sales-groups", "POST", body);
        setSaving(false);
        if (res.ok && res.data) {
            toast.success(res.message ?? "Grupo guardado");
            onSaved(res.data);
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{group ? `Editar ${group.name}` : "Nuevo grupo de venta"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} mt={1}>
                    <TextField label="Nombre del grupo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus size="small" />
                    <TextField
                        select
                        label="Líder"
                        size="small"
                        value={form.leader_id}
                        onChange={(e) => setForm({ ...form, leader_id: e.target.value === "" ? "" : Number(e.target.value) })}
                        helperText="Si estaba como vendedora en un grupo, sale de ahí y queda como Líder de este. Cuántas órdenes recibe se pone en la lista de % del grupo; si cambias de Líder, la nueva se queda con el % de la anterior."
                    >
                        <MenuItem value=""><em>Sin Líder</em></MenuItem>
                        {leaderOptions.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                    </TextField>
                    <TextField
                        label="Comisión de liderazgo"
                        type="number"
                        size="small"
                        value={form.leader_commission_pct}
                        onChange={(e) => setForm({ ...form, leader_commission_pct: e.target.value })}
                        slotProps={{
                            htmlInput: { min: 0, max: 100, step: 0.5 },
                            input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                        }}
                        error={!(commission >= 0 && commission <= 100)}
                        helperText="Este sí es dinero: un % sobre lo que ganan en comisiones las vendedoras del grupo. Queda guardado; se empieza a pagar cuando se active el cálculo de comisiones de la Líder."
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={invalid || saving} startIcon={saving ? <CircularProgress size={14} /> : undefined}>
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ─────────────────────────── Elegir las vendedoras ─────────────────────────── */

const MembersDialog: React.FC<{
    group: SalesGroup | null;
    groups: SalesGroup[];
    sellers: GroupSeller[];
    onClose: () => void;
    onSaved: (data: SalesGroupsData) => void;
}> = ({ group, groups, sellers, onClose, onSaved }) => {
    const [selected, setSelected] = useState<GroupSeller[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!group) return;
        const ids = new Set(group.members.map((m) => m.user_id));
        setSelected(sellers.filter((s) => ids.has(s.id)));
    }, [group, sellers]);

    if (!group) return null;

    const groupName = (id: number | null) => groups.find((g) => g.id === id)?.name;
    // Las Líderes no entran como vendedoras en ningún grupo.
    const options = sellers.filter((s) => !s.is_leader);
    const moving = selected.filter((s) => s.group_id && s.group_id !== group.id);

    const save = async () => {
        setSaving(true);
        const res = await assignmentApi<SalesGroupsData>(`/sales-groups/${group.id}/members`, "PUT", {
            user_ids: selected.map((s) => s.id),
        });
        setSaving(false);
        if (res.ok && res.data) {
            toast.success(res.message ?? "Vendedoras actualizadas");
            onSaved(res.data);
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Vendedoras de {group.name}</DialogTitle>
            <DialogContent>
                <Autocomplete
                    multiple
                    options={options}
                    value={selected}
                    onChange={(_, v) => setSelected(v)}
                    getOptionLabel={(o) => o.name}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderOption={(props, o) => {
                        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: React.Key };
                        const other = o.group_id && o.group_id !== group.id ? groupName(o.group_id) : null;
                        return (
                            <li key={key} {...rest}>
                                <Box display="flex" justifyContent="space-between" width="100%" gap={1}>
                                    <span>{o.name}</span>
                                    {other && <Typography variant="caption" color="warning.main">en {other}</Typography>}
                                </Box>
                            </li>
                        );
                    }}
                    renderInput={(params) => <TextField {...params} label="Vendedoras" placeholder="Buscar" autoFocus sx={{ mt: 1 }} />}
                />
                {moving.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        {moving.map((s) => s.name).join(", ")} {moving.length === 1 ? "sale" : "salen"} de su grupo actual: cada vendedora está en un solo grupo.
                    </Alert>
                )}
                <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                    Lo que ya vendieron sigue contando para el grupo en el que estaban. Una vendedora nueva recibe como el promedio del grupo hasta que le pongas su %.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving} startIcon={saving ? <CircularProgress size={14} /> : undefined}>
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ─────────────────────────── Página ─────────────────────────── */

export const SalesGroups: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<SalesGroupsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<SalesGroup | null>(null);
    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [membersOf, setMembersOf] = useState<SalesGroup | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await assignmentApi<SalesGroupsData>("/sales-groups");
        setLoading(false);
        if (res.ok && res.data) setData(res.data);
        else toast.error(res.message);
    }, []);

    useEffect(() => {
        if (isValid) fetchData();
    }, [isValid, fetchData]);

    const reload = (fresh?: SalesGroupsData) => (fresh ? setData(fresh) : fetchData());

    const sellersById = useMemo(() => new Map((data?.sellers ?? []).map((s) => [s.id, s])), [data]);
    const ungrouped = (data?.sellers ?? []).filter((s) => !s.group_id);

    const remove = async (g: SalesGroup) => {
        if (!confirm(`¿Eliminar el grupo ${g.name}? Sus vendedoras quedan sin grupo. Lo que ya vendieron sigue registrado.`)) return;
        const res = await assignmentApi<SalesGroupsData>(`/sales-groups/${g.id}`, "DELETE");
        if (res.ok && res.data) {
            toast.success(res.message ?? "Grupo eliminado");
            setData(res.data);
        } else {
            toast.error(res.message);
        }
    };

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
                <DescripcionDeVista
                    title="Grupos de venta"
                    description="Arma los grupos, elige a la Líder y define cómo se reparten las órdenes dentro de cada grupo"
                />
                <Button variant="contained" startIcon={<AddRounded />} onClick={() => { setEditing(null); setGroupDialogOpen(true); }}>
                    Nuevo grupo
                </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="body2">
                    Cada grupo recibe órdenes según cuántas vendedoras tiene <strong>disponibles hoy</strong> (en el roster y por debajo de su máximo): uno con 7 recibe 7 veces lo de una sola. Dentro del grupo, la lista de % dice cuánto recibe cada una, <strong>la Líder incluida</strong>, y tiene que sumar 100. Si dejas vacías a las vendedoras, se reparten parejo lo que no recibe la Líder; todo vacío es parejo para todas. Las vendedoras sin grupo cuentan como una porción cada una.
                </Typography>
            </Alert>

            {loading && !data ? (
                <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
            ) : (
                <>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2, mb: 3 }}>
                        {data?.groups.map((g) => (
                            <GroupCard
                                key={g.id}
                                group={g}
                                sellersById={sellersById}
                                onEdit={(x) => { setEditing(x); setGroupDialogOpen(true); }}
                                onMembers={setMembersOf}
                                onDelete={remove}
                                onReload={reload}
                            />
                        ))}
                        {data?.groups.length === 0 && (
                            <Paper variant="outlined" sx={{ gridColumn: "1/-1", p: 4, textAlign: "center", borderRadius: 3 }}>
                                <Typography variant="body1" fontWeight={600}>Todavía no hay grupos</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Mientras no existan, las órdenes se reparten parejo entre las vendedoras del roster, como siempre.
                                </Typography>
                            </Paper>
                        )}
                    </Box>

                    <Paper elevation={1} sx={{ borderRadius: 3, p: 2 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <PersonOffRounded color="action" />
                            <Typography variant="subtitle1" fontWeight={700}>Sin grupo</Typography>
                            <Chip size="small" label={ungrouped.length} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                            Reciben parejo entre ellas. Aquí también puedes ponerles un máximo de órdenes activas.
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }, gap: 1.5 }}>
                            {ungrouped.map((s) => (
                                <Box key={s.id} display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                                    <Typography variant="body2" noWrap title={s.name}>{s.name}</Typography>
                                    <MaxActiveInput seller={s} onSaved={() => fetchData()} />
                                </Box>
                            ))}
                            {ungrouped.length === 0 && (
                                <Typography variant="body2" color="text.secondary" fontStyle="italic">Todas las vendedoras tienen grupo.</Typography>
                            )}
                        </Box>
                    </Paper>
                </>
            )}

            <GroupDialog
                open={groupDialogOpen}
                group={editing}
                sellers={data?.sellers ?? []}
                onClose={() => setGroupDialogOpen(false)}
                onSaved={(d) => { setData(d); setGroupDialogOpen(false); }}
            />
            <MembersDialog
                group={membersOf}
                groups={data?.groups ?? []}
                sellers={data?.sellers ?? []}
                onClose={() => setMembersOf(null)}
                onSaved={(d) => { setData(d); setMembersOf(null); }}
            />
        </Layout>
    );
};
