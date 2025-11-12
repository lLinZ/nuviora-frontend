// src/components/inventory/EditProductDialog.tsx
import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, MenuItem } from "@mui/material";
import { ButtonCustom, TextFieldCustom } from "../custom";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";

export const EditProductDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    product: any | null;
    onSaved: (p: any) => void;
}> = ({ open, onClose, product, onSaved }) => {
    const [form, setForm] = useState<any>({ price: 0, cost: 0, currency: "USD", stock: 0 });

    useEffect(() => {
        setForm(product ?? { price: 0, cost: 0, currency: "USD", stock: 0 });
    }, [product]);

    const save = async () => {
        try {
            const body = new URLSearchParams();
            ['sku', 'title', 'name', 'image', 'currency'].forEach(k => form[k] !== undefined && body.append(k, form[k] ?? ''));
            ['price', 'cost', 'stock'].forEach(k => body.append(k, String(form[k] ?? 0)));

            let res: IResponse;
            if (form?.id) {
                res = await request(`/inventory/products/${form.id}`, "PUT", body);
            } else {
                res = await request(`/inventory/products`, "POST", body);
            }
            if (res.status) {
                const data = await res.response.json();
                onSaved(data.product);
                toast.success(data.message ?? "Guardado ✅");
                onClose();
            } else {
                toast.error("No se pudo guardar ❌");
            }
        } catch {
            toast.error("Error al guardar 🚨");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{form?.id ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
                    <TextFieldCustom label="SKU" value={form.sku ?? ''} onChange={(e: any) => setForm({ ...form, sku: e.target.value })} />
                    <TextFieldCustom label="Nombre/Título" value={form.title ?? form.name ?? ''} onChange={(e: any) => setForm({ ...form, title: e.target.value })} />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextFieldCustom label="Costo" type="number" value={form.cost} onChange={(e: any) => setForm({ ...form, cost: e.target.value })} />
                        <TextFieldCustom label="Precio" type="number" value={form.price} onChange={(e: any) => setForm({ ...form, price: e.target.value })} />
                        <TextFieldCustom
                            select
                            label="Moneda"
                            value={form.currency ?? 'USD'}
                            onChange={(e: any) => setForm({ ...form, currency: e.target.value })}
                        >
                            <MenuItem value="USD">USD</MenuItem>
                            <MenuItem value="VES">VES</MenuItem>
                        </TextFieldCustom>
                    </Box>
                    <TextFieldCustom label="Stock" type="number" value={form.stock} onChange={(e: any) => setForm({ ...form, stock: e.target.value })} />
                    <TextFieldCustom label="Imagen (URL)" value={form.image ?? ''} onChange={(e: any) => setForm({ ...form, image: e.target.value })} />
                </Box>
            </DialogContent>
            <DialogActions>
                <ButtonCustom variant="outlined" onClick={onClose}>Cancelar</ButtonCustom>
                <ButtonCustom onClick={save}>Guardar</ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
