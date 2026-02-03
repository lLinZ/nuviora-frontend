import React from "react";
import { Box, Avatar, Typography, IconButton, Paper, Tooltip } from "@mui/material";
import { TypographyCustom } from "../custom";
import { fmtMoney } from "../../lib/money";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

interface OrderProductItemProps {
    product: any;
    currency: string;
    onDelete?: () => void;
}

export const OrderProductItem: React.FC<OrderProductItemProps> = ({ product, currency, onDelete }) => {
    const subtotal = (Number(product.price) || 0) * (Number(product.quantity) || 0);

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
                alt={product.title}
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
                    title={product.title}
                >
                    {product.title}
                </TypographyCustom>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" sx={{
                        bgcolor: product.has_stock === false ? 'error.main' : 'action.hover',
                        color: product.has_stock === false ? 'white' : 'text.primary',
                        px: 0.8, py: 0.2, borderRadius: 1, fontWeight: 'bold'
                    }}>
                        Cant: {product.quantity}
                    </Typography>
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
