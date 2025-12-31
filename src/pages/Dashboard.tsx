import { Toolbar, Box } from "@mui/material";
import Masonry from "@mui/lab/Masonry";
import { useEffect, useState } from "react";
import { Layout } from "../components/ui/Layout";
import { useUserStore } from "../store/user/UserStore";
import { TypographyCustom } from "../components/custom";
import { Loading } from "../components/ui/content/Loading";
import { Widget } from "../components/widgets/Widget";
import { useValidateSession } from "../hooks/useValidateSession";
import { request } from "../common/request";
import { IResponse } from "../interfaces/response-type";

interface DashboardStats {
    // Admin/Gerente
    total_sales?: number;
    orders?: {
        created?: number;
        completed?: number; // Or delivered for deliverer
        delivered?: number;
        cancelled?: number;
        assigned?: number;  // For vendor/deliverer
    };
    // Vendor/Deliverer
    earnings_usd?: number;
    earnings_local?: number;
    rule?: string;
    message?: string;
}

interface DashboardData {
    role: string;
    today: string;
    rate: number;
    stats: DashboardStats;
}

export const Dashboard = () => {
    const user = useUserStore((state) => state.user);
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user.token) return;
            setLoading(true);
            try {
                const { status, response }: IResponse = await request('/dashboard', 'GET');
                if (status) {
                    const json = await response.json();
                    if (json.status) {
                        setData(json.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        if (isValid && !loadingSession) {
            fetchData();
        }
    }, [user.token, isValid, loadingSession]);

    if (loadingSession || !isValid || !user.token) {
        return <Loading />;
    }

    if (loading || !data) {
        return <Loading />;
    }

    const { role, today, stats } = data;

    const renderWidgetsByRole = () => {
        switch (role) {
            case "Admin":
            case "Gerente":
            case "Master":
                return (
                    <Masonry columns={{ xs: 1, sm: 3, md: 4 }} spacing={2}>
                        <Widget title="Resumen global de hoy">
                            <TypographyCustom variant="body1">
                                Ventas totales del día
                            </TypographyCustom>
                            <TypographyCustom variant="h5" fontWeight="bold">
                                ${Number(stats.total_sales || 0).toFixed(2)}
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary">
                                Fecha: {today}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Órdenes del día">
                            <TypographyCustom variant="body2">
                                Creadas: {stats.orders?.created ?? 0}
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Completadas: {stats.orders?.completed ?? 0}
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Entregadas: {stats.orders?.delivered ?? 0}
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Canceladas: {stats.orders?.cancelled ?? 0}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Top vendedoras">
                            <TypographyCustom variant="body2" color="text.secondary">
                                (Próximamente)
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Top repartidores">
                            <TypographyCustom variant="body2" color="text.secondary">
                                (Próximamente)
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );

            case "Vendedor":
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Tus ganancias de hoy">
                            <TypographyCustom variant="body1">
                                Ganancia por ventas
                            </TypographyCustom>
                            <TypographyCustom variant="h5" fontWeight="bold">
                                ${Number(stats.earnings_usd || 0).toFixed(2)} USD
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary">
                                {Number(stats.earnings_local || 0).toFixed(2)} Bs
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                                Regla: {stats.rule}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Tus Órdenes">
                            <TypographyCustom variant="body2">
                                Asignadas hoy: {stats.orders?.assigned ?? 0}
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Completadas hoy: {stats.orders?.completed ?? 0}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );

            case "Repartidor":
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Tus ganancias de hoy">
                            <TypographyCustom variant="body1">
                                Ganancia por entregas
                            </TypographyCustom>
                            <TypographyCustom variant="h5" fontWeight="bold">
                                ${Number(stats.earnings_usd || 0).toFixed(2)} USD
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary">
                                {Number(stats.earnings_local || 0).toFixed(2)} Bs
                            </TypographyCustom>
                            <TypographyCustom variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '0.8rem' }}>
                                Regla: {stats.rule}
                            </TypographyCustom>
                        </Widget>

                        <Widget title="Tus Entregas">
                            <TypographyCustom variant="body2">
                                Asignadas hoy: {stats.orders?.assigned ?? 0}
                            </TypographyCustom>
                            <TypographyCustom variant="body2">
                                Entregadas hoy: {stats.orders?.delivered ?? 0}
                            </TypographyCustom>
                        </Widget>
                    </Masonry>
                );

            default:
                return (
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={2}>
                        <Widget title="Resumen">
                            <TypographyCustom variant="body2" color="text.secondary">
                                {stats.message || "Bienvenido al sistema."}
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
                    Hoy es {today}. Aquí tienes un resumen de tu día como {role || user.role?.description || "usuario"}.
                </TypographyCustom>
            </Box>

            {renderWidgetsByRole()}
        </Layout>
    );
};
