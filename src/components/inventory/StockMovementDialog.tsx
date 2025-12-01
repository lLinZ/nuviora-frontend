import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Box,
    Typography,
    MenuItem,
    Grid,
} from '@mui/material';
import { ButtonCustom } from '../custom';
import { WarehouseSelector } from './WarehouseSelector';
import { IProduct } from '../../interfaces/inventory.types';
import { request } from '../../common/request';
import { toast } from 'react-toastify';
import { IResponse } from '../../interfaces/response-type';

interface StockMovementDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product?: IProduct;
    initialType?: 'in' | 'out' | 'transfer' | 'adjustment';
}

export const StockMovementDialog: React.FC<StockMovementDialogProps> = ({
    open,
    onClose,
    onSuccess,
    product,
    initialType = 'in'
}) => {
    const [type, setType] = useState<'in' | 'out' | 'transfer' | 'adjustment'>(initialType);
    const [fromWarehouseId, setFromWarehouseId] = useState<number | null>(null);
    const [toWarehouseId, setToWarehouseId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [availableStock, setAvailableStock] = useState<number | null>(null);

    useEffect(() => {
        if (open) {
            setType(initialType);
            setFromWarehouseId(null);
            setToWarehouseId(null);
            setQuantity(1);
            setNotes('');
            setAvailableStock(null);
        }
    }, [open, initialType]);

    // Check stock when selecting source warehouse
    useEffect(() => {
        if (fromWarehouseId && product && (type === 'out' || type === 'transfer')) {
            checkStock(fromWarehouseId);
        } else {
            setAvailableStock(null);
        }
    }, [fromWarehouseId, product, type]);

    const checkStock = async (warehouseId: number) => {
        try {
            const { status, response }: IResponse = await request(
                `/warehouses/${warehouseId}/inventory?product_id=${product?.id}`,
                'GET'
            );
            if (status === 200) {
                const data = await response.json();
                // Assuming the endpoint returns inventory list or specific item
                const stock = data.data?.find((i: any) => i.product_id === product?.id)?.quantity || 0;
                setAvailableStock(stock);
            }
        } catch (error) {
            console.error("Error checking stock", error);
        }
    };

    const handleSubmit = async () => {
        if (!product) return;
        if (quantity <= 0) {
            toast.error('La cantidad debe ser mayor a 0');
            return;
        }

        setLoading(true);
        try {
            let endpoint = '';
            let body: any = {
                product_id: product.id,
                quantity,
                notes
            };

            switch (type) {
                case 'in':
                    if (!toWarehouseId) { toast.error('Seleccione almacén destino'); setLoading(false); return; }
                    endpoint = '/inventory-movements/in';
                    body.to_warehouse_id = toWarehouseId;
                    break;
                case 'out':
                    if (!fromWarehouseId) { toast.error('Seleccione almacén origen'); setLoading(false); return; }
                    endpoint = '/inventory-movements/out';
                    body.from_warehouse_id = fromWarehouseId;
                    break;
                case 'transfer':
                    if (!fromWarehouseId) { toast.error('Seleccione almacén origen'); setLoading(false); return; }
                    if (!toWarehouseId) { toast.error('Seleccione almacén destino'); setLoading(false); return; }
                    if (fromWarehouseId === toWarehouseId) { toast.error('Los almacenes deben ser diferentes'); setLoading(false); return; }
                    endpoint = '/inventory-movements/transfer';
                    body.from_warehouse_id = fromWarehouseId;
                    body.to_warehouse_id = toWarehouseId;
                    break;
                case 'adjustment':
                    if (!toWarehouseId) { toast.error('Seleccione almacén'); setLoading(false); return; }
                    endpoint = '/inventory-movements/adjust';
                    body.warehouse_id = toWarehouseId;
                    body.new_quantity = quantity; // Assuming adjustment sets the new quantity
                    break;
            }

            const { status, response }: IResponse = await request(endpoint, 'POST', JSON.stringify(body));

            if (status === 200 || status === 201) {
                toast.success('Movimiento realizado con éxito');
                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Error al realizar movimiento');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'in': return 'Entrada de Stock';
            case 'out': return 'Salida de Stock';
            case 'transfer': return 'Transferencia entre Almacenes';
            case 'adjustment': return 'Ajuste de Inventario (Fijar Stock)';
            default: return 'Movimiento de Stock';
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        {product?.title} <Typography component="span" variant="body2" color="text.secondary">({product?.sku})</Typography>
                    </Typography>

                    <TextField
                        select
                        label="Tipo de Movimiento"
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        fullWidth
                        size="small"
                    >
                        <MenuItem value="in">Entrada (Compra/Devolución)</MenuItem>
                        <MenuItem value="out">Salida (Venta/Pérdida)</MenuItem>
                        <MenuItem value="transfer">Transferencia</MenuItem>
                        <MenuItem value="adjustment">Ajuste (Corrección)</MenuItem>
                    </TextField>

                    {(type === 'out' || type === 'transfer') && (
                        <WarehouseSelector
                            label="Desde Almacén (Origen)"
                            value={fromWarehouseId}
                            onChange={setFromWarehouseId}
                        />
                    )}

                    {(type === 'in' || type === 'transfer' || type === 'adjustment') && (
                        <WarehouseSelector
                            label={type === 'transfer' ? "Hacia Almacén (Destino)" : "Almacén"}
                            value={toWarehouseId}
                            onChange={setToWarehouseId}
                        />
                    )}

                    {availableStock !== null && (
                        <Typography variant="body2" color={availableStock > 0 ? "success.main" : "error.main"}>
                            Stock disponible en origen: <strong>{availableStock}</strong>
                        </Typography>
                    )}

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label={type === 'adjustment' ? "Nueva Cantidad Total" : "Cantidad"}
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Notas / Motivo"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions>
                <ButtonCustom onClick={onClose} color="primary" variant="outlined">
                    Cancelar
                </ButtonCustom>
                <ButtonCustom onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Procesando...' : 'Guardar'}
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
