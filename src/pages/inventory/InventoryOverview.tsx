import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Grid,
    TextField,
    InputAdornment,
    IconButton,
    Typography,
    Pagination,
    Paper,
    Button
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    FilterList as FilterIcon,
    SwapHoriz as SwapHorizIcon,
    EditNote as EditNoteIcon,
    History as HistoryIcon
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { InventoryCard } from '../../components/inventory/InventoryCard';
import { StockMovementDialog } from '../../components/inventory/StockMovementDialog';
import { Loading } from '../../components/ui/content/Loading';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IProductStock, IProduct } from '../../interfaces/inventory.types';
import { WarehouseSelector } from '../../components/inventory/WarehouseSelector';
import { useValidateSession } from '../../hooks/useValidateSession';
import { ButtonCustom, TextFieldCustom } from '../../components/custom';

export const InventoryOverview: React.FC = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<IProductStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState<number | null>(null);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<IProduct | undefined>(undefined);
    const [dialogType, setDialogType] = useState<'in' | 'out' | 'transfer' | 'adjustment'>('in');
    const { loadingSession, isValid, user } = useValidateSession();

    useEffect(() => {
        loadInventory();
    }, [warehouseFilter]);

    const loadInventory = async () => {
        setLoading(true);
        try {
            // We need an endpoint that returns products with their stock across warehouses
            // If backend doesn't have a specific endpoint for this aggregated view, 
            // we might need to fetch products and then their stock, or use a new endpoint.
            // Based on analysis, InventoryService has getProductStock(productId, warehouseId).
            // Let's assume there is an endpoint /inventory/overview or we use /stock/products which was used in old Inventory.tsx
            // The old Inventory.tsx used /stock/products. Let's see if we can reuse or if we need to adjust.
            // Ideally we want: GET /inventory/products-stock?warehouse_id=...

            let url = '/inventory/products-stock'; // Hypothetical new endpoint or we reuse existing
            if (warehouseFilter) url += `?warehouse_id=${warehouseFilter}`;

            // Fallback to existing endpoint if the above doesn't exist, 
            // but for this "Agentic" task I should probably assume I can use what's available 
            // or mock the structure if I can't change backend.
            // The user approved the plan which implied backend changes might be needed or existed.
            // Let's try to use the existing /stock/products but mapped to new structure if possible,
            // OR better, let's assume I need to fetch products and their inventories.
            // Actually, let's use the /inventory endpoint from InventoryController::index which returns Inventory::with('product').
            // But that returns a flat list of inventory items (warehouse_id, product_id, qty).
            // We want to group by product.

            const { status, response }: IResponse = await request('/inventory?overview=true', 'GET');
            if (status) {
                const data = await response.json();
                // data.data is Inventory[]
                // We need to group by product_id to create IProductStock[]
                const grouped = groupInventoryByProduct(data.data);
                setProducts(grouped);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const groupInventoryByProduct = (inventoryList: any[]): IProductStock[] => {
        const map = new Map<number, IProductStock>();

        inventoryList.forEach(item => {
            if (!item.product) return;

            if (!map.has(item.product_id)) {
                map.set(item.product_id, {
                    product_id: item.product_id,
                    product: item.product,
                    warehouses: [],
                    total_quantity: 0
                });
            }

            const current = map.get(item.product_id)!;
            // Filter by warehouse if selected
            if (warehouseFilter && item.warehouse_id !== warehouseFilter) return;

            current.warehouses.push({
                warehouse_id: item.warehouse_id,
                warehouse_name: item.warehouse?.name || `Almacén ${item.warehouse_id}`, // Backend might need to include warehouse relation
                warehouse_code: item.warehouse?.code || '',
                quantity: item.quantity
            });
            current.total_quantity += item.quantity;
        });

        return Array.from(map.values());
    };

    const handleAction = (product: IProductStock, type: 'in' | 'out' | 'transfer' | 'adjustment') => {
        setSelectedProduct(product.product);
        setDialogType(type);
        setDialogOpen(true);
    };

    const filteredProducts = products.filter(p =>
        p.product?.title.toLowerCase().includes(search.toLowerCase()) ||
        p.product?.sku?.toLowerCase().includes(search.toLowerCase())
    );

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista
                title="Inventario General"
                description="Vista global de stock por producto y almacén"
            />

            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexFlow: { xs: 'row wrap', md: 'row nowrap' } }}>
                        <ButtonCustom variant="outlined" startIcon={<SwapHorizIcon />} onClick={() => navigate('/inventory/transfer')}>
                            Transferir Stock
                        </ButtonCustom>
                        <ButtonCustom variant="outlined" startIcon={<EditNoteIcon />} onClick={() => navigate('/inventory/adjust')}>
                            Ajuste Manual
                        </ButtonCustom>
                        <ButtonCustom variant="outlined" startIcon={<HistoryIcon />} onClick={() => navigate('/inventory/movements')}>
                            Ver Movimientos
                        </ButtonCustom>
                    </Box>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextFieldCustom
                                fullWidth
                                size="small"
                                placeholder="Buscar por nombre o SKU..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                                }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <WarehouseSelector
                                value={warehouseFilter}
                                onChange={setWarehouseFilter}
                                showAll
                                label="Filtrar por Almacén"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <IconButton onClick={loadInventory}>
                                <RefreshIcon />
                            </IconButton>
                            <IconButton>
                                <FilterIcon />
                            </IconButton>
                        </Grid>
                    </Grid>
                </Paper>

                {loading ? (
                    <Loading />
                ) : (
                    <Grid container spacing={2}>
                        {filteredProducts.map((p) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={p.product_id}>
                                <InventoryCard
                                    productStock={p}
                                    onTransfer={(prod) => handleAction(prod, 'transfer')}
                                    onAdjust={(prod) => handleAction(prod, 'adjustment')}
                                    onViewHistory={(prod) => prod.product && navigate(`/inventory/movements?product_id=${prod.product.id}`)}
                                />
                            </Grid>
                        ))}
                        {filteredProducts.length === 0 && (
                            <Grid size={{ xs: 12 }}>
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography color="text.secondary">No se encontraron productos</Typography>
                                </Box>
                            </Grid>
                        )}
                    </Grid>
                )}
            </Box>

            <StockMovementDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSuccess={loadInventory}
                product={selectedProduct}
                initialType={dialogType}
            />
        </Layout>
    );
};
