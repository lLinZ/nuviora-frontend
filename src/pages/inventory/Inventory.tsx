import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    Tooltip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Divider,
    InputAdornment,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { TypographyCustom } from "../../components/custom";
import { StockAdjustDialog } from "../../components/inventory/StockAdjustDialog";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { IResponse } from "../../interfaces/response-type";
import { fmtMoney } from "../../lib/money";
import { useUserStore } from "../../store/user/UserStore";

type ProductRow = {
    id: number;
    product_id?: number; // si sincronizas con Shopify
    sku?: string | null;
    title: string;
    name?: string;
    price: number;      // precio de venta
    cost?: number | null; // costo del producto (para ganancias futuras)
    image?: string | null;
    stock_total: number; // existencias totales del inventario general
    status?: { description: string };
};

export const InventoryPage: React.FC = () => {
    const user = useUserStore((s) => s.user);
    const { loadingSession, isValid } = useValidateSession();

    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ProductRow[]>([]);
    const [q, setQ] = useState("");
    const [openAdjust, setOpenAdjust] = useState(false);
    const [selected, setSelected] = useState<ProductRow | null>(null);

    const canEdit = useMemo(() => {
        const role = user.role?.description;
        return role === "Admin" || role === "Gerente";
    }, [user.role?.description]);

    const load = async () => {
        setLoading(true);
        try {
            // Ajusta el endpoint a tu backend: /inventory/products o /products
            const { status, response }: IResponse = await request("/inventory/products", "GET");
            if (!status) {
                toast.error("No se pudo cargar el inventario ❌");
                return;
            }
            const data = await response.json();
            // asumo data.data = array de productos
            setRows(data.data ?? []);
            toast.success("Inventario cargado ✅");
        } catch (e) {
            toast.error("Error al cargar inventario 🚨");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return rows;
        return rows.filter((r) =>
            [r.title, r.name, r.sku]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(t))
        );
    }, [rows, q]);

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            {loading && <Loading />}
            <DescripcionDeVista title="Inventario" description="Gestión y existencias de productos" />

            <Paper sx={{ p: 2 }}>
                {/* Barra de acciones */}
                <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Buscar por título, nombre o SKU…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ maxWidth: 420 }}
                    />
                    <Tooltip title="Recargar">
                        <span>
                            <IconButton onClick={load} disabled={loading}>
                                <RefreshRoundedIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>

                {/* Tabla */}
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Producto</TableCell>
                                <TableCell>SKU</TableCell>
                                <TableCell align="right">Precio</TableCell>
                                <TableCell align="right">Costo</TableCell>
                                <TableCell align="center">Stock</TableCell>
                                <TableCell align="center">Estado</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map((p) => (
                                <TableRow key={p.id} hover>
                                    <TableCell sx={{ maxWidth: 360 }}>
                                        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                                            <img
                                                src={p.image || "/placeholder.png"}
                                                style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8 }}
                                                onError={(e: any) => (e.currentTarget.src = "/placeholder.png")}
                                            />
                                            <Box sx={{ display: "grid" }}>
                                                <TypographyCustom variant="subtitle2" sx={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: 300 }}>
                                                    {p.title || p.name || `#${p.id}`}
                                                </TypographyCustom>
                                                {p.name && (
                                                    <TypographyCustom variant="caption" color="text.secondary">
                                                        {p.name}
                                                    </TypographyCustom>
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{p.sku || "—"}</TableCell>
                                    <TableCell align="right">{fmtMoney(p.price ?? 0, "USD")}</TableCell>
                                    <TableCell align="right">{fmtMoney(p.cost ?? 0, "USD")}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={p.stock_total ?? 0}
                                            color={(p.stock_total ?? 0) > 5 ? "success" : (p.stock_total ?? 0) > 0 ? "warning" : "error"}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            size="small"
                                            label={p.status?.description ?? "Activo"}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {canEdit ? (
                                            <Tooltip title="Ajustar stock">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setSelected(p);
                                                        setOpenAdjust(true);
                                                    }}
                                                >
                                                    <EditRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <TypographyCustom variant="caption" color="text.secondary">
                                                Solo lectura
                                            </TypographyCustom>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                                            No hay productos que coincidan con la búsqueda.
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Dialog de ajuste */}
            {selected && (
                <StockAdjustDialog
                    open={openAdjust}
                    onClose={() => setOpenAdjust(false)}
                    product={selected}
                    onSaved={(updated) => {
                        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                    }}
                />
            )}
        </Layout>
    );
};
