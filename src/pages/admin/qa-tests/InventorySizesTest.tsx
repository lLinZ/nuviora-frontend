import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Button, Alert, CircularProgress, 
    Divider, TextField, MenuItem, Table, TableHead, TableRow, 
    TableCell, TableBody, Chip, Stepper, Step, StepLabel, StepContent,
    LinearProgress, Paper, Grid
} from '@mui/material';
import {
    PlayArrow, Refresh, CheckCircle, Error as ErrorIcon,
} from '@mui/icons-material';
import { request } from '../../../common/request';
import { IResponse } from '../../../interfaces/response-type';

interface LogEntry { ts: string; status: 'ok' | 'error' | 'info'; msg: string; }

export const InventorySizesTest: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [productId, setProductId] = useState<number>(0);
    const [size, setSize] = useState<string>('');
    const [busy, setBusy] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeStep, setActiveStep] = useState(-1);
    const [done, setDone] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        loadSetup();
    }, []);

    const loadSetup = async () => {
        const { status, response }: IResponse = await request('/inventory', 'GET');
        if (status) {
            const data = await response.json();
            // Permitir ver todos los productos para poder testear incluso si no tienen tallas aún
            const list = data.data ?? [];
            setProducts(list);
        }
    };

    const log = (msg: string, status: LogEntry['status'] = 'info') =>
        setLogs(prev => [{ ts: new Date().toLocaleTimeString(), status, msg }, ...prev]);

    const getStockForSize = async (pId: number, targetSize: string): Promise<number> => {
        const { status, response }: IResponse = await request('/inventory', 'GET');
        if (!status) return 0;
        const data = await response.json();
        const p = (data.data ?? []).find((x: any) => x.product_id === pId);
        return p?.sizes_stock?.[targetSize] ?? 0;
    };

    const runTest = async () => {
        if (!productId || !size) return;
        setBusy(true);
        setLogs([]);
        setDone(false);
        setFailed(false);

        let initialQty = 0;
        const testQty = 2;

        try {
            // STEP 0: Capture Initial
            setActiveStep(0);
            log(`Capturando stock inicial para ${size}...`);
            initialQty = await getStockForSize(productId, size);
            log(`Stock inicial detectado: ${initialQty}`, 'ok');

            // STEP 1: Perform Manual IN
            setActiveStep(1);
            log(`Ejecutando entrada manual (IN) de +${testQty} unidades en talla ${size}...`);
            const body = new URLSearchParams();
            body.append("product_id", String(productId));
            body.append("type", "IN");
            body.append("quantity", String(testQty));
            body.append("note", "[QA TEST] Simulación de entrada por talla");
            body.append(`sizes[${size}]`, String(testQty));

            const { status: s1 }: IResponse = await request("/stock/movements", "POST", body);
            if (!s1) { log('Error en la llamada a /stock/movements', 'error'); setFailed(true); return; }
            log('Movimiento IN registrado correctamente', 'ok');

            // STEP 2: Verify IN
            setActiveStep(2);
            log('Verificando actualización del inventario matricial...');
            const afterInQty = await getStockForSize(productId, size);
            if (afterInQty === initialQty + testQty) {
                log(`Verificación exitosa: ${afterInQty} unidades (esperado ${initialQty + testQty})`, 'ok');
            } else {
                log(`Fallo en verificación: hay ${afterInQty}, se esperaba ${initialQty + testQty}`, 'error');
                setFailed(true);
                return;
            }

            // STEP 3: Revert (Manual OUT)
            setActiveStep(3);
            log(`Revirtiendo cambios: ejecutando salida (OUT) de -${testQty} unidades...`);
            const bodyOut = new URLSearchParams();
            bodyOut.append("product_id", String(productId));
            bodyOut.append("type", "OUT");
            bodyOut.append("quantity", String(testQty));
            bodyOut.append("note", "[QA TEST] Reversión automática de simulación");
            bodyOut.append(`sizes[${size}]`, String(testQty));

            const { status: s2 }: IResponse = await request("/stock/movements", "POST", bodyOut);
            if (!s2) { log('Error revirtiendo el movimiento', 'error'); setFailed(true); return; }
            log('Movimiento OUT (reversión) registrado', 'ok');

            // STEP 4: Final Verification
            setActiveStep(4);
            log('Verificación final de estado limpio...');
            const finalQty = await getStockForSize(productId, size);
            if (finalQty === initialQty) {
                log(`Estado restaurado correctamente: ${finalQty} unidades`, 'ok');
                setDone(true);
            } else {
                log(`ADVERTENCIA: El stock quedó en ${finalQty} en lugar de ${initialQty}. Revisar manualmente.`, 'error');
                setFailed(true);
            }

        } catch (e) {
            log(`Error inesperado: ${e}`, 'error');
            setFailed(true);
        } finally {
            setBusy(false);
            setActiveStep(-1);
        }
    };

    const selectedProduct = products.find(p => p.product_id === productId);

    return (
        <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
                Simulación de Inventario por Talla
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Este test verifica que el flujo de entrada y salida manual actualice correctamente la matriz JSON de tallas y luego revierte los cambios para dejar el inventario limpio.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <TextField
                        select
                        label="Producto con Tallas"
                        value={productId || ''}
                        onChange={e => {
                            setProductId(Number(e.target.value));
                            setSize('');
                        }}
                        sx={{ flex: 1 }}
                        size="small"
                        disabled={busy}
                    >
                        {products.map(p => (
                            <MenuItem key={p.product_id} value={p.product_id}>{p.name}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Talla a Testear"
                        value={size}
                        onChange={e => setSize(e.target.value)}
                        sx={{ flex: 1 }}
                        size="small"
                        disabled={busy || !productId}
                    >
                        {(selectedProduct?.available_sizes ?? []).map((s: string) => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="contained"
                        startIcon={busy ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                        onClick={runTest}
                        disabled={busy || !productId || !size}
                        sx={{ borderRadius: 2, px: 4 }}
                    >
                        Iniciar Test
                    </Button>
                </Stack>
            </Paper>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Pasos del Proceso</Typography>
                    <Stepper activeStep={activeStep} orientation="vertical">
                        <Step><StepLabel>Capturar stock inicial</StepLabel></Step>
                        <Step><StepLabel>Simular Entrada (+2)</StepLabel></Step>
                        <Step><StepLabel>Verificar matriz JSON</StepLabel></Step>
                        <Step><StepLabel>Revertir cambios (Salida -2)</StepLabel></Step>
                        <Step><StepLabel>Verificar limpieza</StepLabel></Step>
                    </Stepper>

                    {done && <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>✅ Simulación completada con éxito</Alert>}
                    {failed && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>❌ La simulación falló. Revisar logs.</Alert>}
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>🖥️ Log de Ejecución</Typography>
                    <Paper variant="outlined" sx={{ p: 2, height: 300, overflowY: 'auto', bgcolor: 'background.default', borderRadius: 2 }}>
                        {logs.length === 0 && <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>Esperando inicio...</Typography>}
                        {logs.map((l, i) => (
                            <Box key={i} sx={{ mb: 0.5, display: 'flex', gap: 1 }}>
                                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>[{l.ts}]</Typography>
                                <Typography variant="body2" color={l.status === 'error' ? 'error.main' : l.status === 'ok' ? 'success.main' : 'text.primary'}>
                                    {l.msg}
                                </Typography>
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};
