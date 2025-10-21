// src/pages/InventoryPage.tsx
import React, { useEffect, useState } from "react";
import {
    Avatar, Box, Paper, Typography, TextField, IconButton,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Chip, Pagination, Tooltip, Divider
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { ButtonCustom } from "../../components/custom";
import { useDebounce } from "../../hooks/useDebounce";
import { IResponse } from "../../interfaces/response-type";
import { Layout } from "../../components/ui/Layout";
import { EditStockDialog } from "../../components/inventory/EditStockDialog";
import { MovementsDrawer } from "../../components/inventory/MovementsDrawer";
import { fmtMoney } from "../../lib/money";

export const Inventory: React.FC = () => {
    const [rows, setRows] = useState<any[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [page, setPage] = useState(1);
    const [q, setQ] = useState("");
    const debounced = useDebounce(q, 400);
    const [loading, setLoading] = useState(false);

    const [openEdit, setOpenEdit] = useState(false);
    const [selected, setSelected] = useState<any | null>(null);

    const [openMovs, setOpenMovs] = useState(false);
    const [productForMovs, setProductForMovs] = useState<any | null>(null);

    const fetchData = async (p = 1, search = "") => {
        setLoading(true);
        try {
            const url = `/products?search=${encodeURIComponent(search)}&page=${p}`;
            const { status, response }: IResponse = await request(url, "GET");
            if (status) {
                const data = await response.json();
                setRows(data.data ?? []);
                setMeta(data.meta ?? null);
            } else {
                toast.error("No se pudieron cargar productos");
            }
        } catch {
            toast.error("Error cargando inventario");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setPage(1); fetchData(1, debounced); }, [debounced]);
    useEffect(() => { fetchData(page, debounced); }, [page]);

    const openEditStock = (row: any) => { setSelected(row); setOpenEdit(true); };
    const onStockSaved = (updated: any) => {
        setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
        setOpenEdit(false);
    };

    const openMovements = (row: any) => { setProductForMovs(row); setOpenMovs(true); };

    return (
        <Layout>

            <Box sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <Inventory2RoundedIcon />
                    <Typography variant="h5" fontWeight={700}>Inventario</Typography>
                </Box>

                <Paper sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <TextField
                            size="small"
                            placeholder="Buscar por nombre o SKU…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1 }} /> }}
                        />
                        <ButtonCustom variant="outlined" onClick={() => fetchData(1, q)}>Buscar</ButtonCustom>
                    </Box>
                </Paper>

                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Producto</TableCell>
                                <TableCell>SKU</TableCell>
                                <TableCell align="right">Precio</TableCell>
                                <TableCell align="right">Stock</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((p) => (
                                <TableRow key={p.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                            <Avatar src={p.image || undefined} variant="rounded">
                                                {!p.image && (p.name?.[0] ?? p.title?.[0] ?? "P")}
                                            </Avatar>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }} title={p.name ?? p.title}>
                                                    {p.name ?? p.title ?? 'Producto'}
                                                </Typography>
                                                {p.created_at && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Creado: {new Date(p.created_at).toLocaleDateString()}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{p.sku ?? '—'}</TableCell>
                                    <TableCell align="right">{typeof p.price !== "undefined" ? fmtMoney(Number(p.price) || 0, 'USD') : '—'}</TableCell>
                                    <TableCell align="right">
                                        <Chip
                                            size="small"
                                            label={p.stock}
                                            color={p.stock > 10 ? "success" : p.stock > 0 ? "warning" : "error"}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Historial de movimientos">
                                            <IconButton size="small" onClick={() => openMovements(p)}>
                                                <HistoryRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Editar stock">
                                            <IconButton size="small" onClick={() => openEditStock(p)}>
                                                <EditRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        {loading ? "Cargando…" : "Sin resultados"}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <Pagination
                        page={meta?.current_page ?? 1}
                        count={meta?.last_page ?? 1}
                        onChange={(_, p) => setPage(p)}
                    />
                </Box>

                <EditStockDialog
                    open={openEdit}
                    onClose={() => setOpenEdit(false)}
                    product={selected}
                    onSaved={onStockSaved}
                />

                <MovementsDrawer
                    open={openMovs}
                    onClose={() => setOpenMovs(false)}
                    product={productForMovs}
                />
            </Box>
        </Layout>
    );
};
