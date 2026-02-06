import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Grid,
    TextField,
    MenuItem,
    IconButton,
    Paper,
    InputAdornment,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { ButtonCustom, SelectCustom } from "../../components/custom";
import { useUserStore } from "../../store/user/UserStore";
import { request } from "../../common/request";
import { toast } from "react-toastify";
import { IResponse } from "../../interfaces/response-type";
import { green, red, blue } from "@mui/material/colors";

export type PaymentMethodType =
    | "DOLARES_EFECTIVO"
    | "BOLIVARES_EFECTIVO"
    | "EUROS_EFECTIVO"
    | "PAGOMOVIL"
    | "TRANSFERENCIA_BANCARIA_BOLIVARES"
    | "ZINLI"
    | "ZELLE"
    | "BINANCE"
    | "PAYPAL";

export interface PaymentMethod {
    method: PaymentMethodType;
    amount: number;
}

interface OrderPaymentSectionProps {
    order: any;
    onPaymentsChange?: (payments: PaymentMethod[]) => void;
    onUpdate?: () => void;
}

const PAYMENT_OPTIONS = [
    { value: "DOLARES_EFECTIVO", label: "Dólares" },
    { value: "BOLIVARES_EFECTIVO", label: "Bolívares (Efec)" },
    { value: "PAGOMOVIL", label: "Pago Móvil" },
    { value: "TRANSFERENCIA_BANCARIA_BOLIVARES", label: "Transf. Bs" },
    { value: "ZELLE", label: "Zelle" },
    { value: "BINANCE", label: "Binance" },
    { value: "PAYPAL", label: "PayPal" },
    { value: "EUROS_EFECTIVO", label: "Euros" },
    { value: "ZINLI", label: "Zinli" },
];

