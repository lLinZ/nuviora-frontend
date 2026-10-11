// src/components/agency-closures/PayDialog.tsx
// Registrar el pago de un cierre listo para pago (Módulo 3, §37): monto, fecha, método, referencia y comprobante.
// Lo que pagó y quién queda guardado para el módulo financiero.
import React, { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { AttachFileRounded } from "@mui/icons-material";
import { toast } from "react-toastify";
import { ClosureDetail, money, upload } from "./closures";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });

export const PayDialog: React.FC<{ closure: ClosureDetail; onClose: () => void; onPaid: () => void }> = ({ closure, onClose, onPaid }) => {
    const [form, setForm] = useState({ amount: String(closure.final_approved_total ?? ""), date: today(), method: "", reference: "" });
    const [receipt, setReceipt] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const r = await upload(`/delivery/closures/${closure.id}/pay`, {
                amount: form.amount.replace(",", "."), date: form.date, method: form.method.trim(), reference: form.reference.trim(), receipt,
            });
            toast.success(r.message);
            onPaid();
        } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Registrar el pago</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {closure.agency}, semana {closure.week}. Monto final aprobado: <b>{money(closure.final_approved_total)}</b>.
                </Typography>
                <Stack spacing={2}>
                    <TextField label="Monto pagado" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} inputProps={{ inputMode: "decimal" }} />
                    <TextField type="date" label="Fecha de pago" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} InputLabelProps={{ shrink: true }} />
                    <TextField label="Método" placeholder="Pago móvil, Zelle, efectivo…" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} />
                    <TextField label="Referencia" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                    <Button component="label" variant="outlined" startIcon={<AttachFileRounded />} sx={{ justifyContent: "flex-start" }}>
                        {receipt ? receipt.name : "Adjuntar comprobante (opcional)"}
                        <input hidden type="file" accept="image/*,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                    </Button>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving || !form.date || form.amount.trim() === ""}>Marcar pagado</Button>
            </DialogActions>
        </Dialog>
    );
};
