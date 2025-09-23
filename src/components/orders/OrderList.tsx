import { Badge, Box, Typography } from "@mui/material";
import { darken } from "@mui/material/styles";
import React, { FC, useMemo } from "react";
import { OrderItem, statusColors } from "./OrderItem";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { useUserStore } from "../../store/user/UserStore";
import { grey } from "@mui/material/colors";

interface OrderListProps {
    title: string;
}

export const OrderList: FC<OrderListProps> = ({ title }) => {
    const user = useUserStore((state) => state.user);
    const { orders } = useOrdersStore(); // 👈 traemos las órdenes del store global
    const count = useMemo(
        () => orders.filter((order) => order.status.description === title).length,
        [orders, title]
    );
    return (
        <Box
            sx={{
                zIndex: 999,
                background: (theme) =>
                    theme.palette.mode === "dark"
                        ? darken(user.color, 0.8)
                        : "white",
                p: 2,
                boxShadow: "0 8px 20px rgba(150,150,150,0.1)",
                overflowX: "hidden",
                minHeight: "600px",
                maxHeight: "600px",
                gap: 2,
                borderRadius: 5,
                height: "fit-content",
                overflowY: "scroll",
                "&::-webkit-scrollbar": {
                    width: "5px",
                },
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
                <Typography variant="h6" sx={{ mr: 1 }}>
                    {title}
                </Typography>
                <Badge
                    badgeContent={count}
                    sx={{
                        "& .MuiBadge-badge": {
                            backgroundColor: statusColors[title] || grey[400],
                            color: "#fff",
                            fontSize: 12,
                            height: 20,
                            minWidth: 20,
                        },

                    }}
                />
            </Box>
            <Box
                sx={{
                    p: 2,
                    gap: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: "300px",
                }}
            >
                {orders
                    .filter((order: any) => order.status.description === title)
                    .map((order: any) => (
                        <OrderItem key={order.id} order={order} />
                    ))}
            </Box>
        </Box>
    );
};
