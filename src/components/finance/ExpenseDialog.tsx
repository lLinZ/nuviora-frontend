// src/components/finance/ExpenseDialog.tsx
// "+ Registrar gasto" y "Corregir" (Módulo 4 de Fran, §24): concepto, categoría, monto, moneda, fecha, descripción,
// comprobante opcional y, opcionales, producto, ciudad, almacén, agencia o proveedor. Corregir pide el motivo (§82).
import React, { useState } from "react";
import { Alert, Button, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { CategoryField } from "./CategoryField";
import { MoneyFields, MoneyValue } from "./MoneyFields";
import { Expense, FinanceOptions, api, errorMessage, todayCaracas } from "./finance";

type Props = { open: boolean; expense: Expense | null; options: FinanceOptions; onClose: () => void; onSaved: () => void;
    onCategory: (c: { id: number; name: string; is_active: boolean }) => void };

const LINKS = [
    { key: "product_id", label: "Producto" }, { key: "city_id", label: "Ciudad" }, { key: "warehouse_id", label: "Almacén" },
    { key: "agency_id", label: "Agencia" }, { key: "supplier_id", label: "Proveedor" },
] as const;
type LinkKey = typeof LINKS[number]["key"];

const initial = (e: Expense | null) => ({
    concept: e?.concept ?? "", category: e ? String(e.expense_category_id) : "", date: e?.expense_date ?? todayCaracas(), description: e?.description ?? "",
    links: Object.fromEntries(LINKS.map((l) => [l.key, e?.[l.key] ? String(e[l.key]) : ""])) as Record<LinkKey, string>,
});

export const ExpenseDialog: React.FC<Props> = (props) => (props.open ? <ExpenseForm key={props.expense?.id ?? "new"} {...props} /> : null);

const ExpenseForm: React.FC<Props> = ({ expense, options, onClose, onSaved, onCategory }) => {
    const [form, setForm] = useState(initial(expense));
    const [money, setMoney] = useState<MoneyValue>({ amount: expense ? String(expense.amount) : "", currency: expense?.currency ?? "USD",
        rate: expense && expense.currency === "VES" ? String(expense.rate) : "" });
    const [receipt, setReceipt] = useState<File | null>(null);
    const [reason, setReason] = useState("");
    const [showLinks, setShowLinks] = useState(Boolean(expense && LINKS.some((l) => expense[l.key])));
    const [saving, setSaving] = useState(false);

    const choices = (key: LinkKey): { id: number; label: string }[] => ({
        product_id: options.products.map((p) => ({ id: p.id, label: p.title })),
        city_id: options.cities.map((c) => ({ id: c.id, label: c.name })),
        warehouse_id: options.warehouses.map((w) => ({ id: w.id, label: w.name })),
        agency_id: options.agencies.map((a) => ({ id: a.id, label: a.names })),
        supplier_id: options.suppliers.map((s) => ({ id: s.id, label: s.name })),
    })[key];

    const save = async () => {
        const body = new FormData();
        body.append("concept", form.concept);
        body.append("expense_category_id", form.category);
        body.append("amount", money.amount.replace(",", "."));
        body.append("currency", money.currency);
        if (money.currency === "VES") body.append("rate", money.rate.replace(",", "."));
        body.append("expense_date", form.date);
        body.append("description", form.description);
        LINKS.forEach((l) => body.append(l.key, form.links[l.key]));
        if (receipt) body.append("receipt", receipt);
        if (expense) body.append("reason", reason);
        setSaving(true);
        try {
            const res = await api<{ message: string }>(expense ? `/finance/expenses/${expense.id}` : "/finance/expenses", "POST", body);
            toast.success(res.message);
            onSaved();
        } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
    };

    const ready = form.concept.trim() !== "" && form.category !== "" && money.amount.trim() !== "" && (money.currency !== "VES" || money.rate.trim() !== "")
        && (!expense || reason.trim() !== "");

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{expense ? "Corregir gasto" : "Registrar gasto"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <TextField label="Concepto" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} required autoFocus
                        placeholder="Mentoría, curso, reparación, transporte…" inputProps={{ maxLength: 150 }} />
                    <CategoryField value={form.category} onChange={(category) => setForm({ ...form, category })} options={options} onCreated={onCategory} />
                    <MoneyFields value={money} onChange={setMoney} currencies={options.currencies} />
                    <TextField type="date" label="Fecha" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} InputLabelProps={{ shrink: true }}
                        inputProps={{ max: todayCaracas() }} sx={{ maxWidth: 220 }} />
                    <TextField label="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline minRows={2} />
                    <div>
                        <Button component="label" variant="outlined" size="small">
                            {receipt ? "Cambiar comprobante" : expense?.has_receipt ? "Reemplazar comprobante" : "Adjuntar comprobante (opcional)"}
                            <input hidden type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                        </Button>
                        {receipt && <Typography variant="caption" sx={{ ml: 1 }}>{receipt.name}</Typography>}
                    </div>
                    <div>
                        <Button size="small" onClick={() => setShowLinks(!showLinks)}>{showLinks ? "Ocultar asociaciones" : "Asociar a un producto, ciudad, almacén, agencia o proveedor"}</Button>
                        <Collapse in={showLinks}>
                            <Stack spacing={1.5} sx={{ mt: 1 }}>
                                {LINKS.map((l) => (
                                    <TextField key={l.key} select size="small" label={l.label} value={form.links[l.key]}
                                        onChange={(e) => setForm({ ...form, links: { ...form.links, [l.key]: e.target.value } })}>
                                        <MenuItem value="">Ninguno</MenuItem>
                                        {choices(l.key).map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.label}</MenuItem>)}
                                    </TextField>
                                ))}
                                <Typography variant="caption" color="text.secondary">
                                    Con producto o ciudad, el gasto se le carga a ese producto o esa ciudad. Sin ellos es un gasto general: se descuenta después del margen de contribución.
                                </Typography>
                            </Stack>
                        </Collapse>
                    </div>
                    {expense && (
                        <>
                            <Alert severity="info">El cambio queda en el historial del gasto, con el valor anterior y el nuevo.</Alert>
                            <TextField label="Motivo del cambio" value={reason} onChange={(e) => setReason(e.target.value)} required inputProps={{ maxLength: 500 }} />
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !ready}>{expense ? "Guardar corrección" : "Registrar"}</Button>
            </DialogActions>
        </Dialog>
    );
};
