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
import { EditProductDialog } from '../../components/inventory/EditProductDialog';
import { useValidateSession } from '../../hooks/useValidateSession';
import { ButtonCustom, TextFieldCustom } from '../../components/custom';

interface Props {
    isEmbedded?: boolean;
}

export const InventoryOverview: React.FC<Props> = ({ isEmbedded }) => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<IProductStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState<number | null>(null);

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<IProduct | undefined>(undefined);
    const [dialogType, setDialogType] = useState<'in' | 'out' | 'transfer' | 'adjustment'>('in');
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<IProduct | undefined>(undefined);
    const { loadingSession, isValid, user } = useValidateSession();

    useEffect(() => {
        loadInventory();
    }, [warehouseFilter]);

    const loadInventory = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/inventory?overview=true', 'GET');
            if (status) {
                const data = await response.json();
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
                warehouse_name: item.warehouse?.name || `Almacén ${item.warehouse_id}`,
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

    const handleEdit = (product: IProductStock) => {
        setProductToEdit(product.product);
        setEditDialogOpen(true);
    };

    const filteredProducts = products.filter(p =>
        p.product?.title.toLowerCase().includes(search.toLowerCase()) ||
        p.product?.sku?.toLowerCase().includes(search.toLowerCase())
    );

    if (loadingSession || !isValid || !user.token) return <Loading />;

    const content = (
        <Box sx={{ p: isEmbedded ? 0 : 2 }}>
            <Paper sx={{ p: 2, mb: 3 }}>
                {!isEmbedded && (
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
                )}
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
                                onEdit={(prod) => handleEdit(prod)}
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

            <StockMovementDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSuccess={loadInventory}
                product={selectedProduct}
                initialType={dialogType}
            />

            <EditProductDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                onSuccess={loadInventory}
                product={productToEdit}
            />
        </Box>
    );

    if (isEmbedded) return content;

    return (
        <Layout>
            <DescripcionDeVista
                title="Inventario General"
                description="Vista global de stock por producto y almacén"
            />
            {content}
        </Layout>
    );
};

