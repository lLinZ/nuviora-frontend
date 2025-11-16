import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Paper, Typography, Divider, IconButton, TextField,
    Table, TableHead, TableRow, TableCell, TableBody, Dialog,
    DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { request } from "../../common/request";
import { TypographyCustom, ButtonCustom } from "../../components/custom";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { IResponse } from "../../interfaces/response-type";

interface ProductRow {
    id: number;
    title: string;
    sku?: string;
    price?: number;
    warehouse_stock: number;
}

interface Movement {
    id: number;
    product_id: number;
    type: "IN" | "OUT" | "ASSIGN" | "RETURN" | "SALE";
    quantity: number;
    deliverer_id?: number | null;
    order_id?: number | null;
    created_by?: number | null;
    created_at: string;
    note?: string | null;
}

export const InventoryPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ProductRow[]>([]);
    const [q, setQ] = useState("");
    const [selected, setSelected] = useState<ProductRow | null>(null);
    const [delta, setDelta] = useState<number>(1);
    const [type, setType] = useState<"IN" | "OUT">("IN");
    const [note, setNote] = useState<string>("");
    const [openMovs, setOpenMovs] = useState(false);
    const [movs, setMovs] = useState<Movement[]>([]);
    const [from, setFrom] = useState<string>(dayjs().startOf("month").format("YYYY-MM-DD"));
    const [to, setTo] = useState<string>(dayjs().format("YYYY-MM-DD"));
    const { loadingSession, isValid, user } = useValidateSession();


    const load = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/stock/products", "GET");
            if (status) {
                const data = await response.json();
                setRows(data.data ?? []);
            } else {
                toast.error("No se pudo cargar el inventario ❌");
            }
        } catch {
            toast.error("Error cargando inventario 🚨");
        } finally {
            setLoading(false);
        }
    };

    const openDialog = (row: ProductRow, t: "IN" | "OUT") => {
        setSelected(row);
        setDelta(1);
        setType(t);
        setNote("");
    };

    const saveMovement = async () => {
        if (!selected) return;
        if (delta <= 0) { toast.error("La cantidad debe ser mayor a 0"); return; }

        try {
            const body = new URLSearchParams();
            body.append("product_id", String(selected.id));
            body.append("type", type);
            body.append("quantity", String(delta));
            if (note) body.append("note", note);

            const { status }: IResponse = await request("/stock/movements", "POST", body);
            if (status) {
                toast.success("Movimiento registrado ✅");
                setSelected(null);
                load();
            } else {
                toast.error("No se pudo registrar el movimiento ❌");
            }
        } catch {
            toast.error("Error registrando movimiento 🚨");
        }
    };

    const loadMovements = async (p: ProductRow) => {
        setSelected(p);
        setOpenMovs(true);
        try {
            const url = `/stock/movements?product_id=${p.id}&from=${from}&to=${to}`;
            const { status, response }: IResponse = await request(url, "GET");
            if (status) {
                const data = await response.json();
                setMovs(data.data ?? []);
            } else {
                toast.error("No se pudieron cargar los movimientos ❌");
            }
        } catch {
            toast.error("Error cargando movimientos 🚨");
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const x = q.trim().toLowerCase();
        if (!x) return rows;
        return rows.filter(r =>
            r.title.toLowerCase().includes(x) ||
            (r.sku ?? "").toLowerCase().includes(x)
        );
    }, [q, rows]);
    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista title="Inventario" description="Control de stock general" />
            <Box sx={{ p: 2 }}>
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>Productos</Typography>
                        <IconButton onClick={load} disabled={loading}><RefreshRounded /></IconButton>
                        <Box sx={{ flex: 1 }} />
                        <TextField
                            size="small"
                            placeholder="Buscar por nombre o SKU…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Producto</TableCell>
                                <TableCell>SKU</TableCell>
                                <TableCell align="right">Stock almacén</TableCell>
                                <TableCell align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map((r) => (
                                <TableRow key={r.id} hover>
                                    <TableCell>{r.title}</TableCell>
                                    <TableCell>{r.sku ?? "—"}</TableCell>
                                    <TableCell align="right">{r.warehouse_stock}</TableCell>
                                    <TableCell align="center">
                                        <IconButton onClick={() => openDialog(r, "IN")} title="Entrada (IN)"><AddRounded /></IconButton>
                                        <IconButton onClick={() => openDialog(r, "OUT")} title="Salida (OUT)"><RemoveRounded /></IconButton>
                                        <IconButton onClick={() => loadMovements(r)} title="Ver movimientos"><HistoryRounded /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow><TableCell colSpan={4} align="center">Sin resultados</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            </Box>

            {/* Dialog IN/OUT */}
            <Dialog open={!!selected && (type === "IN" || type === "OUT")} onClose={() => setSelected(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Movimiento {type === "IN" ? "Entrada" : "Salida"}</DialogTitle>
                <DialogContent>
                    <TypographyCustom variant="subtitle1" fontWeight="bold">{selected?.title}</TypographyCustom>
                    <Box sx={{ display: "grid", gap: 2, mt: 2 }}>
                        <TextField
                            label="Cantidad"
                            type="number"
                            value={delta}
                            onChange={(e) => setDelta(parseInt(e.target.value || "0", 10))}
                            inputProps={{ min: 1 }}
                            fullWidth
                        />
                        <TextField
                            label="Nota (opcional)"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom variant="outlined" onClick={() => setSelected(null)}>Cancelar</ButtonCustom>
                    <ButtonCustom onClick={saveMovement}>Guardar</ButtonCustom>
                </DialogActions>
            </Dialog>

            {/* Dialog historial */}
            <Dialog open={openMovs} onClose={() => setOpenMovs(false)} maxWidth="md" fullWidth>
                <DialogTitle>Historial de movimientos — {selected?.title}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                        <TextField
                            label="Desde"
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            size="small"
                        />
                        <TextField
                            label="Hasta"
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            size="small"
                        />
                        <ButtonCustom
                            variant="outlined"
                            onClick={() => selected && loadMovements(selected)}
                            startIcon={<RefreshRounded />}
                        >
                            Filtrar
                        </ButtonCustom>
                    </Box>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Fecha</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell align="right">Cantidad</TableCell>
                                <TableCell>Repartidor</TableCell>
                                <TableCell>Orden</TableCell>
                                <TableCell>Nota</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {movs.map(m => (
                                <TableRow key={m.id}>
                                    <TableCell>{dayjs(m.created_at).format("YYYY-MM-DD HH:mm")}</TableCell>
                                    <TableCell>{m.type}</TableCell>
                                    <TableCell align="right">{m.quantity}</TableCell>
                                    <TableCell>{m.deliverer_id ?? "—"}</TableCell>
                                    <TableCell>{m.order_id ?? "—"}</TableCell>
                                    <TableCell>{m.note ?? "—"}</TableCell>
                                </TableRow>
                            ))}
                            {movs.length === 0 && (
                                <TableRow><TableCell colSpan={6} align="center">Sin movimientos</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom variant="outlined" onClick={() => setOpenMovs(false)}>Cerrar</ButtonCustom>
                </DialogActions>
            </Dialog>
        </Layout>
    );
};
