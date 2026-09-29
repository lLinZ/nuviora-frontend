import React, { useState } from "react";
import { Box, Avatar, Typography, IconButton, Paper, Tooltip, Chip, Menu, MenuItem, ListItemText } from "@mui/material";
import { TypographyCustom } from "../custom";
import { fmtMoney } from "../../lib/money";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import EditRoundedIcon from '@mui/icons-material/EditRounded';

interface OrderProductItemProps {
    product: any;
    currency: string;
    onDelete?: () => void;
    onEditQuantity?: (qty: number) => void;
    /** Tarea 4: cambiar la talla o variante de la línea */
    onChangeVariant?: (variantId: number) => void;
}

export const OrderProductItem: React.FC<OrderProductItemProps> = ({ product, currency, onDelete, onEditQuantity, onChangeVariant }) => {
    const subtotal = (Number(product.price) || 0) * (Number(product.quantity) || 0);
    const variants: Array<{ id: number; title: string; is_active: boolean; available: number }> = product.variants ?? [];
    const [variantMenu, setVariantMenu] = useState<HTMLElement | null>(null);
    const canChangeVariant = !!onChangeVariant && variants.length > 0;

    return (
        <Paper
            elevation={0}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'white',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    borderColor: 'primary.main',
                }
            }}
        >
            <Avatar
                src={product.image || undefined}
                alt={product.showable_name || product.title}
                variant="rounded"
                sx={{
                    width: 50,
                    height: 50,
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    bgcolor: 'grey.100',
                    color: 'grey.800'
                }}
            >
                {!product.image && <Inventory2OutlinedIcon fontSize="small" />}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <TypographyCustom
                    variant="body2"
                    fontWeight="bold"
                    sx={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: 'block'
                    }}
                    title={product.showable_name || product.title}
                >
                    {product.showable_name || product.title}
                </TypographyCustom>

                {product.description && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: '0.7rem',
                            mt: -0.2,
                            opacity: 0.7
                        }}
                    >
                        {product.description}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    {/* Tarea 4: la talla o variante de la línea; se puede cambiar por otra con stock */}
                    {(product.variant_title || variants.length > 0) && (
                        <Tooltip title={canChangeVariant ? "Cambiar la talla o variante" : ""}>
                            <Chip
                                size="small"
                                label={product.variant_title ? `Talla: ${product.variant_title}` : 'Sin talla'}
                                color={product.variant_title ? 'default' : 'warning'}
                                variant={product.variant_title ? 'outlined' : 'filled'}
                                onClick={canChangeVariant ? (e) => setVariantMenu(e.currentTarget) : undefined}
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 'bold' }}
                            />
                        </Tooltip>
                    )}
                    <Tooltip title={onEditQuantity ? "Click para editar cantidad" : ""}>
                        <Box
                            onClick={() => onEditQuantity && onEditQuantity(Number(product.quantity))}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 0.5,
                                bgcolor: product.has_stock === false ? 'error.main' : 'action.hover',
                                color: product.has_stock === false ? 'white' : 'text.primary',
                                px: 0.8, py: 0.2, borderRadius: 1, fontWeight: 'bold',
                                cursor: onEditQuantity ? 'pointer' : 'default',
                                '&:hover': onEditQuantity ? { bgcolor: 'action.selected' } : {}
                            }}
                        >
                            <Typography variant="caption" fontWeight="bold" color="inherit">
                                Cant: {product.quantity}
                            </Typography>
                            {onEditQuantity && <EditRoundedIcon sx={{ fontSize: 12, opacity: 0.7 }} />}
                        </Box>
                    </Tooltip>
                    {product.stock_available !== undefined && (
                        <Typography variant="caption" sx={{ color: product.has_stock === false ? 'error.main' : 'text.secondary', fontWeight: 'bold' }}>
                            (Disp: {product.stock_available})
                        </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                        × {fmtMoney(Number(product.price), currency)}
                    </Typography>
                </Box>

                {product.upsell_user_name && (
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', display: 'block', mt: 0.5 }}>
                        ✨ Upsell por: {product.upsell_user_name}
                    </Typography>
                )}
            </Box>

            <Menu anchorEl={variantMenu} open={!!variantMenu} onClose={() => setVariantMenu(null)}>
                {variants.map(v => (
                    <MenuItem
                        key={v.id}
                        selected={v.id === product.variant_id}
                        disabled={!v.is_active && v.id !== product.variant_id}
                        onClick={() => { setVariantMenu(null); if (v.id !== product.variant_id) onChangeVariant?.(v.id); }}
                    >
                        <ListItemText
                            primary={v.title}
                            secondary={v.available > 0 ? `Hay ${v.available}` : 'Sin stock en su almacén'}
                            secondaryTypographyProps={{ color: v.available >= Number(product.quantity) ? 'success.main' : 'error.main' }}
                        />
                    </MenuItem>
                ))}
            </Menu>

            <Box sx={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight="black" color="text.primary">
                    {fmtMoney(subtotal, currency)}
                </Typography>
                {onDelete && (
                    <Tooltip title="Eliminar Producto">
                        <IconButton size="small" color="error" onClick={onDelete} sx={{ '&:hover': { bgcolor: 'error.lighter' } }}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        </Paper>
    );
};
