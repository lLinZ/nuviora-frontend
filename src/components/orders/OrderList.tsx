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
    const { orders, searchTerm } = useOrdersStore(); // 👈 traemos las órdenes y la búsqueda del store global
    const filteredOrders = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD local approx (or handle timezone better if needed)

        let list = orders;

        // 🔍 Filtrado por término de búsqueda (si existe)
        if (searchTerm && searchTerm.trim() !== "") {
            const lowerTerm = searchTerm.toLowerCase();
            list = list.filter(o =>
                (o.name && o.name.toLowerCase().includes(lowerTerm)) ||
                (o.id && o.id.toString().includes(lowerTerm)) ||
                (o.scheduled_for && o.scheduled_for.includes(lowerTerm)) ||
                (o.client?.first_name && o.client.first_name.toLowerCase().includes(lowerTerm)) ||
                (o.client?.last_name && o.client.last_name.toLowerCase().includes(lowerTerm)) ||
                (o.client?.phone && o.client.phone.includes(lowerTerm)) ||
                (o.client?.city && o.client.city.toLowerCase().includes(lowerTerm)) ||
                (o.client?.province && o.client.province.toLowerCase().includes(lowerTerm))
            );
        }

        return list.filter((order) => {
            const status = order.status.description;
            const scheduledAt = order.scheduled_for ? new Date(order.scheduled_for).toISOString().slice(0, 10) : null;

            if (title === "Reprogramado para hoy") {
                // Incluimos lo que explicitamente sea "Reprogramado para hoy"
                if (status === "Reprogramado para hoy") return true;

                // O lo que sea "Programado..." pero con fecha de hoy
                if ((status === "Programado para otro dia" || status === "Programado para mas tarde") && scheduledAt === today) {
                    return true;
                }
                return false;
            }

            // Para las otras columnas ("Programado para otro dia", "Programado para mas tarde")
            // NO mostrarlas si ya cayeron en la lógica de hoy
            if (title === "Programado para otro dia" || title === "Programado para mas tarde") {
                if (status === title) {
                    // Si es hoy, NO mostrarlo aqui (porque ya se muestra en Reprogramado para hoy)
                    if (scheduledAt === today) return false;
                    return true;
                }
                return false;
            }

            // Resto de columnas normales
            return status === title;
        }).sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }, [orders, title, searchTerm]);

    const count = filteredOrders.length;

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
                {filteredOrders.map((order: any) => (
                    <OrderItem key={order.id} order={order} />
                ))}
            </Box>
        </Box>
    );
};
