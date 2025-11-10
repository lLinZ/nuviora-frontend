import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, TextField, Divider } from "@mui/material";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { fmtMoney } from "../../lib/money";
import { IResponse } from "../../interfaces/response-type";

export const MyEarningsPage: React.FC = () => {
    const { user, isValid, loadingSession } = useValidateSession();
    const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [data, setData] = useState<any>(null);
    const [rate, setRate] = useState<number>(1);

    const load = async () => {
        try {
            const { status, response }: IResponse = await request(`/earnings/me?date=${date}`, "GET");
            if (!status) return toast.error("No se pudieron cargar tus ganancias");
            const d = await response.json();
            setData(d.data ?? d);

            // tasa del día (opcional)
            const { status: s, response: r }: IResponse = await request("/rates/today", "GET");
            if (s) {
                const rr = await r.json();
                setRate(Number(rr.data?.rate ?? 1));
            } else {
                setRate(1);
            }
        } catch {
            toast.error("Error cargando información");
        }
    };

    useEffect(() => { load(); /*eslint-disable-next-line*/ }, [date]);

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista title="Mis ganancias" description="Resumen personal del día" />
            <Box sx={{ p: 2, display: "grid", gap: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
                        <TextField type="date" label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Typography>Rol: <b>{user?.role?.description ?? "—"}</b></Typography>
                    <Typography>Órdenes relevantes: <b>{data?.orders_count ?? 0}</b></Typography>
                    <Typography sx={{ mt: 1 }}>
                        Ganancia del día: <b>{fmtMoney(data?.earnings_usd ?? 0, "USD")}</b>
                        {rate && <em>  (≈ {fmtMoney((data?.earnings_usd ?? 0) * rate, "VES")})</em>}
                    </Typography>
                </Paper>
            </Box>
        </Layout>
    );
};
