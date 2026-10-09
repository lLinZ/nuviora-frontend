// src/components/meta-ads/MetaSetupTabs.tsx
// Configuración → Meta Ads, lo que el Admin carga a mano (documento de Fran del 2026-10-08, Módulo 2):
// - Campañas: producto y ciudad de cada campaña nueva (§11, §13); sus ad sets y anuncios los heredan (§12).
// - Objetivos: Target CPA y Break-even por producto, con su historial (§34, §49).
// - Reglas: las señales sin IA; las del §39 y las de tendencia (§40) se cambian sin tocar código.
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert, Autocomplete, Box, Button, Chip, FormControlLabel, IconButton, MenuItem, Paper, Stack, Switch, Table, TableBody,
    TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { DeleteRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { api, dateTime, fmt } from "./metaAds";

type Option = { id: number; name: string };
type Campaign = {
    id: number; meta_id: string; name: string | null; account: string | null; effective_status: string | null; missing: boolean;
    product_id: number | null; product: string | null; city_id: number | null; city: string | null; classified: boolean;
    classified_by: string | null; classified_at: string | null; spend_30d?: number;
};

const useOptions = () => {
    const [opts, setOpts] = useState<{ products: Option[]; cities: Option[] } | null>(null);
    useEffect(() => { api<{ products: Option[]; cities: Option[] }>("/meta/options").then(setOpts).catch((e) => toast.error(e.message)); }, []);
    return opts;
};

const CampaignRow: React.FC<{ c: Campaign; opts: { products: Option[]; cities: Option[] }; onSaved: () => void }> = ({ c, opts, onSaved }) => {
    const [product, setProduct] = useState<Option | null>(opts.products.find((p) => p.id === c.product_id) ?? null);
    const [city, setCity] = useState<Option | null>(opts.cities.find((x) => x.id === c.city_id) ?? null);
    const [saving, setSaving] = useState(false);
    const changed = product?.id !== c.product_id || city?.id !== c.city_id;

    const save = async () => {
        setSaving(true);
        try {
            await api(`/meta/campaigns/${c.id}`, "PUT", { product_id: product?.id, city_id: city?.id });
            toast.success(`«${c.name}» = ${product?.name} / ${city?.name}`);
            onSaved();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <TableRow>
            <TableCell sx={{ minWidth: 220 }}>
                <Typography variant="body2" fontWeight="bold">{c.name ?? c.meta_id}</Typography>
                <Typography variant="caption" color="text.secondary">
                    {c.account} · ID {c.meta_id}{c.missing ? " · ya no está en Meta" : ""}
                    {c.spend_30d !== undefined ? ` · gasto 30 días ${fmt.money(c.spend_30d)}` : ""}
                    {c.classified && c.classified_by ? ` · clasificada por ${c.classified_by} ${dateTime(c.classified_at)}` : ""}
                </Typography>
            </TableCell>
            <TableCell sx={{ minWidth: 200 }}>
                <Autocomplete size="small" options={opts.products} value={product} onChange={(_, v) => setProduct(v)}
                    getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderInput={(p) => <TextField {...p} label="Producto" />} />
            </TableCell>
            <TableCell sx={{ minWidth: 170 }}>
                <Autocomplete size="small" options={opts.cities} value={city} onChange={(_, v) => setCity(v)}
                    getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderInput={(p) => <TextField {...p} label="Ciudad" />} />
            </TableCell>
            <TableCell>
                {c.classified && !changed ? <Chip size="small" color="success" label="Clasificada" /> : (
                    <Button size="small" variant="contained" disabled={!product || !city || saving} onClick={save}>Guardar</Button>
                )}
            </TableCell>
        </TableRow>
    );
};

export const MetaCampaignsTab: React.FC = () => {
    const opts = useOptions();
    const [onlyPending, setOnlyPending] = useState(true);
    const [data, setData] = useState<{ campaigns: Campaign[]; pending: number } | null>(null);
    const load = useCallback(() => {
        api<{ campaigns: Campaign[]; pending: number }>(`/meta/campaigns${onlyPending ? "?pending=1" : ""}`).then(setData).catch((e) => toast.error(e.message));
    }, [onlyPending]);
    useEffect(() => { load(); }, [load]);

    if (!data || !opts) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    return (
        <Stack spacing={2}>
            {data.pending > 0
                ? <Alert severity="warning"><b>Nueva campaña detectada.</b> Necesitamos clasificar {data.pending} {data.pending === 1 ? "campaña nueva" : "campañas nuevas"}. Mientras tanto sus datos se guardan, pero no suman en ningún producto ni ciudad.</Alert>
                : <Alert severity="success">Todas las campañas están clasificadas.</Alert>}
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 620 }}>
                    Cada campaña pertenece a un producto y a una ciudad. Los ad sets y anuncios de la campaña lo heredan; no hace falta clasificarlos.
                </Typography>
                <FormControlLabel control={<Switch checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />} label="Solo las que faltan" />
            </Stack>
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflowX: "auto" }}>
                {data.campaigns.length === 0 ? <Typography sx={{ p: 2 }}>No hay campañas{onlyPending ? " por clasificar" : ""}.</Typography> : (
                    <Table size="small">
                        <TableHead><TableRow><TableCell>Campaña</TableCell><TableCell>Producto</TableCell><TableCell>Ciudad</TableCell><TableCell /></TableRow></TableHead>
                        <TableBody>{data.campaigns.map((c) => <CampaignRow key={`${c.id}-${c.product_id}-${c.city_id}`} c={c} opts={opts} onSaved={load} />)}</TableBody>
                    </Table>
                )}
            </Paper>
        </Stack>
    );
};

