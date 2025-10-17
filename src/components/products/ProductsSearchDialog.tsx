import { FC, useEffect, useMemo, useState } from "react";
import {
    Avatar, Box, Dialog, DialogActions, DialogContent, DialogTitle,
    IconButton, List, ListItem, ListItemAvatar, ListItemText,
    Pagination, TextField, CircularProgress, Chip, Tooltip, ListItemButton
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { useDebounce } from "../../hooks/useDebounce";

interface Props {
    open: boolean;
    onClose: () => void;
    onPick?: (product: any) => void; // callback si seleccionas uno
}

export const ProductSearchDialog: FC<Props> = ({ open, onClose, onPick }) => {
    const [query, setQuery] = useState("");
    const [rows, setRows] = useState<any[]>([]);
    const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    const debounced = useDebounce(query, 400);

    const fetchData = async (p = 1, q = "") => {
        setLoading(true);
        try {
            const url = `/products?search=${encodeURIComponent(q)}&page=${p}`;
            const { status, response }: IResponse = await request(url, "GET");
            if (status) {
                const data = await response.json();
                setRows(data.data ?? []);
                setMeta(data.meta ?? null);
            } else {
                toast.error("No se pudieron cargar los productos ❌");
            }
        } catch {
            toast.error("Error cargando productos 🚨");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            setPage(1);
            fetchData(1, debounced);
        }
    }, [open, debounced]);

    useEffect(() => {
        if (open) fetchData(page, debounced);
    }, [page]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Buscar productos
                <IconButton onClick={onClose}><CloseRoundedIcon /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                    autoFocus
                    placeholder="Buscar por nombre o SKU…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    InputProps={{ startAdornment: <SearchRoundedIcon sx={{ mr: 1 }} /> }}
                />

                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <List dense>
                        {rows.map((p) => (
                            <ListItem key={p.id} disablePadding>
                                <ListItemButton onClick={() => { onPick?.(p); toast.success("Producto seleccionado ✅"); }}>
                                    <ListItemAvatar>
                                        <Avatar src={p.image || undefined} variant="rounded">
                                            {!p.image && (p.name?.[0] ?? p.title?.[0] ?? "P")}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={p.name ?? p.title ?? "Producto"}
                                        secondary={
                                            <>
                                                {p.sku && <Chip size="small" label={`SKU: ${p.sku}`} sx={{ mr: 1 }} />}
                                                {typeof p.price !== "undefined" && <Chip size="small" label={`Precio: ${p.price}`} />}
                                                {typeof p.stock !== "undefined" && <Chip size="small" label={`Stock: ${p.stock}`} sx={{ ml: 1 }} />}
                                            </>
                                        }
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {rows.length === 0 && (
                            <Box sx={{ p: 2, textAlign: "center" }}>
                                {debounced ? "Sin resultados" : "Escribe para buscar…"}
                            </Box>
                        )}
                    </List>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
                <Box />
                <Pagination
                    page={meta?.current_page ?? 1}
                    count={meta?.last_page ?? 1}
                    onChange={(_, p) => setPage(p)}
                />
            </DialogActions>
        </Dialog>
    );
};
