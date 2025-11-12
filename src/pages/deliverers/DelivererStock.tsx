import React, { useEffect, useMemo, useState } from "react";
import { Box, Paper, Divider, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, List, ListItem, ListItemText } from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { useValidateSession } from "../../hooks/useValidateSession";
import { IResponse } from "../../interfaces/response-type";
import { useUserStore } from "../../store/user/UserStore";
import { ButtonCustom, TextFieldCustom, TypographyCustom } from "../../components/custom";

type Product = { id: number; title: string; sku?: string; price: number; cost: number; stock?: number };
type StockItem = {
    id: number;
    product_id: number;
    qty_assigned: number;
    qty_delivered: number;
    qty_returned: number;
    product: Product;
    qty_on_hand?: number; // calculado en back como accessor o aquí
};
type DelivererStock = {
    id: number;
    date: string;
    status: "open" | "closed";
    items: StockItem[];
};

export const DelivererStockPage: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const user = useUserStore(s => s.user);

    const [loading, setLoading] = useState(false);
    const [stock, setStock] = useState<DelivererStock | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [openOpenDlg, setOpenOpenDlg] = useState(false);
    const [openAddDlg, setOpenAddDlg] = useState(false);
    const [openCloseDlg, setOpenCloseDlg] = useState(false);

    // formularios simples
    const [selections, setSelections] = useState<{ product_id: number; qty: number }[]>([]);
    const [addItems, setAddItems] = useState<{ product_id: number; qty: number }[]>([]);
    const [returns, setReturns] = useState<{ product_id: number; qty: number }[]>([]);

    const loadAll = async () => {
        setLoading(true);
        try {
            // stock del día
            let { status, response }: IResponse = await request("/deliverer/stock/today", "GET");
            if (status) {
                const data = await response.json();
                setStock(data.data ?? null);
            } else {
                setStock(null);
            }
            // productos disponibles (para seleccionar)
            let { status: status2, response: response2 }: IResponse = await request("/products", "GET"); // asumo tienes este endpoint. Si no, crea uno simple de listado
            if (status2) {
                const data = await response2.json();
                setProducts(data.data ?? data.products ?? []);
            }
        } catch {
            toast.error("Error cargando stock");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAll(); }, []);

    const onOpenShift = async () => {
        if (selections.length === 0) { toast.error("Agrega al menos un producto"); return; }
        const body = new URLSearchParams();
        selections.forEach(s => {
            body.append("items[][product_id]", String(s.product_id));
            body.append("items[][qty]", String(s.qty));
        });
        const { status, response }: IResponse = await request("/deliverer/stock/open", "POST", body);
        if (status) {
            const data = await response.json();
            setStock(data.data);
            toast.success("Jornada abierta ✅");
            setOpenOpenDlg(false);
            setSelections([]);
        } else {
            toast.error("No se pudo abrir la jornada ❌");
        }
    };

    const onAddItems = async () => {
        if (!stock) return;
        if (addItems.length === 0) { toast.error("Agrega algún producto"); return; }
        const body = new URLSearchParams();
        addItems.forEach(s => {
            body.append("items[][product_id]", String(s.product_id));
            body.append("items[][qty]", String(s.qty));
        });
        const { status, response }: IResponse = await request("/deliverer/stock/add-items", "POST", body);
        if (status) {
            const data = await response.json();
            setStock(data.data);
            toast.success("Stock agregado ✅");
            setOpenAddDlg(false);
            setAddItems([]);
        } else {
            toast.error("No se pudo agregar stock ❌");
        }
    };

    const registerDeliver = async (product_id: number, qty: number) => {
        if (!qty || qty <= 0) return;
        const body = new URLSearchParams();
        body.append("product_id", String(product_id));
        body.append("qty", String(qty));
        const { status, response }: IResponse = await request("/deliverer/stock/deliver", "POST", body);
        if (status) {
            await loadAll();
            toast.success("Entrega registrada ✅");
        } else {
            toast.error("No se pudo registrar la entrega ❌");
        }
    };

    const onCloseShift = async () => {
        const body = new URLSearchParams();
        returns.forEach(r => {
            body.append("returns[][product_id]", String(r.product_id));
            body.append("returns[][qty]", String(r.qty));
        });
        const { status, response }: IResponse = await request("/deliverer/stock/close", "POST", body);
        if (status) {
            const data = await response.json();
            setStock(data.data);
            toast.success("Jornada cerrada ✅");
            setOpenCloseDlg(false);
            setReturns([]);
        } else {
            toast.error("No se pudo cerrar la jornada ❌");
        }
    };

    const items = useMemo(() => stock?.items ?? [], [stock]);

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <TypographyCustom variant="h6" fontWeight={700}>Mi stock del día</TypographyCustom>
                    <Box>
                        <IconButton onClick={loadAll} disabled={loading}><RefreshRoundedIcon /></IconButton>
                    </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {!stock && (
                    <Paper sx={{ p: 2 }}>
                        <TypographyCustom sx={{ mb: 2 }}>No tienes jornada abierta hoy.</TypographyCustom>
                        <ButtonCustom
                            variant="contained"
                            startIcon={<LocalShippingRoundedIcon />}
                            onClick={() => setOpenOpenDlg(true)}
                        >
                            Abrir jornada
                        </ButtonCustom>
                    </Paper>
                )}

                {stock && (
                    <Paper sx={{ p: 2, display: "grid", gap: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <TypographyCustom>Fecha: {stock.date} • Estado: <b>{stock.status}</b></TypographyCustom>
                            <Box sx={{ display: "flex", gap: 1 }}>
                                {stock.status === "open" && (
                                    <>
                                        <ButtonCustom
                                            variant="outlined"
                                            startIcon={<AddRoundedIcon />}
                                            onClick={() => setOpenAddDlg(true)}
                                        >
                                            Agregar del inventario
                                        </ButtonCustom>
                                        <ButtonCustom
                                            color="error"
                                            variant="contained"
                                            startIcon={<AssignmentTurnedInRoundedIcon />}
                                            onClick={() => {
                                                // precargar returns al valor disponible
                                                const preset = (stock.items ?? []).map(it => ({
                                                    product_id: it.product_id,
                                                    qty: Math.max(0, it.qty_assigned - it.qty_delivered - it.qty_returned),
                                                }));
                                                setReturns(preset);
                                                setOpenCloseDlg(true);
                                            }}
                                        >
                                            Cerrar jornada / Devolución
                                        </ButtonCustom>
                                    </>
                                )}
                            </Box>
                        </Box>

                        <Divider />

                        <List dense>
                            {items.length === 0 && (<TypographyCustom>No tienes productos en tu stock.</TypographyCustom>)}
                            {items.map(it => {
                                const onHand = (it.qty_assigned - it.qty_delivered - it.qty_returned);
                                return (
                                    <ListItem key={it.id} secondaryAction={
                                        stock.status === "open" && (
                                            <Box sx={{ display: "flex", gap: 1 }}>
                                                <TextField
                                                    placeholder="Entregar..."
                                                    size="small"
                                                    type="number"
                                                    inputProps={{ min: 1, max: onHand }}
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === "Enter") {
                                                            const qty = parseInt(e.currentTarget.value || "0", 10);
                                                            if (qty > 0) registerDeliver(it.product_id, qty);
                                                            e.currentTarget.value = "";
                                                        }
                                                    }}
                                                />
                                                <ButtonCustom variant="contained" size="small" onClick={(e: any) => {
                                                    const input = (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement);
                                                    const qty = parseInt(input?.value || "0", 10);
                                                    if (qty > 0) registerDeliver(it.product_id, qty);
                                                    if (input) input.value = "";
                                                }}>OK</ButtonCustom>
                                            </Box>
                                        )
                                    }>
                                        <ListItemText
                                            primary={`${it.product?.title ?? "Producto"} ${it.product?.sku ? `(${it.product.sku})` : ""}`}
                                            secondary={`Asignado: ${it.qty_assigned} • Entregado: ${it.qty_delivered} • Devuelto: ${it.qty_returned} • Disponible: ${onHand}`}
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Paper>
                )}
            </Box>

            {/* Dialog Abrir jornada */}
            <Dialog open={openOpenDlg} onClose={() => setOpenOpenDlg(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Abrir jornada</DialogTitle>
                <DialogContent dividers>
                    <TypographyCustom sx={{ mb: 1 }}>Selecciona productos y cantidades iniciales</TypographyCustom>
                    {selections.map((s, idx) => (
                        <Box key={idx} sx={{ display: "flex", gap: 1, my: 1 }}>
                            <TextFieldCustom
                                select
                                label="Producto"
                                value={s.product_id}
                                onChange={(e) => {
                                    const v = Number(e.target.value);
                                    const next = [...selections]; next[idx].product_id = v; setSelections(next);
                                }}
                                fullWidth
                            >
                                {products.map(p => (
                                    <MenuItem key={p.id} value={p.id}>{p.title} {p.sku ? `(${p.sku})` : ""}</MenuItem>
                                ))}
                            </TextFieldCustom>
                            <TextFieldCustom
                                type="number"
                                label="Cantidad"
                                value={s.qty}
                                onChange={(e) => {
                                    const v = Math.max(1, Number(e.target.value || 1));
                                    const next = [...selections]; next[idx].qty = v; setSelections(next);
                                }}
                                sx={{ width: 160 }}
                            />
                            <IconButton onClick={() => {
                                const next = selections.filter((_, i) => i !== idx); setSelections(next);
                            }}>
                                <CloseRoundedIcon />
                            </IconButton>
                        </Box>
                    ))}
                    <ButtonCustom variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setSelections(prev => [...prev, { product_id: products[0]?.id ?? 0, qty: 1 }])}>
                        Añadir producto
                    </ButtonCustom>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom variant="outlined" onClick={() => setOpenOpenDlg(false)}>Cancelar</ButtonCustom>
                    <ButtonCustom variant="contained" onClick={onOpenShift}>Abrir jornada</ButtonCustom>
                </DialogActions>
            </Dialog>

            {/* Dialog Agregar items */}
            <Dialog open={openAddDlg} onClose={() => setOpenAddDlg(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Agregar del inventario general</DialogTitle>
                <DialogContent dividers>
                    {addItems.map((s, idx) => (
                        <Box key={idx} sx={{ display: "flex", gap: 1, my: 1 }}>
                            <TextField
                                select
                                label="Producto"
                                value={s.product_id}
                                onChange={(e) => {
                                    const v = Number(e.target.value);
                                    const next = [...addItems]; next[idx].product_id = v; setAddItems(next);
                                }}
                                fullWidth
                            >
                                {products.map(p => (
                                    <MenuItem key={p.id} value={p.id}>{p.title} {p.sku ? `(${p.sku})` : ""}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                type="number"
                                label="Cantidad"
                                value={s.qty}
                                onChange={(e) => {
                                    const v = Math.max(1, Number(e.target.value || 1));
                                    const next = [...addItems]; next[idx].qty = v; setAddItems(next);
                                }}
                                sx={{ width: 160 }}
                            />
                            <IconButton onClick={() => {
                                const next = addItems.filter((_, i) => i !== idx); setAddItems(next);
                            }}>
                                <CloseRoundedIcon />
                            </IconButton>
                        </Box>
                    ))}
                    <ButtonCustom variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAddItems(prev => [...prev, { product_id: products[0]?.id ?? 0, qty: 1 }])}>
                        Añadir producto
                    </ButtonCustom>
                </DialogContent>
                <DialogActions>
                    <ButtonCustom variant="outlined" onClick={() => setOpenAddDlg(false)}>Cancelar</ButtonCustom>
                    <ButtonCustom variant="contained" onClick={onAddItems}>Agregar</ButtonCustom>
                </DialogActions>
            </Dialog>

            {/* Dialog Cerrar jornada */}
            <Dialog open={openCloseDlg} onClose={() => setOpenCloseDlg(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Devolución y cierre</DialogTitle>
                <DialogContent dividers>
                    {stock?.items?.map((it, idx) => {
                        const onHand = (it.qty_assigned - it.qty_delivered - it.qty_returned);
                        const current = returns.find(r => r.product_id === it.product_id)?.qty ?? onHand;
                        return (
                            <Box key={it.id} sx={{ display: "flex", gap: 1, my: 1, alignItems: "center" }}>
                                <Box sx={{ flex: 1 }}>
                                    <TypographyCustom variant="body2"><b>{it.product?.title}</b> {it.product?.sku ? `(${it.product?.sku})` : ""}</TypographyCustom>
                                    <TypographyCustom variant="caption" color="text.secondary">
                                        Disponible: {onHand} • Entregado: {it.qty_delivered} • Asignado: {it.qty_assigned}
                                    </TypographyCustom>
                                </Box>
                                <TextFieldCustom
                                    type="number"
                                    label="Devolver"
                                    value={current}
                                    inputProps={{ min: 0, max: onHand }}
                                    onChange={(e: any) => {
                                        const v = Math.max(0, Math.min(onHand, Number(e.target.value || 0)));
                                        setReturns(prev => {
                                            const others = prev.filter(r => r.product_id !== it.product_id);
                                            return [...others, { product_id: it.product_id, qty: v }];
                                        });
                                    }}
                                    sx={{ width: 160 }}
                                />
                            </Box>
                        );
                    })}
                </DialogContent>
                <DialogActions>
                    <ButtonCustom variant="outlined" onClick={() => setOpenCloseDlg(false)}>Cancelar</ButtonCustom>
                    <ButtonCustom color="error" variant="contained" onClick={onCloseShift}>Cerrar jornada</ButtonCustom>
                </DialogActions>
            </Dialog>
        </Layout>
    );
};