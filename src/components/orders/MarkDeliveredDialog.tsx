import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem, Typography, Box, Divider } from "@mui/material";
import { fmtMoney } from "../../lib/money";

interface MarkDeliveredDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (data: any) => void;
    totalUSD: number;
    binanceRate: number;
    isCash: boolean;
}

export const MarkDeliveredDialog: React.FC<MarkDeliveredDialogProps> = ({
    open,
    onClose,
    onConfirm,
    totalUSD,
    binanceRate,
    isCash
}) => {
    const [cashReceived, setCashReceived] = useState<number>(totalUSD);
    const [changeCoveredBy, setChangeCoveredBy] = useState<string>("agency");
    const [changeCompany, setChangeCompany] = useState<number>(0);
    const [changeAgency, setChangeAgency] = useState<number>(0);

    const changeAmount = Math.max(0, cashReceived - totalUSD);

    useEffect(() => {
        if (changeCoveredBy === "agency") {
            setChangeAgency(changeAmount);
            setChangeCompany(0);
        } else if (changeCoveredBy === "company") {
            setChangeCompany(changeAmount);
            setChangeAgency(0);
        }
    }, [changeAmount, changeCoveredBy]);

    const handleConfirm = () => {
        onConfirm({
            cash_received: cashReceived,
            change_covered_by: changeCoveredBy,
            change_amount_company: changeCompany,
            change_amount_agency: changeAgency,
        });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Marcar como Entregado</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Total a pagar: <b>{fmtMoney(totalUSD, 'USD')}</b> / ≈ {fmtMoney(totalUSD * binanceRate, 'VES')}
                </Typography>

                {isCash ? (
                    <>
                        <TextField
                            label="Efectivo Recibido (USD)"
                            type="number"
                            fullWidth
                            value={cashReceived}
                            onChange={(e) => setCashReceived(Number(e.target.value))}
                        />
                        <Typography variant="body2">
                            Vuelto Total: <b>{fmtMoney(changeAmount, 'USD')}</b>
                        </Typography>

                        <TextField
                            select
                            label="Quién cubre el vuelto?"
                            fullWidth
                            value={changeCoveredBy}
                            onChange={(e) => setChangeCoveredBy(e.target.value)}
                        >
                            <MenuItem value="agency">Agencia</MenuItem>
                            <MenuItem value="company">Empresa</MenuItem>
                            <MenuItem value="partial">Parcial (Agencia + Empresa)</MenuItem>
                        </TextField>

                        {changeCoveredBy === "partial" && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    label="Monto Empresa"
                                    type="number"
                                    value={changeCompany}
                                    onChange={(e) => setChangeCompany(Number(e.target.value))}
                                />
                                <TextField
                                    label="Monto Agencia"
                                    type="number"
                                    value={changeAgency}
                                    onChange={(e) => setChangeAgency(Number(e.target.value))}
                                />
                            </Box>
                        )}

                        {changeCoveredBy === "partial" && (changeCompany + changeAgency !== changeAmount) && (
                            <Typography variant="caption" color="error">
                                La suma ({changeCompany + changeAgency}) debe ser igual al vuelto total ({changeAmount})
                            </Typography>
                        )}
                    </>
                ) : (
                    <Typography>Confirma que el pedido ha sido entregado correctamente.</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    variant="contained"
                    color="success"
                    onClick={handleConfirm}
                    disabled={isCash && changeCoveredBy === "partial" && (Math.abs((changeCompany + changeAgency) - changeAmount) > 0.01)}
                >
                    Confirmar Entrega
                </Button>
            </DialogActions>
        </Dialog>
    );
};
