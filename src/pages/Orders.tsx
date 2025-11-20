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
    const { setOrders } = useOrdersStore();
    const validateToken = useUserStore((state) => state.validateToken);
    const [openSearch, setOpenSearch] = useState(false);

    const handlePickProduct = (product: any) => {
        // Aquí decides qué hacer: ver detalle, copiar SKU, crear actualización, etc.
        toast.info(`Seleccionaste: ${product.name ?? product.title}`);
        setOpenSearch(false);
    };
    useEffect(() => {
        const init = async () => {
            try {
                // Validamos sesión
                const result = await validateToken();
                if (!result.status) {
                    toast.error("Sesión expirada, inicia sesión nuevamente.");
                    return (window.location.href = "/");
                }

                // Cargamos órdenes
                const { status, response }: IResponse = await request("/orders", "GET");
                if (status) {
                    const data = await response.json();
                    setOrders(data.data);
                    console.log(data.data)
                    toast.success("Órdenes cargadas correctamente ✅");
                } else {
                    toast.error("Error al cargar las órdenes ❌");
                }
            } catch (e) {
                toast.error("No se pudieron cargar las órdenes 🚨");
            }
        };
        init();
    }, []);

    if (!user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista title={"Kanban"} description={"example"} />
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
                        pb: 2,
                        display: "flex",
                        flexFlow: "row nowrap",
                        overflowX: "scroll",
                        overflowY: "hidden",
                        width: "100%",
                        "&::-webkit-scrollbar": {
                            height: "5px",
                            width: "5px",
                        },
                        "&::-webkit-scrollbar-track": {
                            borderRadius: "5px",
                            backgroundColor: darken(user.color, 0.8),
                        },
                        "&::-webkit-scrollbar-thumb": {
                            borderRadius: "5px",
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
                        <OrderList title="Asignado a vendedora" />
                        <OrderList title="Llamado 1" />
                        <OrderList title="Llamado 2" />
                        <OrderList title="Llamado 3" />
                        <OrderList title="Confirmado" />
                        <OrderList title="Asignado a repartidor" />
                        <OrderList title="En ruta" />
                        <OrderList title="Programado para mas tarde" />
                        <OrderList title="Programado para otro dia" />
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