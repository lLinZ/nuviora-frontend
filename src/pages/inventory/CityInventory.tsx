// src/pages/inventory/CityInventory.tsx
// Inventario por ciudad (Fran, 2026-09-30): la vendedora ve qué hay en cada ciudad, talla por talla, sin el
// nombre de las agencias, para saber qué ofrecer antes de llamar. Solo lectura (GET /inventory/by-city).
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert, Avatar, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { ArrowBackRounded, Inventory2Outlined, RefreshRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { useUserStore } from "../../store/user/UserStore";
import { request } from "../../common/request";

type CityVariant = { id: number; title: string; available: number };
type CityProduct = { product_id: number; title: string; sku: string | null; image: string | null; total: number; unassigned: number; variants: CityVariant[] };
type CityRow = { city_id: number; city: string; has_agency: boolean; products: CityProduct[] };

/** Las vendedoras con vista simple no tienen menú lateral: se les da una barra con "volver". */
const Shell: React.FC<{ lite: boolean; children: React.ReactNode }> = ({ lite, children }) => {
    const navigate = useNavigate();
    if (!lite) return <Layout>{children}</Layout>;
    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 2 }}>
            <Button startIcon={<ArrowBackRounded />} onClick={() => navigate("/ordenes")} sx={{ mb: 1, textTransform: "none" }}>
                Mis órdenes
            </Button>
            {children}
        </Box>
    );
};

export const CityInventory: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const user = useUserStore((s) => s.user);
    const [rows, setRows] = useState<CityRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cityId, setCityId] = useState<number | "">("");
    const [search, setSearch] = useState("");

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const { status, response } = await request("/inventory/by-city", "GET");
            const data = await response.json();
            if (status === 200 && data.status) {
                setRows(data.data ?? []);
                setCityId((prev) => (prev === "" && data.data?.length ? data.data[0].city_id : prev));
            } else {
                setError(data.message ?? "No se pudo cargar el inventario.");
            }
        } catch {
            setError("Error de conexión.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isValid) fetchData();
    }, [isValid]);

    const city = rows.find((r) => r.city_id === cityId);
    const products = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (city?.products ?? []).filter((p) => !q || p.title.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q));
    }, [city, search]);

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Shell lite={!!user.is_lite_view}>
            <Box sx={{ maxWidth: 1100, mx: "auto" }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} mb={2}>
                    <Box>
                        <Typography variant="h5" fontWeight="bold">Inventario por ciudad</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Lo que hay para entregar en cada ciudad, talla por talla. Revísalo antes de ofrecer una talla.
                        </Typography>
                    </Box>
                    <Button startIcon={<RefreshRounded />} onClick={fetchData} disabled={loading} sx={{ textTransform: "none" }}>
                        Actualizar
                    </Button>
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }} elevation={0} variant="outlined">
                    <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                        <TextField select size="small" label="Ciudad" value={cityId} onChange={(e) => setCityId(Number(e.target.value))} sx={{ minWidth: 220 }}>
                            {rows.map((r) => (
                                <MenuItem key={r.city_id} value={r.city_id}>{r.city}</MenuItem>
                            ))}
                        </TextField>
                        <TextField size="small" label="Buscar producto" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
                    </Stack>
                </Paper>

                {loading && rows.length === 0 ? (
                    <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                ) : !city ? (
                    <Typography color="text.secondary" textAlign="center" p={4}>No hay ciudades con agencia.</Typography>
                ) : products.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" p={4}>
                        {search ? "Ningún producto coincide con la búsqueda." : `No hay productos disponibles en ${city.city}.`}
                    </Typography>
                ) : (
                    <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Producto</TableCell>
                                    <TableCell align="right" sx={{ width: 90 }}>Hay</TableCell>
                                    <TableCell>Tallas</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {products.map((p) => (
                                    <TableRow key={p.product_id}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Avatar src={p.image ?? undefined} variant="rounded" sx={{ width: 36, height: 36, bgcolor: "grey.100", color: "grey.700" }}>
                                                    <Inventory2Outlined fontSize="small" />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">{p.title}</Typography>
                                                    {p.sku && <Typography variant="caption" color="text.secondary">{p.sku}</Typography>}
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight="bold" color={p.total > 0 ? "text.primary" : "error.main"}>{p.total}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {p.variants.length === 0 ? (
                                                <Typography variant="caption" color="text.secondary">Sin tallas</Typography>
                                            ) : (
                                                <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
                                                    {p.variants.map((v) => (
                                                        <Chip
                                                            key={v.id}
                                                            size="small"
                                                            variant="outlined"
                                                            color={v.available > 0 ? "success" : "default"}
                                                            label={v.available > 0 ? `${v.title} · ${v.available}` : `${v.title} · no hay`}
                                                            sx={{ opacity: v.available > 0 ? 1 : 0.6 }}
                                                        />
                                                    ))}
                                                    {p.unassigned > 0 && (
                                                        <Tooltip title="Se cargaron sin decir la talla: no se pueden vender por talla hasta que se repartan.">
                                                            <Typography variant="caption" color="warning.main">+{p.unassigned} sin talla</Typography>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Shell>
    );
};