type Target = {
    product_id: number; product: string | null; target_cpa: number | null; break_even_cpa: number | null; valid_from: string;
    history: { target_cpa: number | null; break_even_cpa: number | null; valid_from: string; by: string | null }[];
};

export const MetaTargetsTab: React.FC = () => {
    const opts = useOptions();
    const [targets, setTargets] = useState<Target[] | null>(null);
    const [form, setForm] = useState<{ product: Option | null; target: string; be: string; from: string }>({ product: null, target: "", be: "", from: new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" }) });
    const load = useCallback(() => { api<{ targets: Target[] }>("/meta/targets").then((r) => setTargets(r.targets)).catch((e) => toast.error(e.message)); }, []);
    useEffect(() => { load(); }, [load]);

    const save = async () => {
        try {
            await api("/meta/targets", "POST", {
                product_id: form.product?.id, target_cpa: form.target === "" ? null : Number(form.target),
                break_even_cpa: form.be === "" ? null : Number(form.be), valid_from: form.from,
            });
            toast.success(`Objetivos de ${form.product?.name} guardados`);
            setForm({ ...form, product: null, target: "", be: "" });
            load();
        } catch (e) { toast.error((e as Error).message); }
    };

    const pick = (t: Target) => setForm({ ...form, product: opts?.products.find((p) => p.id === t.product_id) ?? null, target: t.target_cpa?.toString() ?? "", be: t.break_even_cpa?.toString() ?? "" });

    if (!targets || !opts) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Target CPA y Break-even CPA de cada producto. Cada cambio queda guardado con su fecha, así las gráficas muestran el objetivo que regía cada día.
            </Typography>
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                    <Autocomplete size="small" options={opts.products} value={form.product} onChange={(_, v) => setForm({ ...form, product: v })}
                        getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, b) => a.id === b.id} sx={{ minWidth: 240 }}
                        renderInput={(p) => <TextField {...p} label="Producto" />} />
                    <TextField size="small" label="Target CPA (USD)" type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} inputProps={{ min: 0, step: "0.01" }} />
                    <TextField size="small" label="Break-even CPA (USD)" type="number" value={form.be} onChange={(e) => setForm({ ...form, be: e.target.value })} inputProps={{ min: 0, step: "0.01" }} />
                    <TextField size="small" label="Vigente desde" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} InputLabelProps={{ shrink: true }} />
                    <Button variant="contained" disabled={!form.product || (form.target === "" && form.be === "")} onClick={save}>Guardar</Button>
                </Stack>
            </Paper>
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflowX: "auto" }}>
                {targets.length === 0 ? <Typography sx={{ p: 2 }}>Todavía no hay objetivos cargados.</Typography> : (
                    <Table size="small">
                        <TableHead><TableRow><TableCell>Producto</TableCell><TableCell align="right">Target CPA</TableCell><TableCell align="right">Break-even</TableCell><TableCell>Desde</TableCell><TableCell>Cambios anteriores</TableCell></TableRow></TableHead>
                        <TableBody>
                            {targets.map((t) => (
                                <TableRow key={t.product_id} hover onClick={() => pick(t)} sx={{ cursor: "pointer" }}>
                                    <TableCell><b>{t.product}</b></TableCell>
                                    <TableCell align="right">{fmt.money(t.target_cpa)}</TableCell>
                                    <TableCell align="right">{fmt.money(t.break_even_cpa)}</TableCell>
                                    <TableCell>{t.valid_from}</TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="text.secondary">
                                            {t.history.slice(1).map((h) => `${h.valid_from}: ${fmt.money(h.target_cpa)} / ${fmt.money(h.break_even_cpa)}`).join(" · ") || "—"}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>
        </Stack>
    );
};

type Rule = { id: number; type: "spend_no_purchases" | "limited_sample" | "trend"; metric: string | null; direction: "up" | "down" | null; threshold: number | null; severity: "info" | "alert" | "critical"; is_active: boolean };
type RulesData = { rules: Rule[]; metrics: string[] };
const SEVERITY_LABEL: Record<string, string> = { info: "Información", alert: "Alerta", critical: "Crítica" };
const METRIC_LABEL: Record<string, string> = {
    cpa: "CPA", cpm: "CPM", ctr: "CTR", link_ctr: "CTR enlace", cpc: "CPC", frequency: "Frequency", hook_rate: "Hook Rate", hold_rate: "Hold Rate",
    lpv_rate: "LPV Rate", conversion_rate: "Conversion Rate", spend: "Gasto", purchases: "Purchases",
};

const RuleRow: React.FC<{ r: Rule; metrics: string[]; onChange: (patch: Partial<Rule>) => void; onDelete?: () => void }> = ({ r, metrics, onChange, onDelete }) => {
    const [threshold, setThreshold] = useState(r.threshold?.toString() ?? "");
    useEffect(() => setThreshold(r.threshold?.toString() ?? ""), [r.threshold]);
    const commit = () => { if (threshold !== (r.threshold?.toString() ?? "")) onChange({ threshold: threshold === "" ? null : Number(threshold) }); };
    return (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ py: 1 }}>
            <Switch checked={r.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} inputProps={{ "aria-label": "Activa" }} />
            <Typography variant="body2" sx={{ minWidth: 260, flex: 1 }}>
                {r.type === "spend_no_purchases" && <>Gasto ≥ <b>{threshold || "?"}</b> × Target CPA y 0 compras</>}
                {r.type === "limited_sample" && <>Muestra limitada: hay compras, pero menos de <b>{threshold || "?"}</b></>}
                {r.type === "trend" && <><b>{METRIC_LABEL[r.metric ?? ""] ?? r.metric}</b> {r.direction === "up" ? "aumenta" : "disminuye"} ≥ <b>{threshold || "?"} %</b> contra el período anterior</>}
            </Typography>
            {r.type === "trend" && (
                <>
                    <TextField select size="small" label="Métrica" value={r.metric ?? ""} onChange={(e) => onChange({ metric: e.target.value })} sx={{ width: 150 }}>
                        {metrics.map((m) => <MenuItem key={m} value={m}>{METRIC_LABEL[m] ?? m}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" label="Dirección" value={r.direction ?? "up"} onChange={(e) => onChange({ direction: e.target.value as Rule["direction"] })} sx={{ width: 130 }}>
                        <MenuItem value="up">Aumenta</MenuItem><MenuItem value="down">Disminuye</MenuItem>
                    </TextField>
                </>
            )}
            <TextField size="small" type="number" label={r.type === "spend_no_purchases" ? "× Target CPA" : r.type === "trend" ? "%" : "Compras"} value={threshold}
                onChange={(e) => setThreshold(e.target.value)} onBlur={commit} sx={{ width: 120 }} inputProps={{ min: 0, step: "0.1" }} />
            <TextField select size="small" label="Severidad" value={r.severity} onChange={(e) => onChange({ severity: e.target.value as Rule["severity"] })} sx={{ width: 140 }}>
                {Object.entries(SEVERITY_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            {onDelete && <IconButton aria-label="Borrar regla" onClick={onDelete}><DeleteRounded /></IconButton>}
        </Stack>
    );
};

export const MetaRulesTab: React.FC = () => {
    const [data, setData] = useState<RulesData | null>(null);
    const load = useCallback(() => { api<RulesData>("/meta/rules").then(setData).catch((e) => toast.error(e.message)); }, []);
    useEffect(() => { load(); }, [load]);
    const call = async (fn: () => Promise<RulesData>) => { try { setData(await fn()); } catch (e) { toast.error((e as Error).message); load(); } };

    if (!data) return <Typography sx={{ p: 2 }}>Cargando…</Typography>;
    const box = { borderRadius: 3, border: "1px solid", borderColor: "divider", p: 2 } as const;
    return (
        <Stack spacing={2}>
            <Alert severity="info">Las reglas solo muestran señales. Nunca pausan, apagan ni cambian nada en Meta.</Alert>
            <Paper elevation={0} sx={box}>
                <Typography fontWeight="bold">Frequency</Typography>
                <Typography variant="body2" color="text.secondary">🟢 1,00 – 1,30 normal / ideal · 🟡 más de 1,30 a 1,60 alerta · 🟠 más de 1,60 a 2,00 posible saturación · 🔴 más de 2,00 saturación/fatiga elevada.</Typography>
                <Typography fontWeight="bold" sx={{ mt: 1.5 }}>CPA</Typography>
                <Typography variant="body2" color="text.secondary">Se compara con el Target CPA y el Break-even de cada producto: dentro del objetivo, por encima del objetivo pero debajo de BE, o por encima de break-even.</Typography>
            </Paper>
            <Paper elevation={0} sx={box}>
                <Typography fontWeight="bold">Gasto suficiente</Typography>
                {data.rules.filter((r) => r.type !== "trend").map((r) => (
                    <RuleRow key={r.id} r={r} metrics={data.metrics} onChange={(patch) => call(() => api<RulesData>(`/meta/rules/${r.id}`, "PUT", patch))} />
                ))}
            </Paper>
            <Paper elevation={0} sx={box}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight="bold">Tendencias</Typography>
                    <Button size="small" variant="outlined" onClick={() => call(() => api<RulesData>("/meta/rules", "POST", { metric: "cpa", direction: "up", threshold: 10, severity: "alert" }))}>Agregar regla</Button>
                </Stack>
                {data.rules.filter((r) => r.type === "trend").length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Todavía no hay reglas de tendencia.</Typography>}
                {data.rules.filter((r) => r.type === "trend").map((r) => (
                    <Box key={r.id}>
                        <RuleRow r={r} metrics={data.metrics} onChange={(patch) => call(() => api<RulesData>(`/meta/rules/${r.id}`, "PUT", patch))}
                            onDelete={() => call(() => api<RulesData>(`/meta/rules/${r.id}`, "DELETE"))} />
                    </Box>
                ))}
            </Paper>
        </Stack>
    );
};
