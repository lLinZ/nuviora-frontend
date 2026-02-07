import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Divider,
    IconButton,
    Tooltip,
    LinearProgress
} from '@mui/material';
import {
    History as HistoryIcon,
    SwapHoriz as TransferIcon,
    Edit as EditIcon,
    Tune as AdjustIcon
} from '@mui/icons-material';
import { IProductStock } from '../../interfaces/inventory.types';
import { TypographyCustom } from '../custom';

interface InventoryCardProps {
    productStock: IProductStock;
    onTransfer?: (product: IProductStock) => void;
    onAdjust?: (product: IProductStock) => void;
    onEdit?: (product: IProductStock) => void;
    onViewHistory: (product: IProductStock) => void;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
    productStock,
    onTransfer,
    onAdjust,
    onEdit,
    onViewHistory
}) => {
    const { product, warehouses, total_quantity } = productStock;

    // Calculate stock status color
    const getStockColor = (qty: number) => {
        if (qty <= 0) return 'error.main';
        if (qty < 10) return 'warning.main'; // Threshold could be configurable
        return 'success.main';
    };
    return (
        <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <TypographyCustom variant="h6" component="div" noWrap title={product?.title}>
                            {product?.title}
                        </TypographyCustom>
                        <TypographyCustom variant="body2" color="text.secondary">
                            SKU: {product?.sku || 'N/A'}
                        </TypographyCustom>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <TypographyCustom variant="h5" color={getStockColor(total_quantity)} fontWeight="bold">
                            {total_quantity}
                        </TypographyCustom>
                        <TypographyCustom variant="caption" color="text.secondary">
                            Total
                        </TypographyCustom>
                    </Box>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <TypographyCustom variant="subtitle2" gutterBottom>
                    Stock por Almacén
                </TypographyCustom>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {warehouses.map((w) => (
                        <Box key={w.warehouse_id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <TypographyCustom variant="body2" sx={{ flex: 1 }} noWrap>
                                {w.warehouse_name}
                            </TypographyCustom>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 60, justifyContent: 'flex-end' }}>
                                <TypographyCustom
                                    variant="body2"
                                    fontWeight="medium"
                                    color={w.quantity > 0 ? 'text.primary' : 'text.disabled'}
                                >
                                    {w.quantity}
                                </TypographyCustom>
                            </Box>
                        </Box>
                    ))}
                    {warehouses.length === 0 && (
                        <TypographyCustom variant="body2" color="text.secondary" fontStyle="italic">
                            Sin stock en almacenes
                        </TypographyCustom>
                    )}
                </Box>
            </CardContent>

            <Divider />

            <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-around' }}>
                {onTransfer && (
                    <Tooltip title="Transferir Stock">
                        <IconButton size="small" color="primary" onClick={() => onTransfer(productStock)}>
                            <TransferIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {onAdjust && (
                    <Tooltip title="Ajustar Stock (Cantidades)">
                        <IconButton size="small" color="warning" onClick={() => onAdjust(productStock)}>
                            <AdjustIcon />
                        </IconButton>
                    </Tooltip>
                )}
                {onEdit && (
                    <Tooltip title="Editar Producto (Costo, SKU...)">
                        <IconButton size="small" color="info" onClick={() => onEdit(productStock)}>
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                )}
                <Tooltip title="Ver Historial">
                    <IconButton size="small" onClick={() => onViewHistory(productStock)}>
                        <HistoryIcon />
                    </IconButton>
                </Tooltip>
            </Box>
        </Card>
    );
};
