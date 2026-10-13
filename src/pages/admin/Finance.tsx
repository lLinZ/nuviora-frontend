// src/pages/admin/Finance.tsx
// Finanzas (documento de Fran del 2026-10-12, Módulo 4). Solo el Admin (§81): el backend tampoco le entrega nada de esto
// a otro rol. Por ahora, los gastos manuales y recurrentes (§24 a §33); la rentabilidad, las cohortes y el CPA llegan en
// los pasos siguientes de la entrega 1.
import React, { useCallback, useEffect, useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { useValidateSession } from "../../hooks/useValidateSession";
import { ExpensesTab } from "../../components/finance/ExpensesTab";
import { RecurringExpensesTab } from "../../components/finance/RecurringExpensesTab";
import { FinanceOptions, api, errorMessage } from "../../components/finance/finance";

const TABS = [
    { key: "expenses", label: "Gastos" },
    { key: "recurring", label: "Gastos recurrentes" },
];

export const Finance: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab")! : "expenses";
    const [options, setOptions] = useState<FinanceOptions | null>(null);

    useEffect(() => { api<FinanceOptions>("/finance/options").then(setOptions).catch((e) => toast.error(errorMessage(e))); }, []);
    // Una categoría creada desde un formulario aparece enseguida en todos
    const addCategory = useCallback((c: { id: number; name: string; is_active: boolean }) => {
        setOptions((o) => (o ? { ...o, categories: [...o.categories, c].sort((a, b) => a.name.localeCompare(b.name, "es")) } : o));
    }, []);

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1200, mx: "auto" }}>
                <DescripcionDeVista title="Finanzas" description="Los gastos de la empresa, en dólares. Nada se borra: un gasto se corrige con su motivo o se anula, y todo queda en el historial. Solo administración." />
                <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", my: 2 }}>
                    <Tabs value={tab} onChange={(_, v) => setParams({ tab: v })} variant="scrollable" allowScrollButtonsMobile>
                        {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
                    </Tabs>
                </Paper>
                {!options ? <Typography color="text.secondary" sx={{ p: 2 }}>Cargando…</Typography> : (
                    <>
                        {tab === "expenses" && <ExpensesTab options={options} onCategory={addCategory} />}
                        {tab === "recurring" && <RecurringExpensesTab options={options} onCategory={addCategory} />}
                    </>
                )}
            </Box>
        </Layout>
    );
};
