import React, { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Grid,
    TextField,
    Paper,
    Divider,
    Stack,
    IconButton,
    Tooltip,
    Collapse,
    Chip,
    useTheme,
    MenuItem,
} from "@mui/material";
import BusinessIcon from '@mui/icons-material/Business';
import StoreIcon from '@mui/icons-material/Store';
import GroupsIcon from '@mui/icons-material/Groups';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

import { ButtonCustom, SelectCustom } from "../custom";
import { useUserStore } from "../../store/user/UserStore";
import { request } from "../../common/request";
import { toast } from "react-toastify";
import { IResponse } from "../../interfaces/response-type";
import { green, blue, orange, grey, red } from "@mui/material/colors";
import { darken, lighten } from "@mui/material/styles";
import { IBank } from "../../interfaces/bank.types";
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import ContactPageIcon from '@mui/icons-material/ContactPage';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

interface OrderChangeSectionProps {
    order: any;
    onUpdate?: () => void;
    payments?: any[];
}

const CHANGE_METHOD_OPTIONS = [
    { value: "BOLIVARES_PAGOMOVIL", label: "Pago Móvil (Bolívares)" },
    { value: "BOLIVARES_TRANSFERENCIA", label: "Transferencia Bancaria (Bs)" },
    { value: "ZELLE_DOLARES", label: "Zelle (Dólares)" },
    { value: "BINANCE_DOLARES", label: "Binance PAY (USDT)" },
    { value: "PAYPAL_DOLARES", label: "Paypal (Dólares)" },
    { value: "ZINLI_DOLARES", label: "Zinli (Dólares)" },
    { value: "DOLARES_EFECTIVO", label: "Dólares efectivo" },
];

const AGENCY_CHANGE_METHOD_OPTIONS = [
    { value: "DOLARES_EFECTIVO", label: "Dólares efectivo" },
    { value: "BOLIVARES_EFECTIVO", label: "Bolívares efectivo" },
];

