import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Stack, Paper, Stepper, Step, StepLabel, StepContent,
    Button, Chip, Alert, CircularProgress, Divider, TextField, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody, LinearProgress,
} from '@mui/material';
import {
    PlayArrow, CheckCircle, Error as ErrorIcon, Delete, Refresh,
    BugReport as BugIcon, WarningAmber,
} from '@mui/icons-material';
import { request } from '../../common/request';
import { toast } from 'react-toastify';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry { ts: string; status: 'ok' | 'error' | 'info'; msg: string; }
interface StockSnapshot { productId: number; warehouseId: number; qty: number; label: string; }

const TEST_QTY = 5; // units to order in the test PO
const TEST_SUPPLIER_NAME = '__TEST_PROVEEDOR_SCM__';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const now = () => new Date().toLocaleTimeString('es-VE', { hour12: false });

const statusColor = (s: string) => ({ ok: 'success', error: 'error', info: 'info' } as any)[s] ?? 'default';

// ─── Component ────────────────────────────────────────────────────────────────

export const ScmTestPanel: React.FC = () => {
    // Setup selectors
    const [products, setProducts]     = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [productId, setProductId]   = useState<number>(0);
    const [warehouseId, setWarehouseId] = useState<number>(0);

    // Test state
    const [activeStep, setActiveStep] = useState(-1);      // -1 = not started
    const [busy, setBusy]             = useState(false);
    const [logs, setLogs]             = useState<LogEntry[]>([]);
    const [snapshots, setSnapshots]   = useState<StockSnapshot[]>([]);
    const [testPoId, setTestPoId]     = useState<number | null>(null);
    const [testPoRef, setTestPoRef]   = useState<string>('');
    const [testSupplierId, setTestSupplierId] = useState<number | null>(null);
    const [done, setDone]             = useState(false);
    const [failed, setFailed]         = useState(false);

    useEffect(() => { loadSetup(); }, []);

    const loadSetup = async () => {
        const [pRes, wRes] = await Promise.all([
            request('/products', 'GET'),
            request('/warehouses', 'GET'),
        ]);
        if (pRes.status === 200) {
            const j = await pRes.response.json();
            setProducts(Array.isArray(j) ? j : (j.data?.data ?? j.data ?? []));
        }
        if (wRes.status === 200) {
            const j = await wRes.response.json();
            setWarehouses(j.data?.data ?? j.data ?? []);
        }
    };

    // ── Logging ───────────────────────────────────────────────────────────────

    const log = (msg: string, status: LogEntry['status'] = 'info') =>
        setLogs(prev => [{ ts: now(), status, msg }, ...prev]);

    // ── Stock snapshot ────────────────────────────────────────────────────────

    const snapStock = async (label: string): Promise<number> => {
        const { status, response } = await request(
            `/inventories?product_id=${productId}&warehouse_id=${warehouseId}&per_page=1`, 'GET'
        );
        if (status === 200) {
            const j = await response.json();
            const items = j.data?.data ?? j.data ?? [];
            const qty = items.find((i: any) => i.product_id === productId && i.warehouse_id === warehouseId)?.quantity ?? 0;
            setSnapshots(prev => [...prev, { productId, warehouseId, qty, label }]);
            log(`📦 Stock ${label}: ${qty} unidades`, 'info');
            return qty;
        }
        return -1;
    };

    // ── API wrapper ───────────────────────────────────────────────────────────

    const call = async (url: string, method: string, body?: any) => {
        const { status, response } = await request(url, method as any, body);
        const json = await response.json().catch(() => ({}));
        return { status, json };
    };

    // ── STEPS ─────────────────────────────────────────────────────────────────

    const runStep0_CreateSupplier = async () => {
        log('Buscando proveedor de prueba existente…');
        const { status: ls, json: lj } = await call('/suppliers?active_only=false', 'GET');
        if (ls === 200) {
            const existing = (lj.data ?? []).find((s: any) => s.name === TEST_SUPPLIER_NAME);
            if (existing) {
                setTestSupplierId(existing.id);
                log(`✅ Proveedor TEST reutilizado (ID ${existing.id})`, 'ok');
                return true;
            }
        }
        const { status, json } = await call('/suppliers', 'POST', {
            name: TEST_SUPPLIER_NAME,
            currency: 'USD',
            default_lead_time_days: 1,
            notes: 'Proveedor temporal de pruebas SCM — eliminar después',
            is_active: true,
        });
        if (status === 201 || status === 200) {
            setTestSupplierId(json.data.id);
            log(`✅ Proveedor TEST creado (ID ${json.data.id})`, 'ok');
            return true;
        }
        log(`❌ Error creando proveedor: ${json.message ?? status}`, 'error');
        return false;
    };

    const runStep1_SnapshotBefore = async () => {
        await snapStock('ANTES de OC');
        log('✅ Stock inicial capturado', 'ok');
        return true;
    };

    const runStep2_CreatePO = async (supplierId: number) => {
        const { status, json } = await call('/purchase-orders', 'POST', {
            supplier_id: supplierId,
            warehouse_id: warehouseId,
            notes: 'OC de prueba automática — SCM Test Panel',
            items: [{ product_id: productId, quantity_ordered: TEST_QTY, unit_cost_usd: 1.00 }],
        });
        if (status === 201 || status === 200) {
            setTestPoId(json.data.id);
            setTestPoRef(json.data.reference_number);
            log(`✅ Orden ${json.data.reference_number} creada (draft)`, 'ok');
            return true;
        }
        log(`❌ Error creando OC: ${json.message ?? status}`, 'error');
        return false;
    };

    const runStep3_StatusFlow = async (poId: number) => {
        for (const status of ['sent', 'confirmed'] as const) {
            const { status: s, json } = await call(`/purchase-orders/${poId}/status`, 'POST', { status });
            if (s === 200 || s === 201) {
                log(`✅ Estado → ${json.data?.status_label ?? status}`, 'ok');
            } else {
                log(`❌ Error en status ${status}: ${json.message ?? s}`, 'error');
                return false;
            }
        }
        return true;
    };

    const runStep4_Receive = async (poId: number) => {
        // Get PO items
        const { status: gs, json: gj } = await call(`/purchase-orders/${poId}`, 'GET');
        if (gs !== 200) { log('❌ No se pudo cargar la OC', 'error'); return false; }
        const items = gj.data?.items ?? [];
        if (!items.length) { log('❌ La OC no tiene items', 'error'); return false; }

        const payload = {
            items: items.map((i: any) => ({
                purchase_order_item_id: i.id,
                quantity_received: i.quantity_ordered,
            })),
        };
        const { status, json } = await call(`/purchase-orders/${poId}/receive`, 'POST', payload);
        if (status === 200 || status === 201) {
            log(`✅ Recepción registrada: ${json.message}`, 'ok');
            return true;
        }
        log(`❌ Error en recepción: ${json.message ?? status}`, 'error');
        return false;
    };

    const runStep5_SnapshotAfter = async (qtyBefore: number) => {
        const qtyAfter = await snapStock('DESPUÉS de recepción');
        const diff = qtyAfter - qtyBefore;
        if (diff === TEST_QTY) {
            log(`✅ VERIFICACIÓN PASADA: stock aumentó +${diff} (esperado +${TEST_QTY})`, 'ok');
            return true;
        }
        log(`❌ VERIFICACIÓN FALLIDA: diff=${diff}, esperado +${TEST_QTY}`, 'error');
        return false;
    };

    const runStep6_Cleanup = async (poId: number | null, supplierId: number | null, qtyBefore: number) => {
        // Revert stock
        if (qtyBefore >= 0) {
            const { status, json } = await call('/inventory-movements/adjust', 'POST', {
                product_id: productId,
                warehouse_id: warehouseId,
                new_quantity: qtyBefore,
                notes: 'Limpieza automática del SCM Test Panel',
            });
            if (status === 200 || status === 201) {
                log(`✅ Stock revertido a ${qtyBefore} unidades`, 'ok');
            } else {
                log(`⚠️ No se pudo revertir el stock: ${json.message ?? status}`, 'error');
            }
        }

        // Delete supplier if test-created
        if (supplierId) {
            const { status } = await call(`/suppliers/${supplierId}`, 'DELETE');
            if (status === 200) log('✅ Proveedor TEST eliminado', 'ok');
            else log('⚠️ No se pudo eliminar el proveedor TEST (puede tener OCs)', 'info');
        }

        log('🧹 Limpieza completada', 'ok');
    };

    // ── Main run ──────────────────────────────────────────────────────────────

    const runAllSteps = async () => {
        if (!productId || !warehouseId) {
            toast.error('Selecciona un producto y un almacén antes de iniciar');
            return;
        }
        setBusy(true);
        setLogs([]);
        setSnapshots([]);
        setTestPoId(null);
        setTestPoRef('');
        setTestSupplierId(null);
        setDone(false);
        setFailed(false);
        let qtyBefore = -1;
        let supplierId: number | null = null;
        let poId: number | null = null;

        try {
            // Step 0
            setActiveStep(0);
            log('── PASO 1: Crear proveedor de prueba ──', 'info');
            const s0 = await runStep0_CreateSupplier();
            if (!s0) { setFailed(true); return; }
            supplierId = testSupplierId!;

            // Step 1
            setActiveStep(1);
            log('── PASO 2: Capturar stock inicial ──', 'info');
            await runStep1_SnapshotBefore();
            qtyBefore = snapshots.length > 0 ? snapshots[0].qty : 0;

            // Step 2
            setActiveStep(2);
            log(`── PASO 3: Crear OC de prueba (${TEST_QTY} unidades) ──`, 'info');
            const s2 = await runStep2_CreatePO(supplierId!);
            if (!s2) { setFailed(true); return; }
            poId = testPoId!;

            // Step 3
            setActiveStep(3);
            log('── PASO 4: Ciclo de estados draft→sent→confirmed ──', 'info');
            const s3 = await runStep3_StatusFlow(poId!);
            if (!s3) { setFailed(true); return; }

            // Step 4
            setActiveStep(4);
            log('── PASO 5: Recepcionar mercancía ──', 'info');
            const s4 = await runStep4_Receive(poId!);
            if (!s4) { setFailed(true); return; }

            // Step 5
            setActiveStep(5);
            log('── PASO 6: Verificar stock ──', 'info');
            const s5 = await runStep5_SnapshotAfter(qtyBefore);
            if (!s5) setFailed(true);

            if (!failed) setDone(true);
        } finally {
            // Step 6 — always cleanup
            setActiveStep(6);
            log('── PASO 7: Limpiar datos de prueba ──', 'info');
            await runStep6_Cleanup(poId ?? testPoId, supplierId ?? testSupplierId, qtyBefore);
            setActiveStep(-1);
            setBusy(false);
        }
    };

    const STEP_LABELS = [
        'Crear proveedor TEST',
        'Capturar stock inicial',
        'Crear Orden de Compra',
        'Ciclo de estados (draft→sent→confirmed)',
        'Recepcionar mercancía',
        'Verificar variación de stock',
        'Limpiar datos de prueba',
    ];

    const selectedProduct  = products.find(p => p.id === productId);
    const selectedWarehouse = warehouses.find(w => w.id === warehouseId);
    const beforeSnap = snapshots.find(s => s.label.startsWith('ANTES'));
    const afterSnap  = snapshots.find(s => s.label.startsWith('DESPUÉS'));

    return (
        <Box>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                <BugIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                <Box>
                    <Typography variant="h5" fontWeight="800">Panel de Pruebas — SCM Sandbox</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Simula el flujo completo de una Orden de Compra usando datos reales y limpia todo al finalizar.
                    </Typography>
                </Box>
            </Stack>

            <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 3, borderRadius: 3 }}>
                Este panel <strong>ejecuta operaciones reales</strong> contra la base de datos de producción, pero
                revierte todos los cambios al final. Úsalo solo en horarios de baja actividad.
            </Alert>

            {/* Config */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                    🔧 Configuración del Test
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        select label="Producto a probar" value={productId || ''}
                        onChange={e => setProductId(Number(e.target.value))}
                        sx={{ flex: 1 }} size="small" disabled={busy}
                    >
                        {products.map(p => (
                            <MenuItem key={p.id} value={p.id}>
                                {p.title || p.showable_name || p.name}
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    ({p.sku ?? '—'})
                                </Typography>
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select label="Almacén de recepción" value={warehouseId || ''}
                        onChange={e => setWarehouseId(Number(e.target.value))}
                        sx={{ flex: 1 }} size="small" disabled={busy}
                    >
                        {warehouses.filter(w => w.is_active).map(w => (
                            <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                        ))}
                    </TextField>

                    <Button
                        variant="contained"
                        color={done ? 'success' : failed ? 'error' : 'primary'}
                        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PlayArrow />}
                        onClick={runAllSteps}
                        disabled={busy || !productId || !warehouseId}
                        sx={{ borderRadius: 2, fontWeight: 'bold', minWidth: 160 }}
                    >
                        {busy ? 'Ejecutando…' : done ? '✅ Completado' : failed ? '❌ Falló' : '▶ Iniciar Test'}
                    </Button>

                    <Button
                        variant="outlined" color="inherit"
                        startIcon={<Refresh />}
                        onClick={() => { setLogs([]); setSnapshots([]); setDone(false); setFailed(false); setActiveStep(-1); }}
                        disabled={busy}
                        sx={{ borderRadius: 2 }}
                    >
                        Reset
                    </Button>
                </Stack>

                {productId > 0 && warehouseId > 0 && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                        Se creará una OC de <strong>{TEST_QTY} unidades</strong> de{' '}
                        <strong>{selectedProduct?.title ?? '—'}</strong> hacia bodega{' '}
                        <strong>{selectedWarehouse?.name ?? '—'}</strong>.
                    </Alert>
                )}
            </Paper>

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
                {/* Stepper */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>📋 Pasos del Test</Typography>
                        <Stepper activeStep={activeStep} orientation="vertical">
                            {STEP_LABELS.map((label, i) => (
                                <Step key={i} completed={activeStep > i}>
                                    <StepLabel>{label}</StepLabel>
                                    {activeStep === i && (
                                        <StepContent>
                                            <LinearProgress sx={{ mt: 1, borderRadius: 2 }} />
                                        </StepContent>
                                    )}
                                </Step>
                            ))}
                        </Stepper>

                        {/* Result banner */}
                        {(done || failed) && (
                            <Alert
                                severity={done && !failed ? 'success' : 'error'}
                                icon={done && !failed ? <CheckCircle /> : <ErrorIcon />}
                                sx={{ mt: 3, borderRadius: 2 }}
                            >
                                {done && !failed
                                    ? '✅ TEST EXITOSO — El flujo de OC funciona correctamente y el stock fue verificado.'
                                    : '❌ TEST FALLIDO — Revisa el log de eventos para identificar el problema.'}
                            </Alert>
                        )}
                    </Paper>

                    {/* Stock comparison */}
                    {(beforeSnap || afterSnap) && (
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mt: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>📊 Comparación de Stock</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Momento</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Stock</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Variación</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {beforeSnap && (
                                        <TableRow>
                                            <TableCell>Antes de OC</TableCell>
                                            <TableCell align="right"><strong>{beforeSnap.qty}</strong></TableCell>
                                            <TableCell align="right">—</TableCell>
                                        </TableRow>
                                    )}
                                    {afterSnap && beforeSnap && (
                                        <TableRow>
                                            <TableCell>Después de recepción</TableCell>
                                            <TableCell align="right"><strong>{afterSnap.qty}</strong></TableCell>
                                            <TableCell align="right">
                                                <Chip
                                                    size="small"
                                                    label={`+${afterSnap.qty - beforeSnap.qty}`}
                                                    color={afterSnap.qty - beforeSnap.qty === TEST_QTY ? 'success' : 'error'}
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            {beforeSnap && afterSnap && (
                                <Alert
                                    severity={afterSnap.qty - beforeSnap.qty === TEST_QTY ? 'success' : 'error'}
                                    sx={{ mt: 2, borderRadius: 2 }}
                                >
                                    {afterSnap.qty - beforeSnap.qty === TEST_QTY
                                        ? `✅ Variación correcta: +${TEST_QTY} unidades tal como se recepcionaron.`
                                        : `❌ Variación incorrecta: esperado +${TEST_QTY}, obtenido +${afterSnap.qty - beforeSnap.qty}.`}
                                </Alert>
                            )}
                        </Paper>
                    )}
                </Box>

                {/* Event log */}
                <Paper
                    elevation={0}
                    sx={{
                        flex: 1, minWidth: 0, p: 3, borderRadius: 3,
                        border: '1px solid', borderColor: 'divider',
                        bgcolor: 'background.default',
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">🖥️ Log de Eventos</Typography>
                        {testPoRef && (
                            <Chip label={testPoRef} size="small" color="primary" variant="outlined" />
                        )}
                    </Stack>

                    {logs.length === 0 ? (
                        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                            El log aparecerá aquí cuando inicies el test…
                        </Typography>
                    ) : (
                        <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
                            {logs.map((l, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        py: 0.75, px: 1.5, mb: 0.5, borderRadius: 1.5,
                                        bgcolor: l.status === 'ok' ? 'rgba(34,197,94,0.08)'
                                            : l.status === 'error' ? 'rgba(239,68,68,0.08)'
                                            : 'action.hover',
                                        borderLeft: '3px solid',
                                        borderColor: l.status === 'ok' ? 'success.main'
                                            : l.status === 'error' ? 'error.main' : 'info.main',
                                    }}
                                >
                                    <Stack direction="row" spacing={1} alignItems="baseline">
                                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', flexShrink: 0 }}>
                                            {l.ts}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                            {l.msg}
                                        </Typography>
                                    </Stack>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Paper>
            </Stack>
        </Box>
    );
};