export const LiteOrderPaymentSection: React.FC<OrderPaymentSectionProps> = ({ order, onPaymentsChange, onUpdate }) => {
    const user = useUserStore((state) => state.user);
    const [rows, setRows] = useState<{ method: string, amount: string }[]>([]);
    const [uploading, setUploading] = useState(false);

    // Load initial payments
    useEffect(() => {
        if (order.payments && order.payments.length > 0) {
            setRows(order.payments.map((p: any) => ({
                method: p.method,
                amount: String(p.amount)
            })));
        } else {
            setRows([{ method: "", amount: "" }]);
        }
    }, [order.payments]);

    const handleRowChange = (index: number, field: "method" | "amount", value: string) => {
        const newRows = [...rows];
        // @ts-ignore
        newRows[index][field] = value;
        setRows(newRows);
        propagateChanges(newRows);
    };

    const handleAddRow = () => {
        setRows([...rows, { method: "", amount: "" }]);
    };

    const handleRemoveRow = (index: number) => {
        const newRows = rows.filter((_, i) => i !== index);
        if (newRows.length === 0) newRows.push({ method: "", amount: "" });
        setRows(newRows);
        propagateChanges(newRows);
    };

    const propagateChanges = (currentRows: any[]) => {
        const serialized = currentRows
            .filter(r => r.method && r.amount && !isNaN(Number(r.amount)))
            .map(r => ({ method: r.method, amount: Number(r.amount) }));
        if (onPaymentsChange) onPaymentsChange(serialized);
    };

    const handleSave = async () => {
        const payments = rows
            .filter(r => r.method && r.amount)
            .map(r => {
                const isVes = ["BOLIVARES_EFECTIVO", "PAGOMOVIL", "TRANSFERENCIA_BANCARIA_BOLIVARES"].includes(r.method);
                return {
                    method: r.method,
                    amount: r.amount,
                    rate: isVes ? (Number(order.binance_rate) || 0) : undefined
                };
            });

        if (payments.length === 0) return;

        try {
            const body = new URLSearchParams();
            payments.forEach((payment, index) => {
                body.append(`payments[${index}][method]`, payment.method);
                body.append(`payments[${index}][amount]`, payment.amount.toString());
                if (payment.rate) {
                    body.append(`payments[${index}][rate]`, payment.rate.toString());
                }
            });

            const { status, response }: IResponse = await request(`/orders/${order.id}/payment`, "PUT", body);
            if (status) {
                toast.success("Pagos guardados");
                if (onUpdate) onUpdate();
            } else {
                toast.error("Error al guardar");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('payment_receipt', file);
            const { status, response } = await request(`/orders/${order.id}/payment-receipt`, "POST", formData, true);
            if (status === 200) {
                toast.success('Comprobante subido');
                if (onUpdate) onUpdate();
            } else {
                toast.error('Error al subir');
            }
        } finally {
            setUploading(false);
        }
    };

    const totalPaid = rows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
    const totalOrder = Number(order.current_total_price) || 0;
    const remaining = totalOrder - totalPaid;

    return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #eee', fontFamily: 'inherit' }}>
            {/* Header Clean */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Pagos y Comprobantes</Typography>
                <Box>
                    {remaining > 0.01 ? (
                        <Typography variant="body2" color="text.secondary">
                            Pendiente: <Box component="span" fontWeight="bold" color="error.main">${remaining.toFixed(2)}</Box>
                        </Typography>
                    ) : (
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                            ✔ Pagado Completo {remaining < -0.01 && `(Vuelto: $${Math.abs(remaining).toFixed(2)})`}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* List of Payments - Minimalist Table-like rows */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {rows.map((row, index) => {
                    const isVes = ["BOLIVARES_EFECTIVO", "PAGOMOVIL", "TRANSFERENCIA_BANCARIA_BOLIVARES"].includes(row.method);
                    const rate = Number(order.binance_rate) || 0;
                    const amountBs = (Number(row.amount) * rate);

                    return (
                        <Box key={index}>
                            <Grid container spacing={1} alignItems="center">
                                <Grid size={{ xs: 7 }}>
                                    <SelectCustom
                                        fullWidth
                                        size="small"
                                        value={row.method}
                                        onChange={(e) => handleRowChange(index, "method", e.target.value as string)}
                                        displayEmpty
                                        variant="standard"
                                        sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.9rem' } }}
                                    >
                                        <MenuItem value="" disabled>Método...</MenuItem>
                                        {PAYMENT_OPTIONS.map(opt => (
                                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                        ))}
                                    </SelectCustom>
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="0.00"
                                        value={row.amount}
                                        onChange={(e) => handleRowChange(index, "amount", e.target.value)}
                                        type="number"
                                        variant="standard"
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><Typography variant="caption">$</Typography></InputAdornment>,
                                            sx: { fontSize: '0.9rem' }
                                        }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 1 }}>
                                    <IconButton size="small" onClick={() => handleRemoveRow(index)} sx={{ p: 0.5, color: 'text.disabled' }}>
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Grid>
                            </Grid>
                            {isVes && rate > 0 && !isNaN(amountBs) && amountBs > 0 && (
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, ml: 1, color: 'info.main', fontWeight: 'bold' }}>
                                    = Bs {amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa: {rate})
                                </Typography>
                            )}
                        </Box>
                    );
                })}
            </Box>

            {/* Action Buttons Row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, alignItems: 'center' }}>
                <Typography
                    variant="caption"
                    color="primary"
                    sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'bold' }}
                    onClick={handleAddRow}
                >
                    <AddCircleOutlineIcon fontSize="inherit" /> Agregar Otro
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    {/* Comprobante Minimalista */}
                    <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="lite-receipt-upload"
                        type="file"
                        onChange={handleReceiptUpload}
                    />
                    <label htmlFor="lite-receipt-upload">
                        <IconButton component="span" size="small" disabled={uploading} color={order.payment_receipt ? "success" : "default"}>
                            <CloudUploadIcon fontSize="small" />
                        </IconButton>
                    </label>
                    {order.payment_receipt && (
                        <IconButton size="small" color="primary" onClick={() => {
                            const url = `${import.meta.env.VITE_BACKEND_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/orders/${order.id}/payment-receipt`;
                            window.open(url, '_blank');
                        }}>
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                    )}

                    <ButtonCustom
                        onClick={handleSave}
                        size="small"
                        sx={{ borderRadius: 4, px: 3, minHeight: 30 }}
                    >
                        Guardar
                    </ButtonCustom>
                </Box>
            </Box>
        </Paper>
    );
};
