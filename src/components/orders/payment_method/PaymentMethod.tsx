import React, { useState } from "react";
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
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { ButtonCustom, SelectCustom, TextFieldCustom, TypographyCustom } from "../../custom";
import { useUserStore } from "../../../store/user/UserStore";

export type PaymentMethodType =
    | "BOLIVARES_TRANSFERENCIA"
    | "BOLIVARES_EFECTIVO"
    | "DOLARES_EFECTIVO"
    | "DOLARES_ZELLE";

export interface PaymentMethod {
    method: PaymentMethodType;
    amount: number;
}

interface PaymentMethodsSelectorProps {
    initialValue?: PaymentMethod[];
    onChange?: (value: PaymentMethod[]) => void; // se dispara en cada cambio
    onSave?: (value: PaymentMethod[]) => void;   // se dispara al hacer click en "Guardar"
}

interface PaymentRowState {
    method: PaymentMethodType | "";
    amount: string; // lo guardamos como string mientras el user escribe
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethodType; label: string }[] = [
    { value: "BOLIVARES_TRANSFERENCIA", label: "Bolívares transferencia" },
    { value: "BOLIVARES_EFECTIVO", label: "Bolívares efectivo" },
    { value: "DOLARES_EFECTIVO", label: "Dólares efectivo" },
    { value: "DOLARES_ZELLE", label: "Dólares Zelle" },
];

const PaymentMethodsSelector: React.FC<PaymentMethodsSelectorProps> = ({
    initialValue,
    onChange,
    onSave,
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
        onSave?.(result);
        // Aquí podrías hacer un reset si quisieras, pero lo dejo tal cual
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', flexFlow: 'row wrap', gap: 2, alignItems: 'center', justifyContent: 'center', mb: 2 }}>

                <TypographyCustom variant="h6" sx={{ mb: 1 }}>
                    Métodos de pago
                </TypographyCustom>
                <Box>
                    <IconButton
                        sx={{ background: user.color, color: (theme) => theme.palette.getContrastText(user.color) }}
                        onClick={handleAddRow}
                    >
                        <AddCircleOutlineIcon />
                    </IconButton>
                </Box>
            </Box>
            <Stack spacing={1.5}>
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
                            {/* Botón eliminar fila */}
                            <IconButton
                                aria-label="Eliminar método"
                                onClick={() => handleRemoveRow(index)}
                                size="small"
                                color="error"
                            >
                                <DeleteOutlineIcon />
                            </IconButton>
                            {/* Select método de pago */}
                            <FormControl
                                fullWidth
                                size="small"
                                error={methodError}
                            >
                                <SelectCustom
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

                            {/* Monto */}
                            <TextFieldCustom
                                label="Monto"
                                value={row.amount}
                                onChange={(e) =>
                                    handleRowChange(index, "amount", e.target.value)
                                }
                                error={amountError}
                                helperText={amountError ? "Monto inválido" : " "}
                            />

                        </Box>
                    );
                })}

                {/* Botón para agregar otra fila */}


                {/* Botón guardar */}
                <Box textAlign="right" mt={1}>
                    <ButtonCustom variant="contained" color="primary" onClick={handleSave}>
                        Guardar
                    </ButtonCustom>
                </Box>
            </Stack>
        </Box>
    );
};

export default PaymentMethodsSelector;
