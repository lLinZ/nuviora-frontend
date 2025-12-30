import React, { useState, useEffect } from "react";
import {
    Box,
    Stack,
    TextField,
    Select,
    MenuItem,
    IconButton,
    Button,
    FormControl,
    InputLabel,
    FormHelperText,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CalculateIcon from "@mui/icons-material/Calculate";
import { ButtonCustom, SelectCustom, TextFieldCustom, TypographyCustom } from "../../custom";
import { useUserStore } from "../../../store/user/UserStore";
import { request } from "../../../common/request";
import { IResponse } from "../../../interfaces/response-type";

export type PaymentMethodType =
    | "BOLIVARES_TRANSFERENCIA"
    | "BOLIVARES_EFECTIVO"
    | "DOLARES_EFECTIVO"
    | "ZELLE_DOLARES";

export interface PaymentMethod {
    method: PaymentMethodType;
    amount: number;
}

interface PaymentMethodsSelectorProps {
    initialValue?: PaymentMethod[];
    onChange?: (value: PaymentMethod[]) => void; // se dispara en cada cambio
    onSave?: (value: PaymentMethod[]) => void;   // se dispara al hacer click en "Guardar"
    totalPrice?: number;
}

interface PaymentRowState {
    method: PaymentMethodType | "";
    amount: string; // lo guardamos como string mientras el user escribe
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethodType; label: string }[] = [
    { value: "BOLIVARES_TRANSFERENCIA", label: "Bolívares transferencia" },
    { value: "BOLIVARES_EFECTIVO", label: "Bolívares efectivo" },
    { value: "DOLARES_EFECTIVO", label: "Dólares efectivo" },
    { value: "ZELLE_DOLARES", label: "Dólares Zelle" },
];

const PaymentMethodsSelector: React.FC<PaymentMethodsSelectorProps> = ({
    initialValue,
    onChange,
    onSave,
    totalPrice = 0,
}) => {
    const [rows, setRows] = useState<PaymentRowState[]>(() => {
        if (initialValue && initialValue.length > 0) {
            return initialValue.map((item) => ({
                method: item.method,
                amount: item.amount.toString(),
            }));
        }
        return [{ method: "", amount: "" }];
    });

    const [touched, setTouched] = useState(false);
    const user = useUserStore(state => state.user);

    // Mixed Calculation States
    const [showMixedCalc, setShowMixedCalc] = useState(false);
    const [bcvRate, setBcvRate] = useState<number>(0);
    const [calcData, setCalcData] = useState({
        amountUsd: "",
        discountPercent: "",
    });

    const fetchBcvRate = async () => {
        try {
            const { status, response }: IResponse = await request("/currency", "GET");
            if (status === 200) {
                const { data } = await response.json();
                if (data.bcv_usd?.value) {
                    setBcvRate(Number(data.bcv_usd.value));
                }
            }
        } catch (error) {
            console.error("Error fetching BCV rate:", error);
        }
    };

    useEffect(() => {
        if (showMixedCalc && bcvRate === 0) {
            fetchBcvRate();
        }
    }, [showMixedCalc]);

    const serialize = (state: PaymentRowState[]): PaymentMethod[] => {
        return state
            .filter((row) => row.method !== "" && row.amount.trim() !== "")
            .map((row) => ({
                method: row.method as PaymentMethodType,
                amount: Number(row.amount),
            }));
    };

    const isRowValid = (row: PaymentRowState): boolean => {
        if (row.method === "") return false;
        const value = Number(row.amount);
        if (row.amount.trim() === "" || Number.isNaN(value)) return false;
        if (value <= 0) return false;
        return true;
    };

    const hasErrors = (): boolean =>
        rows.some((row) => !isRowValid(row));

    const handleRowChange = (
        index: number,
        field: "method" | "amount",
        value: string
    ) => {
        const newRows = [...rows];
        if (field === "method") {
            newRows[index].method = value as PaymentMethodType | "";
        } else {
            newRows[index].amount = value;
        }
        setRows(newRows);
        onChange?.(serialize(newRows));
    };

    const handleAddRow = () => {
        setRows((prev) => [...prev, { method: "", amount: "" }]);
    };

    const handleRemoveRow = (index: number) => {
        setRows((prev) => {
            if (prev.length === 1) {
                // siempre dejamos al menos una fila
                return [{ method: "", amount: "" }];
            }
            const newRows = [...prev];
            newRows.splice(index, 1);
            onChange?.(serialize(newRows));
            return newRows;
        });
    };

    const handleSave = () => {
        setTouched(true);

        if (hasErrors()) return;

        const result = serialize(rows);
        console.log({ result })
        onSave?.(result);
    };

    const handleApplyMixedCalc = () => {
        const mp = Number(calcData.amountUsd); // Monto Pagado en divisas
        const d = Number(calcData.discountPercent) / 100; // Porcentaje de descuento

        if (isNaN(mp) || isNaN(d) || bcvRate === 0) return;

        // Formula 1: MP / (1-D) = ME (Monto Equivalente)
        const me = mp / (1 - d);

        // Formula 2: TO - ME = MAPD (Monto Restante a Pagar en Divisas)
        const mapd = totalPrice - me;

        // Formula 3: MAPD x BCV = MAPBS (Monto Restante a Pagar en Bolívares)
        const mapbs = Math.max(0, mapd * bcvRate);

        // Actualizar filas de pago
        const newRows: PaymentRowState[] = [
            { method: "DOLARES_EFECTIVO", amount: mp.toFixed(2) },
            { method: "BOLIVARES_TRANSFERENCIA", amount: (mapbs).toFixed(2) }
        ];

        setRows(newRows);
        onChange?.(serialize(newRows));
        setShowMixedCalc(false);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', flexFlow: 'row wrap', gap: 2, alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <TypographyCustom variant="h6" sx={{ mb: 1 }}>
                    Métodos de pago
                </TypographyCustom>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                        sx={{ background: user.color, color: (theme) => theme.palette.getContrastText(user.color) }}
                        onClick={handleAddRow}
                        title="Agregar Fila"
                    >
                        <AddCircleOutlineIcon />
                    </IconButton>
                    <IconButton
                        sx={{ background: '#4caf50', color: 'white' }}
                        onClick={() => setShowMixedCalc(true)}
                        title="Cálculo Mixto USD/VES"
                    >
                        <CalculateIcon />
                    </IconButton>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {rows.map((row, index) => {
                    const showErrors = touched;
                    const methodError = showErrors && row.method === "";
                    const amountNumber = Number(row.amount);
                    const amountError =
                        showErrors &&
                        (row.amount.trim() === "" ||
                            Number.isNaN(amountNumber) ||
                            amountNumber <= 0);

                    return (
                        <Box
                            key={index}
                            sx={{ display: 'flex', flexFlow: 'row nowrap', gap: 1, alignItems: 'center', justifyContent: 'center' }}
                        >
                            {user.role?.description !== 'Repartidor' && (
                                <IconButton
                                    aria-label="Eliminar método"
                                    onClick={() => handleRemoveRow(index)}
                                    size="small"
                                    color="error"
                                >
                                    <DeleteOutlineIcon />
                                </IconButton>
                            )}
                            <FormControl
                                fullWidth
                                error={methodError}
                            >
                                <SelectCustom
                                    variant="outlined"
                                    label={'Metodo'}
                                    value={row.method}
                                    onChange={(e: any) =>
                                        handleRowChange(index, "method", e.target.value)
                                    }
                                >
                                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </SelectCustom>
                                {methodError && (
                                    <FormHelperText>
                                        Selecciona un método
                                    </FormHelperText>
                                )}
                            </FormControl>

                            <TextFieldCustom
                                variant="filled"
                                label="Monto"
                                value={row.amount}
                                onChange={(e: any) =>
                                    handleRowChange(index, "amount", e.target.value)
                                }
                                error={amountError}
                            />
                        </Box>
                    );
                })}

                {user.role?.description !== 'Repartidor' && (
                    <Box textAlign="right" mt={1}>
                        <ButtonCustom variant="contained" color="primary" onClick={handleSave}>
                            Guardar
                        </ButtonCustom>
                    </Box>
                )}
            </Box>

            {/* Diálogo de Cálculo Mixto */}
            <Dialog open={showMixedCalc} onClose={() => setShowMixedCalc(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Cálculo Mixto (USD + VES)</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Total de la orden: <strong>${totalPrice.toFixed(2)}</strong>
                        </Typography>

                        <TextField
                            label="Monto en Dólares ($)"
                            type="number"
                            value={calcData.amountUsd}
                            onChange={(e) => setCalcData({ ...calcData, amountUsd: e.target.value })}
                            fullWidth
                            InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                        />

                        <TextField
                            label="Porcentaje de Descuento (%)"
                            type="number"
                            value={calcData.discountPercent}
                            onChange={(e) => setCalcData({ ...calcData, discountPercent: e.target.value })}
                            fullWidth
                            InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                            helperText="Descuento aplicado al monto en divisas"
                        />

                        <TextField
                            label="Tasa BCV del día"
                            type="number"
                            value={bcvRate}
                            onChange={(e) => setBcvRate(Number(e.target.value))}
                            fullWidth
                            helperText="Cargada automáticamente de la configuración"
                        />

                        {Number(calcData.amountUsd) > 0 && Number(calcData.discountPercent) >= 0 && (
                            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>Resultados del cálculo:</Typography>
                                <Typography variant="body2">
                                    Monto Equivalente: <strong>${(Number(calcData.amountUsd) / (1 - (Number(calcData.discountPercent) / 100))).toFixed(2)}</strong>
                                </Typography>
                                <Typography variant="body2" color="primary" fontWeight="bold">
                                    Restante en Bs: <strong>Bs. {Math.max(0, (totalPrice - (Number(calcData.amountUsd) / (1 - (Number(calcData.discountPercent) / 100)))) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowMixedCalc(false)}>Cancelar</Button>
                    <ButtonCustom
                        onClick={handleApplyMixedCalc}
                        disabled={!calcData.amountUsd || !calcData.discountPercent || bcvRate === 0}
                    >
                        Aplicar Cálculo
                    </ButtonCustom>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PaymentMethodsSelector;
