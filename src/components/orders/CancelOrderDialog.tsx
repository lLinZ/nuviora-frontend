import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from "@mui/material";
import { useState } from "react";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";

export const CancelOrderDialog = ({ open, onClose, orderId, onCancelled }: any) => {
    const [reason, setReason] = useState("");

    const handleSubmit = async () => {
        const body = new URLSearchParams();
        body.append("reason", reason);
        const { status, response }: IResponse = await request(
            `/orders/${orderId}/cancel`,
            "POST",
            body
        );
        if (status) {
            const data = await response.json();
            onCancelled(data.cancellation);
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Cancelar orden</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Motivo de cancelación"
                    fullWidth
                    multiline
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
                <Button onClick={handleSubmit} color="error" disabled={!reason.trim()}>
                    Confirmar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
