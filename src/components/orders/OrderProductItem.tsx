import React from "react";
import { Box, Avatar, Typography } from "@mui/material";
import { TypographyCustom } from "../custom";
import { fmtMoney } from "../../lib/money";

interface OrderProductItemProps {
    product: any;
    currency: string;
}

export const OrderProductItem: React.FC<OrderProductItemProps> = ({ product, currency }) => {
    const subtotal = (Number(product.price) || 0) * (Number(product.quantity) || 0);

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                borderRadius: 2,
                border: "1px solid rgba(0,0,0,0.08)",
                bgcolor: "background.paper",
            }}
        >
            <Avatar
                src={product.image || undefined}
                alt={product.title}
                variant="rounded"
                sx={{ width: 56, height: 56 }}
            >
                {!product.image && (product.title?.charAt(0) ?? "P")}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                <TypographyCustom
                    variant="subtitle1"
                    sx={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                    title={product.title}
                >
                    {product.title}
                </TypographyCustom>

                <Typography variant="caption" color="text.secondary">
                    {product.sku ? `SKU: ${product.sku}` : "SKU no disponible"}
                </Typography>

                <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Cantidad: <strong>{product.quantity}</strong> × Precio:{" "}
                    <strong>{fmtMoney(Number(product.price), currency)}</strong>
                </Typography>
            </Box>

            <TypographyCustom variant="body2" fontWeight="bold">
                {fmtMoney(subtotal, currency)}
            </TypographyCustom>
        </Box>
    );
};
