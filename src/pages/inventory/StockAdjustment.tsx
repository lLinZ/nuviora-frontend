import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Grid, TextField, Autocomplete, Divider, MenuItem, Alert } from '@mui/material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { WarehouseSelector } from '../../components/inventory/WarehouseSelector';
import { ButtonCustom } from '../../components/custom';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IProduct } from '../../interfaces/inventory.types';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Loading } from '../../components/ui/content/Loading';
import { useValidateSession } from '../../hooks/useValidateSession';

export const StockAdjustment: React.FC = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<IProduct[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
    const [warehouseId, setWarehouseId] = useState<number | null>(null);
    const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in');
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentStock, setCurrentStock] = useState<number | null>(null);
    const { loadingSession, isValid, user } = useValidateSession();

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (warehouseId && selectedProduct) {
            checkStock();
        } else {
            setCurrentStock(null);
        }
    }, [warehouseId, selectedProduct]);

    const loadProducts = async () => {
        try {
            const { status, response }: IResponse = await request('/inventory/products', 'GET');
            if (status) {
                const data = await response.json();
                setProducts(data.data || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const checkStock = async () => {
        if (!warehouseId || !selectedProduct) return;
        try {
            const { status, response }: IResponse = await request(
                `/warehouses/${warehouseId}/inventory?product_id=${selectedProduct.id}`,
                'GET'
            );
            if (status) {
                const data = await response.json();
                const stock = data.data?.find((i: any) => i.product_id === selectedProduct.id)?.quantity || 0;
                setCurrentStock(stock);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async () => {
        if (!selectedProduct || !warehouseId) {
            toast.error('Complete todos los campos requeridos');
            return;
        }
        if (quantity <= 0 && type !== 'adjustment') {
            toast.error('La cantidad debe ser mayor a 0');
            return;
        }

        setLoading(true);
        try {
            let endpoint = '';
            let body: any = {
                product_id: selectedProduct.id,
                quantity,
                notes
            };

            if (type === 'in') {
                endpoint = '/inventory-movements/in';
                body.to_warehouse_id = warehouseId;
            } else if (type === 'out') {
                endpoint = '/inventory-movements/out';
                body.from_warehouse_id = warehouseId;
            } else {
                endpoint = '/inventory-movements/adjust';
                body.warehouse_id = warehouseId;
                body.new_quantity = quantity; // For adjustment, quantity input is the NEW total
            }

            const { status, response }: IResponse = await request(endpoint, 'POST', JSON.stringify(body));

            if (status) {
                toast.success('Ajuste realizado con éxito');
                navigate('/inventory/movements');
            } else {
                const data = await response.json();
                toast.error(data.message || 'Error al realizar ajuste');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;
    return (
        <Layout>
            <DescripcionDeVista
                title="Ajuste de Stock"
                description="Entradas, salidas y correcciones manuales"
            />

            <Box sx={{ p: 2, maxWidth: 800, mx: 'auto' }}>
                <Paper sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="h6" gutterBottom>Detalles del Ajuste</Typography>
                            <Divider />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Autocomplete
                                options={products}
                                getOptionLabel={(option) => `${option.title} (${option.sku})`}
                                value={selectedProduct}
                                onChange={(_, newValue) => setSelectedProduct(newValue)}
                                renderInput={(params) => <TextField {...params} label="Producto" placeholder="Buscar producto..." />}
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <WarehouseSelector
                                label="Almacén"
                                value={warehouseId}
                                onChange={setWarehouseId}
                            />
                            {currentStock !== null && (
                                <Alert severity="info" sx={{ mt: 1, py: 0 }}>
                                    Stock actual: <strong>{currentStock}</strong>
                                </Alert>
                            )}
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Tipo de Movimiento"
                                value={type}
                                onChange={(e) => setType(e.target.value as any)}
                            >
                                <MenuItem value="in">Entrada (Compra/Devolución)</MenuItem>
                                <MenuItem value="out">Salida (Venta/Pérdida)</MenuItem>
                                <MenuItem value="adjustment">Ajuste (Corrección Total)</MenuItem>
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                fullWidth
                                label={type === 'adjustment' ? "Nueva Cantidad Total" : "Cantidad"}
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                inputProps={{ min: 0 }}
                                helperText={type === 'adjustment' ? 'El stock se actualizará a este valor exacto' : ''}
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

                        <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <ButtonCustom variant="outlined" onClick={() => navigate(-1)}>
                                Cancelar
                            </ButtonCustom>
                            <ButtonCustom onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Procesando...' : 'Guardar Ajuste'}
                            </ButtonCustom>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        </Layout>
    );
};
