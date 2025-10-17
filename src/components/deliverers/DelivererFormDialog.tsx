// src/components/deliverers/DelivererFormDialog.tsx
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Box
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useEffect, useState } from "react";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";

interface Props {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    editing?: any | null; // si viene, es edición
}

export const DelivererFormDialog: FC<Props> = ({ open, onClose, onSaved, editing }) => {
    const [names, setNames] = useState("");
    const [surnames, setSurnames] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const isEditing = Boolean(editing);

    useEffect(() => {
        if (open) {
            if (editing) {
                setNames(editing.names ?? "");
                setSurnames(editing.surnames ?? "");
                setEmail(editing.email ?? "");
                setPassword("");
            } else {
                setNames("");
                setSurnames("");
                setEmail("");
                setPassword("");
            }
        }
    }, [open, editing]);

    const handleSubmit = async () => {
        try {
            if (!names || !email) {
                toast.error("Nombre y email son obligatorios");
                return;
            }

            if (!isEditing && !password) {
                toast.error("La contraseña es obligatoria");
                return;
            }

            const body = new URLSearchParams();
            body.append("names", names);
            if (surnames) body.append("surnames", surnames);
            body.append("email", email);
            if (password) body.append("password", password);

            let res: IResponse;
            if (isEditing) {
                res = await request(`/users/deliverers/${editing.id}`, "PUT", body);
            } else {
                res = await request(`/users/deliverers`, "POST", body);
            }

            if (res.status) {
                toast.success(isEditing ? "Repartidor actualizado ✅" : "Repartidor creado ✅");
                onSaved();
            } else {
                toast.error("No se pudo guardar ❌");
            }
        } catch {
            toast.error("Error en el servidor 🚨");
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
                {isEditing ? "Editar repartidor" : "Nuevo repartidor"}
                <IconButton onClick={onClose}><CloseRoundedIcon /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField label="Nombres" value={names} onChange={(e) => setNames(e.target.value)} fullWidth />
                <TextField label="Apellidos" value={surnames} onChange={(e) => setSurnames(e.target.value)} fullWidth />
                <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
                {!isEditing && (
                    <TextField label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom variant="outlined" onClick={onClose}>Cancelar</ButtonCustom>
                <ButtonCustom variant="contained" onClick={handleSubmit}>
                    {isEditing ? "Guardar" : "Crear"}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
