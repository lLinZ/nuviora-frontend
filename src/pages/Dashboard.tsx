import { Toolbar, Box } from "@mui/material";
import Masonry from "@mui/lab/Masonry";
import { Layout } from "../components/ui/Layout";
import { useUserStore } from "../store/user/UserStore";
import { TypographyCustom } from "../components/custom";
import { Loading } from "../components/ui/content/Loading";
import { Widget } from "../components/widgets/Widget";
import { useValidateSession } from "../hooks/useValidateSession"; // 👈 asumiendo esta ruta

export const Dashboard = () => {
    const user = useUserStore((state) => state.user);
    const { loadingSession, isValid } = useValidateSession();

    if (loadingSession || !isValid || !user.token) {
        return <Loading />;
    }

    const role = user.role?.description; // "Admin" | "Gerente" | "Vendedor" | etc

    const today = new Date().toLocaleDateString();

    const renderWidgetsByRole = () => {
        switch (role) {
            case "Admin":
                return (
                    <Masonry columns={{ xs: 1, sm: 3, md: 4 }} spacing={2}>
                        <Widget title="Resumen global de hoy">
                            <TypographyCustom variant="body1">
                                Ganancias totales del día
                            </TypographyCustom>
                            <TypographyCustom variant="h5" fontWeight="bold">
                                $0.00 {/* luego lo llenamos con datos reales */}
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary">
                                Fecha: {today}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Ganancias por rol">
                            <TypographyCustom variant="body2">
                                Vendedores: $0.00
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Repartidores: $0.00
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Gerentes: $0.00
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Órdenes del día">
                            <TypographyCustom variant="body2">
                                Órdenes creadas: 0
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Órdenes completadas: 0
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Órdenes canceladas: 0
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Top vendedoras">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {/* (Aquí mostraremos las vendedoras con más órdenes completadas) */}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Top repartidores">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {/* (Aquí mostraremos los repartidores con más entregas) */}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Filtros avanzados">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {/* Ver ganancias por rango de fechas, por rol y por usuario. */}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );

            case "Gerente":
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Resumen de tu equipo hoy">
                            <TypographyCustom variant="body1">
                                Ganancias de tu equipo (vendedoras + repartidores)
                            </TypographyCustom>
                            <TypographyCustom variant="h5" fontWeight="bold">
                                $0.00
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary">
                                Fecha: {today}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Tus ganancias de hoy">
                            <TypographyCustom variant="body2">
                                Ganancia por ventas exitosas: $0.00
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary">
                                Regla: $0.5 por venta exitosa
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Órdenes por estado">
                            <TypographyCustom variant="body2">
                                Nuevas: 0
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Confirmadas: 0
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Entregadas: 0
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Rendimiento de vendedoras">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {/* (Aquí mostraremos cuántas órdenes tiene cada vendedora) */}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Rendimiento de repartidores">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {/* (Aquí mostraremos cuántas entregas hizo cada repartidor) */}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );

            case "Vendedor":
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Tus ganancias de hoy">
                            <TypographyCustom variant="body1">
                                Ganancia por órdenes completadas
                            </TypographyCustom>
                            <TypographyCustom variant="h5" fontWeight="bold">
                                $0.00
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary">
                                Regla: $1 por orden completada
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Órdenes asignadas hoy">
                            <TypographyCustom variant="body2">
                                Total órdenes asignadas: 0
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Órdenes confirmadas: 0
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Órdenes en seguimiento: 0
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Historial rápido">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {/* (Aquí mostraremos tus últimas órdenes trabajadas) */}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );

            case "Repartidor":
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Tus ganancias de hoy">
                            <TypographyCustom variant="body1">
                                Ganancia por órdenes entregadas
                            </TypographyCustom>
                            <TypographyCustom variant="h5" fontWeight="bold">
                                $0.00
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary">
                                Regla: $2.5 por orden entregada
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Tus entregas">
                            <TypographyCustom variant="body2">
                                Órdenes asignadas: 0
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Órdenes entregadas: 0
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Órdenes devueltas: 0
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Stock personal del día">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {/* (Aquí mostraremos qué productos tienes en tu stock de hoy) */}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );

            default:
                // Por si acaso, algún rol raro o sin rol
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Resumen">
                            <TypographyCustom variant="body2" color="text.secondary">
                                No se ha detectado un rol específico, se muestra un resumen básico.
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );
        }
    };

    return (
        <Layout>
            <Toolbar />
            <Box sx={{ mb: 2 }}>
                <TypographyCustom fontWeight={"bold"} variant="h4">
                    ¡Bienvenido {user.names}!
                </TypographyCustom>
                <TypographyCustom color={"text.secondary"} variant="body1">
                    Hoy es {today}. Aquí tienes un resumen de tu día como {role || "usuario"}.
                </TypographyCustom>
            </Box>

            {renderWidgetsByRole()}
        </Layout>
    );
};
