import React, { useEffect, useState } from "react";
import {
    Box, Paper, Typography, IconButton, TextField, Table, TableHead, TableRow, TableCell,
    TableBody, Button, Chip, Divider
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import AddCircleOutline from "@mui/icons-material/AddCircleOutline";
import { EditProductDialog } from "../../components/inventory/EditProductDialog";
import { AdjustStockDialog } from "./AdjustStockDialog";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { TypographyCustom } from "../../components/custom";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { IResponse } from "../../interfaces/response-type";
import { fmtMoney } from "../../lib/money";
import { useInventoryStore } from "../../store/inventory/InventoryStore";

type Product = {
    id?: number;
    sku?: string;
    title?: string;
    name?: string;
    price: number;
    cost: number;
    currency: string;
    stock: number;
    image?: string;
};

export const InventoryPage: React.FC = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const { products, setProducts, addOrUpdate } = useInventoryStore();
    const [search, setSearch] = useState("");
    const [openEdit, setOpenEdit] = useState(false);
    const [openAdjust, setOpenAdjust] = useState(false);
    const [current, setCurrent] = useState<Product | null>(null);
    const [movements, setMovements] = useState<any[]>([]);
    const [loadingMov, setLoadingMov] = useState(false);

    const load = async () => {
        try {
            const { status, response }: IResponse = await request(`/inventory/products?search=${encodeURIComponent(search)}`, "GET");
            if (status) {
                const data = await response.json();
                setProducts(data.data ?? []);
            } else {
                toast.error("No se pudo cargar el inventario");
            }
        } catch {
            toast.error("Error cargando inventario");
        }
    };

    const loadMovements = async () => {
        setLoadingMov(true);
        try {
            const { status, response }: IResponse = await request("/inventory/movements", "GET");
            if (status) {
                const data = await response.json();
                setMovements(data.data?.data ?? []);
            }
        } catch { }
        finally { setLoadingMov(false); }
    };

    useEffect(() => { load(); }, []); // init
    useEffect(() => { if (openEdit === false && openAdjust === false) { load(); } }, [openEdit, openAdjust]);

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista title="Inventario" description="Gestión de productos y existencias" />
            <Box sx={{ p: 2, display: "grid", gridTemplateColumns: "1fr 380px", gap: 2 }}>
                {/* Tabla productos */}
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                        <TextField
                            label="Buscar (SKU, nombre)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") load(); }}
                            fullWidth
                        />
                        <IconButton onClick={load}><RefreshRounded /></IconButton>
                        <Button
                            startIcon={<AddRounded />}
                            onClick={() => { setCurrent({ price: 0, cost: 0, currency: "USD", stock: 0 } as Product); setOpenEdit(true); }}
                            variant="contained"
                        >
                            Nuevo
                        </Button>
                    </Box>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>SKU</TableCell>
                                <TableCell>Producto</TableCell>
                                <TableCell align="right">Costo</TableCell>
                                <TableCell align="right">Precio</TableCell>
                                <TableCell align="right">Stock</TableCell>
                                <TableCell align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((p: any) => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.sku ?? "—"}</TableCell>
                                    <TableCell>
                                        <TypographyCustom variant="subtitle2">{p.title ?? p.name ?? "—"}</TypographyCustom>
                                    </TableCell>
                                    <TableCell align="right">{fmtMoney(p.cost, p.currency)}</TableCell>
                                    <TableCell align="right">{fmtMoney(p.price, p.currency)}</TableCell>
                                    <TableCell align="right">
                                        <Chip
                                            size="small"
                                            label={p.stock}
                                            color={p.stock > 10 ? "success" : p.stock > 0 ? "warning" : "error"}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button size="small" onClick={() => { setCurrent(p as Product); setOpenEdit(true); }}>Editar</Button>
                                        <Button
                                            size="small"
                                            startIcon={<AddCircleOutline />}
                                            onClick={() => { setCurrent(p as Product); setOpenAdjust(true); }}
                                        >
                                            Stock
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {products.length === 0 && (
                                <TableRow><TableCell colSpan={6} align="center">Sin productos</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>

                {/* Panel movimientos */}
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Inventory2Rounded />
                        <Typography variant="h6" fontWeight={700}>Últimos movimientos</Typography>
                        <IconButton onClick={loadMovements} disabled={loadingMov}><RefreshRounded /></IconButton>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 520, overflow: 'auto' }}>
                        {movements.map((m) => (
                            <Box key={m.id} sx={{ border: '1px solid #eee', p: 1.5, borderRadius: 1.5 }}>
                                <TypographyCustom variant="subtitle2">
                                    {m.type === 'IN' ? 'Entrada' : 'Salida'} · {m.product?.sku ?? '—'} · {m.product?.title ?? m.product?.name ?? '—'}
                                </TypographyCustom>
                                <TypographyCustom variant="body2" color="text.secondary">
                                    Cantidad: {m.quantity} · {m.reason ?? '—'}
                                </TypographyCustom>
                                <TypographyCustom variant="caption">
                                    Por: {m.user?.names} {m.user?.surnames} · {new Date(m.created_at).toLocaleString()}
                                </TypographyCustom>
                            </Box>
                        ))}
                        {movements.length === 0 && <Typography variant="body2">Sin movimientos</Typography>}
                    </Box>
                </Paper>
            </Box>

            {/* Dialog Crear/Editar Producto */}
            <EditProductDialog
                open={openEdit}
                onClose={() => setOpenEdit(false)}
                product={current}
                onSaved={(p) => addOrUpdate(p)}
            />

            {/* Dialog Ajustar Stock */}
            <AdjustStockDialog
                open={openAdjust}
                onClose={() => setOpenAdjust(false)}
                product={current}
                onAdjusted={(p) => addOrUpdate(p)}
            />
        </Layout>
    );
};