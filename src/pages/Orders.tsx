import { Box, darken, Fab, lighten } from "@mui/material";
import React, { useEffect, useState } from "react";
import { DescripcionDeVista } from "../components/ui/content/DescripcionDeVista";
import { Loading } from "../components/ui/content/Loading";
import { Layout } from "../components/ui/Layout";
import { useUserStore } from "../store/user/UserStore";
import { request } from "../common/request";
import { IResponse } from "../interfaces/response-type";
import { useOrdersStore } from "../store/orders/OrdersStore";
import { OrderList } from "../components/orders/OrderList";
import { toast } from "react-toastify";
import { ButtonCustom } from "../components/custom";
import { ProductSearchDialog } from "../components/products/ProductsSearchDialog";
import { SearchRounded } from "@mui/icons-material";

export const Orders = () => {
    const user = useUserStore((state) => state.user);
    const { orders, setOrders } = useOrdersStore();
    const validateToken = useUserStore((state) => state.validateToken);
    const [openSearch, setOpenSearch] = useState(false);

    const handlePickProduct = (product: any) => {
        // Aquí decides qué hacer: ver detalle, copiar SKU, crear actualización, etc.
        toast.info(`Seleccionaste: ${product.name ?? product.title}`);
        setOpenSearch(false);
    };

    // Check for reminders every minute
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            orders.forEach(order => {
                if (order.reminder_at) {
                    const reminderTime = new Date(order.reminder_at);
                    const diff = now.getTime() - reminderTime.getTime();
                    // If reminder passed within the last 60 seconds
                    if (diff >= 0 && diff < 60000) {
                        toast.info(`🔔 Recordatorio para Orden #${order.name}`, {
                            // enableHtml: true, // Removed invalid prop
                            autoClose: false, // User must close it
                            onClick: () => {
                                // Optional: open order details
                            }
                        });
                        // Play sound
                        const audio = new Audio('/notification.mp3'); // Assuming file exists, otherwise standard beep or skip
                        audio.play().catch(e => console.log('Audio warn', e));
                    }
                }
            });
        };

        const interval = setInterval(checkReminders, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [orders]);

    const fetchOrders = async (silent = false) => {
        try {
            const { status, response }: IResponse = await request("/orders", "GET");
            if (status) {
                const data = await response.json();
                setOrders(data.data);
                if (!silent) toast.success("Órdenes cargadas correctamente ✅");
            } else if (!silent) {
                toast.error("Error al cargar las órdenes ❌");
            }
        } catch (e) {
            if (!silent) toast.error("No se pudieron cargar las órdenes 🚨");
        }
    };

    useEffect(() => {
        const init = async () => {
            const result = await validateToken();
            if (!result.status) {
                toast.error("Sesión expirada, inicia sesión nuevamente.");
                return (window.location.href = "/");
            }
            fetchOrders();
        };

        init();

        // Polling every 30 seconds
        const pollInterval = setInterval(() => {
            fetchOrders(true);
        }, 30000);

        return () => clearInterval(pollInterval);
    }, []);

    if (!user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista title={"Kanban de ordenes"} description={""} />
            {/* <Box sx={{ position: "fixed", right: 24, top: 24 }}> */}
            {/* <ButtonCustom variant="contained" startIcon={<SearchRounded />} onClick={() => setOpenSearch(true)}> */}
            <Fab sx={{ position: 'fixed', right: 24, bottom: 24 }} onClick={() => setOpenSearch(true)}>
                <SearchRounded />
            </Fab>
            {/* </ButtonCustom> */}
            {/* </Box> */}
            <Box
                sx={{
                    display: "flex",
                    flexFlow: "row nowrap",
                    overflowX: "hidden",
                    overflowY: "hidden",
                    maxWidth: "85%",
                }}
            >
                <Box
                    sx={{
                        cursor: "pointer",
                        pb: 2,
                        display: "flex",
                        flexFlow: "row nowrap",
                        overflowX: "scroll",
                        overflowY: "hidden",
                        width: "100%",
                        "&::-webkit-scrollbar": {
                            height: "15px",
                            width: "15px",
                        },
                        "&::-webkit-scrollbar-track": {
                            borderRadius: "15px",
                            backgroundColor: darken(user.color, 0.8),
                        },
                        "&::-webkit-scrollbar-thumb": {
                            borderRadius: "15px",
                            backgroundColor: lighten(user.color, 0.2),
                        },
                    }}
                >


                    <ProductSearchDialog
                        open={openSearch}
                        onClose={() => setOpenSearch(false)}
                        onPick={handlePickProduct}
                    />
                    <Box sx={{ display: "flex", gap: 2, flexFlow: "row nowrap" }}>
                        <OrderList title="Nuevo" />
                        <OrderList title="Reprogramado para hoy" />
                        <OrderList title="Asignado a vendedor" />
                        <OrderList title="Llamado 1" />
                        <OrderList title="Llamado 2" />
                        <OrderList title="Llamado 3" />
                        <OrderList title="Confirmado" />
                        <OrderList title="Asignado a repartidor" />
                        <OrderList title="En ruta" />
                        <OrderList title="Programado para mas tarde" />
                        <OrderList title="Programado para otro dia" />
                        <OrderList title="Por aprobar cambio de ubicacion" />
                        <OrderList title="Por aprobar rechazo" />
                        <OrderList title="Por aprobar entrega" />
                        <OrderList title="Cambio de ubicacion" />
                        <OrderList title="Rechazado" />
                        <OrderList title="Entregado" />
                        <OrderList title="Cancelado" />
                    </Box>
                </Box>
            </Box>
        </Layout>
    );
};