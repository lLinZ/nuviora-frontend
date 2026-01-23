// components/orders/PostponeOrderDialog.tsx
import {
    Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useState } from "react";
import { ButtonCustom, TextFieldCustom } from "../custom";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../store/orders/OrdersStore";

interface Props {
    open: boolean;
    onClose: () => void;
    orderId?: number;
    targetStatus?: string;
}

export const PostponeOrderDialog: FC<Props> = ({ open, onClose, orderId, targetStatus }) => {
    const { updateOrder } = useOrdersStore();
    const [scheduledFor, setScheduledFor] = useState<string>("");
    const [reason, setReason] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const isTodayOnly = targetStatus === "Programado para mas tarde";

    const handlePostpone = async () => {
        if (!orderId) return;
        if (!scheduledFor) {
            toast.error("Debes seleccionar " + (isTodayOnly ? "la hora" : "fecha y hora"));
            return;
        }

        setLoading(true);
        const body = new URLSearchParams();

        let finalScheduled = scheduledFor;
        // Si solo capturamos hora (HH:mm), lo unimos a la fecha de hoy
        if (isTodayOnly && scheduledFor.length === 5) {
            const today = new Date().toISOString().split('T')[0];
            finalScheduled = `${today}T${scheduledFor}`;
        }

        body.append("scheduled_for", finalScheduled);
        if (reason.trim()) body.append("reason", reason.trim());

        try {
            const { status, response }: IResponse = await request(
                `/orders/${orderId}/postpone`,
                "POST",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Orden pospuesta correctamente ✅");
                setReason("");
                setScheduledFor("");
                onClose();
            } else {
                toast.error("No se pudo posponer la orden ❌");
            }
        } catch (e) {
            toast.error("Error en el servidor al posponer 🚨");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
                {isTodayOnly ? "Programar para más tarde" : "Programar para otro día"}
                <IconButton onClick={onClose}>
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                    label={isTodayOnly ? "Seleccionar hora para hoy" : "Fecha y hora"}
                    type={isTodayOnly ? "time" : "datetime-local"}
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    helperText={isTodayOnly ? "La orden se mantendrá programada para la fecha actual." : ""}
                />
                <TextFieldCustom
                    label="Motivo (opcional)"
                    multiline
                    minRows={3}
                    value={reason}
                    onChange={(e: any) => setReason(e.target.value)}
                    placeholder="Describe brevemente el motivo…"
                    fullWidth
                />
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom variant="outlined" onClick={onClose} disabled={loading}>
                    Cerrar
                </ButtonCustom>
                <ButtonCustom
                    variant="contained"
                    onClick={handlePostpone}
                    disabled={loading}
                >
                    {loading ? "Guardando..." : "Posponer"}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
