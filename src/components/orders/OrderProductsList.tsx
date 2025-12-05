import React from "react";
import { Box } from "@mui/material";
import { TypographyCustom } from "../custom";
import { OrderProductItem } from "./OrderProductItem";

interface OrderProductsListProps {
    products: any[];
    currency: string;
}

export const OrderProductsList: React.FC<OrderProductsListProps> = ({ products, currency }) => {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {products?.length > 0 ? (
                products.map((p: any) => (
                    <OrderProductItem key={p.id} product={p} currency={currency} />
                ))
            ) : (
                <TypographyCustom variant="body2" color="text.secondary">
                    No hay productos en esta orden.
                </TypographyCustom>
            )}
        </Box>
    );
};
