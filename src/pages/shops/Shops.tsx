import React, { useEffect, useState } from "react";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import {
    Box, Button, Card, CardContent, Grid, IconButton,
    Typography, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, Chip, Checkbox,
    FormControlLabel, FormGroup
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, PersonAdd as PersonAddIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import { TypographyCustom } from "../../components/custom";

export const Shops = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openAdd, setOpenAdd] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [editingShop, setEditingShop] = useState<any>(null);
    const [allSellers, setAllSellers] = useState<any[]>([]);
    const [selectedSellers, setSelectedSellers] = useState<number[]>([]);

    const fetchShops = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/shops", "GET");
            if (status) {
                const data = await response.json();
                setShops(data.data || data);
            }
        } catch (e) {
            toast.error("Error al cargar tiendas");
        } finally {
            setLoading(false);
        }
    };

    const fetchSellers = async () => {
        try {
            const { status, response }: IResponse = await request("/users/agents", "GET");
            if (status) {
                const data = await response.json();
                setAllSellers(data.data);
            }
        } catch (e) { }
    };

    useEffect(() => {
        if (isValid) {
            fetchShops();
            fetchSellers();
        }
    }, [isValid]);

    const handleSaveShop = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        const url = editingShop ? `/shops/${editingShop.id}` : "/shops";
        const method = editingShop ? "PUT" : "POST";

        try {
            const { status }: IResponse = await request(url, method, data as any);
            if (status) {
                toast.success(editingShop ? "Tienda actualizada" : "Tienda creada");
                setOpenAdd(false);
                setEditingShop(null);
                fetchShops();
            } else {
                toast.error("Error al guardar tienda");
            }
        } catch (e) {
            toast.error("Error inesperado");
        }
    };

    const handleDeleteShop = async (id: number) => {
        if (!confirm("¿Eliminar esta tienda?")) return;
        try {
            const { status }: IResponse = await request(`/shops/${id}`, "DELETE");
            if (status) {
                toast.success("Tienda eliminada");
                fetchShops();
            }
        } catch (e) {
            toast.error("Error al eliminar");
        }
    };

    const handleOpenAssign = (shop: any) => {
        setEditingShop(shop);
        setSelectedSellers(shop.sellers.map((s: any) => s.id));
        setOpenAssign(true);
    };

    const handleAssignSellers = async () => {
        try {
            const { status }: IResponse = await request(`/shops/${editingShop.id}/assign-sellers`, "POST", {
                seller_ids: selectedSellers
            } as any);
            if (status) {
                toast.success("Vendedores asignados");
                setOpenAssign(false);
                fetchShops();
            }
        } catch (e) {
            toast.error("Error al asignar");
        }
    };

    if (loadingSession || loading) return <Loading />;

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <DescripcionDeVista title="Tiendas" description="Administración de tiendas y asignación de vendedoras" />
                {user.role?.description === 'Admin' && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingShop(null); setOpenAdd(true); }}>
                        Nueva Tienda
                    </Button>
                )}
            </Box>

            <Grid container spacing={3}>
                {shops.map((shop) => (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={shop.id}>
                        <Card elevation={3} sx={{ borderRadius: 4, height: '100%' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">{shop.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">{shop.shopify_domain || 'Sin dominio'}</Typography>
                                    </Box>
                                    <Box>
                                        <IconButton onClick={() => { setEditingShop(shop); setOpenAdd(true); }}><EditIcon /></IconButton>
                                        <IconButton color="error" onClick={() => handleDeleteShop(shop.id)}><DeleteIcon /></IconButton>
                                    </Box>
                                </Box>

                                <Box mt={2}>
                                    <Typography variant="subtitle2" gutterBottom>Vendedoras asignadas:</Typography>
                                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                                        {shop.sellers.length > 0 ? (
                                            shop.sellers.map((s: any) => (
                                                <Chip key={s.id} label={s.names || s.name} size="small" variant="outlined" />
                                            ))
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">Ninguna</Typography>
                                        )}
                                        <IconButton size="small" color="primary" onClick={() => handleOpenAssign(shop)}>
                                            <PersonAddIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>

                                <Box mt={2}>
                                    <Typography variant="caption" color="text.secondary">
                                        Webhook URL: {`${window.location.origin}/api/order/webhook/${shop.id}`}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Dialog Add/Edit */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="sm">
                <form onSubmit={handleSaveShop}>
                    <DialogTitle>{editingShop ? 'Editar Tienda' : 'Nueva Tienda'}</DialogTitle>
                    <DialogContent>
                        <Box display="flex" flexDirection="column" gap={2} mt={1}>
                            <TextField name="name" label="Nombre de la Tienda" fullWidth required defaultValue={editingShop?.name} />
                            <TextField name="shopify_domain" label="Dominio Shopify (ej: tutienda.myshopify.com)" fullWidth defaultValue={editingShop?.shopify_domain}
                                placeholder="tutienda.myshopify.com"
                                helperText="El dominio de tu tienda en Shopify"
                            />
                            <TextField
                                name="shopify_access_token"
                                label="Access Token de Shopify"
                                fullWidth
                                defaultValue={editingShop?.shopify_access_token}
                                type="password"
                                helperText="Token de acceso a la API de Shopify"
                            />
                            <TextField
                                name="shopify_webhook_secret"
                                label="Webhook Secret de Shopify"
                                fullWidth
                                defaultValue={editingShop?.shopify_webhook_secret}
                                type="password"
                                helperText="Secreto para validar webhooks de Shopify"
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenAdd(false)}>Cancelar</Button>
                        <Button variant="contained" type="submit">Guardar</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Dialog Assign Sellers */}
            <Dialog open={openAssign} onClose={() => setOpenAssign(false)} fullWidth maxWidth="xs">
                <DialogTitle>Asignar Vendedoras a {editingShop?.name}</DialogTitle>
                <DialogContent>
                    <FormGroup>
                        {allSellers.map((seller) => (
                            <FormControlLabel
                                key={seller.id}
                                control={
                                    <Checkbox
                                        checked={selectedSellers.includes(seller.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedSellers([...selectedSellers, seller.id]);
                                            else setSelectedSellers(selectedSellers.filter(id => id !== seller.id));
                                        }}
                                    />
                                }
                                label={seller.names || seller.name}
                            />
                        ))}
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAssign(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleAssignSellers}>Asignar</Button>
                </DialogActions>
            </Dialog>
        </Layout>
    );
};