export const OrderChangeSection: React.FC<OrderChangeSectionProps> = ({ order, onUpdate, payments }) => {
    const user = useUserStore((state) => state.user);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [loading, setLoading] = useState(false);
    const [euroRate, setEuroRate] = useState<number>(Number(order.change_rate) || 0);

    const [form, setForm] = useState({
        cash_received: order.cash_received || "",
        change_amount: order.change_amount || "",
        change_covered_by: order.change_covered_by || "",
        change_amount_company: order.change_amount_company || "",
        change_amount_agency: order.change_amount_agency || "",
        change_method_company: order.change_method_company || "",
        change_method_agency: order.change_method_agency || "",
        change_rate: Number(order.change_rate) || 0,
        change_payment_details: order.change_payment_details || {},
    });

    const [banks, setBanks] = useState<IBank[]>([]);

    useEffect(() => {
        const fetchBanks = async () => {
            const { status, response }: IResponse = await request("/banks", "GET");
            if (status === 200) {
                const data = await response.json();
                setBanks(data);
            }
        };
        fetchBanks();
    }, []);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const { status, response }: IResponse = await request("/currency", "GET");
                if (status === 200) {
                    const { data } = await response.json();
                    if (data.bcv_eur?.value) {
                        const rate = Number(data.bcv_eur.value);
                        setEuroRate(rate);
                        setForm(prev => ({ ...prev, change_rate: rate }));
                    }
                }
            } catch (error) {
                console.error("Error fetching rates:", error);
            }
        };
        // Solo buscamos la tasa nueva si no hay una tasa ya guardada en la orden o si la guardada es 0
        if (!Number(order.change_rate)) {
            fetchRates();
        }
    }, [order.change_rate]);

    useEffect(() => {
        if (payments && payments.length > 0) {
            const totalReceived = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
            const orderTotal = Number(order.current_total_price) || 0;
            const diff = totalReceived - orderTotal;

            setForm(prev => ({
                ...prev,
                cash_received: totalReceived > 0 ? totalReceived.toFixed(2) : prev.cash_received,
                change_amount: diff > 0 ? diff.toFixed(2) : "0.00"
            }));
        }
    }, [payments, order.current_total_price]);

    useEffect(() => {
        setForm(prev => ({
            ...prev,
            cash_received: order.cash_received ?? "",
            change_amount: order.change_amount ?? "",
            change_covered_by: order.change_covered_by ?? "",
            change_amount_company: order.change_amount_company ?? "",
            change_amount_agency: order.change_amount_agency ?? "",
            change_method_company: order.change_method_company ?? "",
            change_method_agency: order.change_method_agency ?? "",
            change_rate: Number(order.change_rate) || euroRate,
            change_payment_details: (typeof order.change_payment_details === 'object' && order.change_payment_details !== null) ? order.change_payment_details : {},
        }));
    }, [order]);

    useEffect(() => {
        console.log("Order updated in OrderChangeSection:", order);
        if (order.change_payment_details) {
            console.log("Order has details:", order.change_payment_details);
        }
    }, [order]);

    const canEdit = ['Gerente', 'Admin', 'Vendedor'].includes(user.role?.description || '');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> | any) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleDetailChange = (name: string, value: any) => {
        setForm(prev => ({
            ...prev,
            change_payment_details: {
                ...(typeof prev.change_payment_details === 'object' ? prev.change_payment_details : {}),
                [name]: value
            }
        }));
    };

    const handleCopyDetails = () => {
        if (!form.change_payment_details) return;

        let text = "";
        const details = form.change_payment_details as any;

        if (form.change_method_company === 'BOLIVARES_PAGOMOVIL') {
            const bank = banks.find(b => b.id === details.bank_id)?.name || "N/A";
            text = `PAGO MÓVIL\nCédula: ${details.cedula}\nBanco: ${bank}\nTeléfono: ${details.phone_prefix}${details.phone_number}`;
        } else if (form.change_method_company === 'BOLIVARES_TRANSFERENCIA') {
            const bank = banks.find(b => b.id === details.bank_id)?.name || "N/A";
            text = `TRANSFERENCIA BANCARIA\nCuenta: ${details.account_number}\nCédula: ${details.cedula}\nBanco: ${bank}`;
        } else if (['ZELLE_DOLARES', 'BINANCE_DOLARES', 'PAYPAL_DOLARES', 'ZINLI_DOLARES'].includes(form.change_method_company)) {
            text = `${form.change_method_company.split('_')[0]}: ${details.email}`;
        }

        if (text) {
            navigator.clipboard.writeText(text);
            toast.info("Datos copiados al portapapeles 📋");
        }
    };

    const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("change_receipt", file);

        setLoading(true);
        try {
            const { status, response }: IResponse = await request(
                `/orders/${order.id}/change-receipt`,
                "POST",
                formData,
                true // isJson=false for FormData
            );

            if (status) {
                toast.success("Comprobante de vuelto subido");
                if (onUpdate) onUpdate();
            } else {
                const data = await response.json();
                toast.error(data.message || "Error al subir comprobante");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("_method", "PUT");
            formData.append("cash_received", form.cash_received);
            formData.append("change_amount", form.change_amount);
            formData.append("change_covered_by", form.change_covered_by);
            formData.append("change_amount_company", form.change_amount_company);
            formData.append("change_amount_agency", form.change_amount_agency);
            formData.append("change_method_company", form.change_method_company);
            formData.append("change_method_agency", form.change_method_agency);
            formData.append("change_rate", String(form.change_rate));
            formData.append("change_payment_details", JSON.stringify(form.change_payment_details));

            console.log("Saving form data via FormData:", Object.fromEntries(formData.entries()));

            const { status, response }: IResponse = await request(
                `/orders/${order.id}/change`,
                "POST",
                formData,
                true // multipart
            );

            if (status === 200) {
                toast.success("Vuelto actualizado correctamente");
                if (onUpdate) onUpdate();
            } else {
                const data = await response.json();
                console.error("Save error:", data);
                toast.error(data.message || "Error al actualizar el vuelto");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const changeAmountNum = Number(form.change_amount) || 0;
    const partialTotal = Number(form.change_amount_company) + Number(form.change_amount_agency);

    // Validamos que los montos parciales sumen el total del vuelto con una tolerancia para decimales
    const isSumCorrect = form.change_covered_by !== 'partial' || Math.abs(partialTotal - changeAmountNum) < 0.01;

    const isDetailsFilled = () => {
        if (form.change_covered_by === 'agency') return true;
        const method = form.change_method_company;
        if (!method || method === 'DOLARES_EFECTIVO') return true;
        const details = form.change_payment_details as any;
        if (!details) return false;

        if (method === 'BOLIVARES_PAGOMOVIL') {
            return !!(details.cedula && details.bank_id && details.phone_number);
        }
        if (method === 'BOLIVARES_TRANSFERENCIA') {
            return !!(details.account_number && details.cedula && details.bank_id);
        }
        if (['ZELLE_DOLARES', 'BINANCE_DOLARES', 'PAYPAL_DOLARES', 'ZINLI_DOLARES'].includes(method)) {
            return !!details.email;
        }
        return true;
    };

    const isMethodSelected =
        (form.change_covered_by === 'company' ? (!!form.change_method_company && isDetailsFilled()) :
            form.change_covered_by === 'agency' ? !!form.change_method_agency :
                form.change_covered_by === 'partial' ? (!!form.change_method_company && !!form.change_method_agency && isDetailsFilled()) :
                    false);

    // El botón se bloquea si es parcial y la suma no cuadra, o si no hay vuelto que registrar pero alguien intenta forzarlo,
    // o si faltan métodos de pago requeridos.
    const isSaveDisabled = loading || !isSumCorrect || !isMethodSelected || !form.change_covered_by || (changeAmountNum <= 0 && form.cash_received === order.cash_received);

    const currentRate = Number(form.change_rate) || Number(euroRate) || 0;
    const changeInVES = currentRate > 0 ? (changeAmountNum * currentRate).toLocaleString('es-VE', { minimumFractionDigits: 2 }) : "N/A";

    interface SelectorCardProps {
        value: string;
        label: string;
        description: string;
        icon: any;
        color: string;
    }

    const SelectorCard: React.FC<SelectorCardProps> = ({ value, label, description, icon, color }) => {
        const isSelected = form.change_covered_by === value;
        const activeColor = isDark ? lighten(color, 0.4) : color;

        return (
            <Paper
                elevation={0}
                onClick={() => canEdit && setForm(prev => ({ ...prev, change_covered_by: value }))}
                sx={{
                    p: 2,
                    cursor: canEdit ? 'pointer' : 'default',
                    border: '2px solid',
                    borderColor: isSelected ? activeColor : 'divider',
                    bgcolor: isSelected
                        ? (isDark ? darken(color, 0.8) : color + '08')
                        : (isDark ? 'rgba(255,255,255,0.03)' : 'white'),
                    borderRadius: 3,
                    transition: 'all 0.2s',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': canEdit ? { borderColor: activeColor, transform: 'translateY(-2px)' } : {}
                }}
            >
                <Box sx={{ color: isSelected ? activeColor : (isDark ? grey[600] : grey[400]), display: 'flex' }}>
                    {React.cloneElement(icon, { fontSize: 'large' })}
                </Box>
                <Typography variant="subtitle2" fontWeight="bold" color={isSelected ? activeColor : 'text.primary'}>
                    {label}
                </Typography>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                    {description}
                </Typography>
            </Paper>
        );
    };

    // --- VISIBILIDAD DINÁMICA ---
    // 1. Calculamos el vuelto real basado en los pagos actuales (staged o guardados)
    const totalPaidActual = (payments && payments.length > 0)
        ? payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
        : (order.payments?.reduce((acc: any, p: any) => acc + (Number(p.amount) || 0), 0) || 0);
    const currentTotalActual = Number(order.current_total_price) || 0;
    const currentCalculatedChange = totalPaidActual - currentTotalActual;

    // 2. ¿Debe mostrarse?
    // - Si el vuelto calculado es > 0, lo mostramos (necesita gestión).
    // - Si el vuelto es 0 o menos, solo lo mostramos si ya hay una gestión GUARDADA que tiene sentido mostrar (histórico).
    //   PERO, si el usuario está editando y el cálculo da 0, lo ocultamos para limpiar la interfaz.
    const shouldShow = currentCalculatedChange > 0.005 || (order.change_amount > 0 && currentCalculatedChange >= -0.01 && !canEdit);

    if (!shouldShow) return null;

    return (
        <Paper elevation={0} sx={{
            p: 4,
            borderRadius: 4,
            bgcolor: 'background.paper',
            mb: 3,
            border: '1px solid',
            borderColor: 'divider'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    🔄 Gestión de Vuelto
                </Typography>
                {changeAmountNum > 0 && (
                    <Tooltip title="Cantidad que se le debe devolver al cliente">
                        <Box sx={{
                            px: 2,
                            py: 0.5,
                            bgcolor: isDark ? darken(orange[900], 0.6) : orange[50],
                            color: isDark ? orange[200] : orange[900],
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}>
                            <CurrencyExchangeIcon fontSize="small" />
                            <Typography variant="subtitle2" fontWeight="black">DEVOLVER: ${changeAmountNum.toFixed(2)}</Typography>
                        </Box>
                    </Tooltip>
                )}
            </Box>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                        fullWidth
                        label="Efectivo Recibido ($)"
                        name="cash_received"
                        value={form.cash_received}
                        variant="outlined"
                        InputProps={{
                            readOnly: true,
                            startAdornment: <Typography variant="body2" sx={{ mr: 1, opacity: 0.5 }}>$</Typography>,
                            endAdornment: <Tooltip title="Calculado automáticamente"><InfoOutlinedIcon fontSize="small" color="disabled" /></Tooltip>
                        }}
                        sx={{ bgcolor: 'action.hover', borderRadius: 1 }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                        fullWidth
                        label="Monto del Vuelto ($)"
                        name="change_amount"
                        value={form.change_amount}
                        variant="outlined"
                        InputProps={{
                            readOnly: true,
                            startAdornment: <Typography variant="body2" sx={{ mr: 1, opacity: 0.5 }}>$</Typography>
                        }}
                        sx={{ bgcolor: 'action.hover', borderRadius: 1 }}
                    />
                </Grid>

                {changeAmountNum > 0 && (
                    <Grid size={{ xs: 12 }}>
                        <Paper elevation={0} sx={{
                            p: 2.5,
                            bgcolor: isDark ? 'rgba(25, 118, 210, 0.05)' : '#f8faff',
                            borderRadius: 4,
                            border: '1px solid',
                            borderColor: isDark ? blue[900] : blue[50],
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 2
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ p: 1, bgcolor: blue[600], color: 'white', borderRadius: 2, display: 'flex' }}>
                                    <CurrencyExchangeIcon />
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Equivalente en Bolívares</Typography>
                                    <Typography variant="h5" fontWeight="black" color={isDark ? blue[200] : blue[900]}>Bs. {changeInVES}</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>BCV Referencial Euro</Typography>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    {currentRate > 0 ? currentRate.toFixed(2) : "Calculando..."} Bs/$
                                </Typography>
                                {Number(order.change_rate) > 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        (Tasa guardada en histórico)
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                )}

                <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        Responsable del Vuelto
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <SelectorCard
                            value="company"
                            label="Empresa"
                            description="Vuelto vía transferencia o caja central"
                            icon={<BusinessIcon />}
                            color={blue[600]}
                        />
                        <SelectorCard
                            value="agency"
                            label="Agencia"
                            description="El repartidor entrega el vuelto en efectivo"
                            icon={<StoreIcon />}
                            color={green[600]}
                        />
                        <SelectorCard
                            value="partial"
                            label="Parcial"
                            description="Repartidor y Empresa cubren partes"
                            icon={<GroupsIcon />}
                            color={orange[700]}
                        />
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Collapse in={form.change_covered_by === 'company'}>
                        <Box sx={{ p: 3, bgcolor: isDark ? 'rgba(25, 118, 210, 0.05)' : 'rgba(25, 118, 210, 0.03)', borderRadius: 3, border: '1px solid', borderColor: isDark ? blue[900] : blue[100] }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', color: isDark ? blue[300] : blue[700], display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BusinessIcon fontSize="small" /> Método de Entrega (Empresa)
                            </Typography>
                            <SelectCustom
                                fullWidth
                                label="Método de Pago"
                                name="change_method_company"
                                value={form.change_method_company}
                                onChange={handleChange}
                                disabled={!canEdit || loading}
                                inputProps={{ readOnly: !canEdit }}
                            >
                                <MenuItem value="">Seleccione un método</MenuItem>
                                {CHANGE_METHOD_OPTIONS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </SelectCustom>

                            {form.change_method_company && (
                                <StructuredDetailForm
                                    method={form.change_method_company}
                                    details={form.change_payment_details}
                                    onChange={handleDetailChange}
                                    onCopy={handleCopyDetails}
                                    banks={banks}
                                    disabled={!canEdit || loading}
                                />
                            )}
                        </Box>
                    </Collapse>

                    <Collapse in={form.change_covered_by === 'agency'}>
                        <Box sx={{ p: 3, bgcolor: isDark ? 'rgba(46, 125, 50, 0.05)' : 'rgba(46, 125, 50, 0.03)', borderRadius: 3, border: '1px solid', borderColor: isDark ? green[900] : green[100] }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', color: isDark ? green[300] : green[700], display: 'flex', alignItems: 'center', gap: 1 }}>
                                <StoreIcon fontSize="small" /> Método de Entrega (Agencia)
                            </Typography>
                            <SelectCustom
                                fullWidth
                                label="Método de Pago"
                                name="change_method_agency"
                                value={form.change_method_agency}
                                onChange={handleChange}
                                disabled={!canEdit || loading}
                                inputProps={{ readOnly: !canEdit }}
                            >
                                <MenuItem value="">Seleccione un método</MenuItem>
                                {AGENCY_CHANGE_METHOD_OPTIONS.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                ))}
                            </SelectCustom>
                        </Box>
                    </Collapse>

                    <Collapse in={form.change_covered_by === 'partial'}>
                        <Box sx={{ p: 3, bgcolor: isDark ? 'rgba(237, 108, 2, 0.05)' : 'rgba(237, 108, 2, 0.03)', borderRadius: 4, border: '1px solid', borderColor: isDark ? orange[900] : orange[200] }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: isDark ? orange[300] : orange[900], display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <GroupsIcon fontSize="small" /> Distribución Combinada
                                </Typography>
                                {isSumCorrect ? (
                                    <Chip icon={<CheckCircleIcon />} label="Suma Correcta" color="success" size="small" />
                                ) : (
                                    <Chip icon={<ErrorOutlineIcon />} label="Error en montos" color="error" size="small" />
                                )}
                            </Box>

                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'divider', borderRadius: 2, bgcolor: 'transparent' }}>
                                        <Typography variant="caption" fontWeight="bold" sx={{ mb: 1.5, display: 'block', color: isDark ? blue[300] : blue[700] }}>🏙️ EMPRESA</Typography>
                                        <TextField fullWidth size="small" label="Monto" name="change_amount_company" value={form.change_amount_company} onChange={handleChange} sx={{ mb: 2 }}
                                            disabled={!canEdit || loading}
                                            InputProps={{
                                                readOnly: !canEdit,
                                                startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography>
                                            }} />
                                        <SelectCustom
                                            fullWidth
                                            size="small"
                                            label="Método"
                                            name="change_method_company"
                                            value={form.change_method_company}
                                            onChange={handleChange}
                                            disabled={!canEdit || loading}
                                            inputProps={{ readOnly: !canEdit }}
                                        >
                                            <MenuItem value="">Seleccione método</MenuItem>
                                            {CHANGE_METHOD_OPTIONS.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </SelectCustom>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'divider', borderRadius: 2, bgcolor: 'transparent' }}>
                                        <Typography variant="caption" fontWeight="bold" sx={{ mb: 1.5, display: 'block', color: isDark ? green[300] : green[700] }}>🏢 AGENCIA</Typography>
                                        <TextField fullWidth size="small" label="Monto" name="change_amount_agency" value={form.change_amount_agency} onChange={handleChange} sx={{ mb: 2 }}
                                            disabled={!canEdit || loading}
                                            InputProps={{
                                                readOnly: !canEdit,
                                                startAdornment: <Typography variant="caption" sx={{ mr: 0.5 }}>$</Typography>
                                            }} />
                                        <SelectCustom
                                            fullWidth
                                            size="small"
                                            label="Método"
                                            name="change_method_agency"
                                            value={form.change_method_agency}
                                            onChange={handleChange}
                                            disabled={!canEdit || loading}
                                            inputProps={{ readOnly: !canEdit }}
                                        >
                                            <MenuItem value="">Seleccione método</MenuItem>
                                            {AGENCY_CHANGE_METHOD_OPTIONS.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </SelectCustom>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="caption" color={isSumCorrect ? 'success.main' : 'error.main'} sx={{ display: 'flex', justifyContent: 'center', mt: 1, fontWeight: 'medium' }}>
                                        {isSumCorrect
                                            ? `✓ Los montos suman correctamente $${changeAmountNum.toFixed(2)}`
                                            : `❗ La suma (${partialTotal.toFixed(2)}) no coincide con el vuelto total ($${changeAmountNum.toFixed(2)})`
                                        }
                                    </Typography>
                                </Grid>
                            </Grid>

                            {form.change_method_company && (
                                <StructuredDetailForm
                                    method={form.change_method_company}
                                    details={form.change_payment_details}
                                    onChange={handleDetailChange}
                                    onCopy={handleCopyDetails}
                                    banks={banks}
                                    disabled={!canEdit || loading}
                                />
                            )}
                        </Box>
                    </Collapse>
                </Grid>

                {/* SECCIÓN DE COMPROBANTE DE VUELTO (Solo visible si hay vuelto de empresa/parcial) */}
                {(form.change_covered_by === 'company' || form.change_covered_by === 'partial') && changeAmountNum > 0 && (
                    <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CameraAltIcon fontSize="small" /> Comprobante de Vuelto
                        </Typography>

                        <Paper elevation={0} sx={{
                            p: 3,
                            border: '1px dashed',
                            borderColor: order.change_receipt ? green[300] : 'divider',
                            bgcolor: order.change_receipt ? (isDark ? darken(green[900], 0.7) : green[50]) : 'action.hover',
                            borderRadius: 4,
                            textAlign: 'center'
                        }}>
                            {order.change_receipt ? (
                                <Stack spacing={2} alignItems="center">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: green[700] }}>
                                        <CheckCircleIcon />
                                        <Typography fontWeight="bold">Vuelto Pagado / Comprobante disponible</Typography>
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <ButtonCustom
                                            variant="outlined"
                                            startIcon={<VisibilityIcon />}
                                            onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/orders/${order.id}/change-receipt`, '_blank')}
                                            sx={{ borderColor: green[500], color: green[700] }}
                                        >
                                            Ver Comprobante
                                        </ButtonCustom>
                                        <ButtonCustom
                                            variant="outlined"
                                            startIcon={<DownloadIcon />}
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/orders/${order.id}/change-receipt`;
                                                link.download = `Vuelto_Orden_${order.name}.jpg`;
                                                link.click();
                                            }}
                                            sx={{ borderColor: green[500], color: green[700] }}
                                        >
                                            Bajar
                                        </ButtonCustom>
                                    </Stack>
                                </Stack>
                            ) : (
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Aún no se ha cargado el comprobante de pago del vuelto por administración.
                                    </Typography>
                                </Box>
                            )}

                            {/* El Admin/Gerente puede (re)subir el comprobante */}
                            {['Admin', 'Gerente'].includes(user.role?.description || '') && (
                                <Box sx={{ mt: order.change_receipt ? 2 : 0 }}>
                                    <input
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        id="change-receipt-upload"
                                        type="file"
                                        onChange={handleUploadReceipt}
                                    />
                                    <label htmlFor="change-receipt-upload">
                                        <ButtonCustom
                                            component="span"
                                            variant="contained"
                                            startIcon={<CloudUploadIcon />}
                                            disabled={loading}
                                            sx={{ bgcolor: blue[600], '&:hover': { bgcolor: blue[700] } }}
                                        >
                                            {order.change_receipt ? "Cambiar Comprobante" : "Subir Comprobante de Vuelto"}
                                        </ButtonCustom>
                                    </label>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                )}

                {canEdit && (
                    <Grid size={{ xs: 12 }}>
                        <ButtonCustom
                            fullWidth
                            onClick={handleSave}
                            disabled={isSaveDisabled}
                            sx={{ mt: 1, py: 1.8, borderRadius: 3, fontSize: '1rem', opacity: isSaveDisabled ? 0.6 : 1 }}
                        >
                            {loading ? "Registrando..." :
                                !form.change_covered_by ? "Seleccione un responsable del vuelto" :
                                    !isMethodSelected ? "Falta seleccionar método de pago" :
                                        !isSumCorrect ? "Error: Los montos no coinciden" :
                                            "Guardar Información de Vuelto"}
                        </ButtonCustom>
                    </Grid>
                )}
            </Grid>
        </Paper>
    );
};

const PHONE_PREFIXES = ["0414", "0424", "0412", "0422", "0416", "0426"];

const StructuredDetailForm = ({ method, details, onChange, onCopy, banks, disabled }: any) => {
    const isDark = useTheme().palette.mode === 'dark';

    if (method === 'BOLIVARES_PAGOMOVIL') {
        return (
            <Box sx={{ mt: 2, p: 2.5, bgcolor: isDark ? 'rgba(25, 118, 210, 0.05)' : 'white', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" fontWeight="bold" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIphoneIcon fontSize="small" /> DATOS PARA PAGO MÓVIL
                </Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField fullWidth size="small" label="Cédula" placeholder="12345678"
                            value={details.cedula || ""} onChange={(e) => onChange('cedula', e.target.value.replace(/\D/g, ""))}
                            disabled={disabled} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>
                        <SelectCustom fullWidth size="small" label="Banco" value={details.bank_id || ""}
                            onChange={(e) => onChange('bank_id', e.target.value)} disabled={disabled}>
                            {banks.map((b: any) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                        </SelectCustom>
                    </Grid>
                    <Grid size={{ xs: 5, sm: 4 }}>
                        <SelectCustom fullWidth size="small" label="Prefijo" value={details.phone_prefix || ""}
                            onChange={(e) => onChange('phone_prefix', e.target.value)} disabled={disabled}>
                            {PHONE_PREFIXES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </SelectCustom>
                    </Grid>
                    <Grid size={{ xs: 7, sm: 8 }}>
                        <TextField fullWidth size="small" label="Teléfono" placeholder="1234567"
                            value={details.phone_number || ""} onChange={(e) => onChange('phone_number', e.target.value.replace(/\D/g, "").substring(0, 7))}
                            disabled={disabled} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <ButtonCustom fullWidth variant="outlined" startIcon={<ContentCopyIcon />} onClick={onCopy} disabled={!details.cedula}>
                            Copiar Datos para Admin
                        </ButtonCustom>
                    </Grid>
                </Grid>
            </Box>
        );
    }

    if (method === 'BOLIVARES_TRANSFERENCIA') {
        return (
            <Box sx={{ mt: 2, p: 2.5, bgcolor: isDark ? 'rgba(25, 118, 210, 0.05)' : 'white', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" fontWeight="bold" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountBalanceIcon fontSize="small" /> DATOS PARA TRANSFERENCIA
                </Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField fullWidth size="small" label="Número de Cuenta" placeholder="20 dígitos"
                            value={details.account_number || ""} onChange={(e) => onChange('account_number', e.target.value.replace(/\D/g, ""))}
                            disabled={disabled} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth size="small" label="Cédula" placeholder="12345678"
                            value={details.cedula || ""} onChange={(e) => onChange('cedula', e.target.value.replace(/\D/g, ""))}
                            disabled={disabled} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <SelectCustom fullWidth size="small" label="Banco" value={details.bank_id || ""}
                            onChange={(e) => onChange('bank_id', e.target.value)} disabled={disabled}>
                            {banks.map((b: any) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                        </SelectCustom>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <ButtonCustom fullWidth variant="outlined" startIcon={<ContentCopyIcon />} onClick={onCopy} disabled={!details.account_number}>
                            Copiar Datos para Admin
                        </ButtonCustom>
                    </Grid>
                </Grid>
            </Box>
        );
    }

    if (['ZELLE_DOLARES', 'BINANCE_DOLARES', 'PAYPAL_DOLARES', 'ZINLI_DOLARES'].includes(method)) {
        return (
            <Box sx={{ mt: 2, p: 2.5, bgcolor: isDark ? 'rgba(25, 118, 210, 0.05)' : 'white', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" fontWeight="bold" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MailOutlineIcon fontSize="small" /> DATOS DEL RECEPTOR
                </Typography>
                <Stack direction="row" spacing={1}>
                    <TextField fullWidth size="small" label="Correo Electrónico" placeholder="usuario@ejemplo.com"
                        value={details.email || ""} onChange={(e) => onChange('email', e.target.value)}
                        disabled={disabled} />
                    <IconButton onClick={onCopy} disabled={!details.email} sx={{ bgcolor: blue[50] }}>
                        <ContentCopyIcon color="primary" />
                    </IconButton>
                </Stack>
            </Box>
        );
    }

    return null;
};
