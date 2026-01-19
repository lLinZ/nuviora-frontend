import React, { useEffect, useState } from "react";
import { Layout } from "../components/ui/Layout";
import { DescripcionDeVista } from "../components/ui/content/DescripcionDeVista";
import { Loading } from "../components/ui/content/Loading";
import { useValidateSession } from "../hooks/useValidateSession";
import { request } from "../common/request";
import { IResponse } from "../interfaces/response-type";
import {
    Box, Button, Card, CardContent, Grid, IconButton,
    Typography, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, PersonAdd as PersonAddIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import { AddUserDialog } from "../components/users/AddUserDialog";

export const Cities = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [cities, setCities] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openAdd, setOpenAdd] = useState(false);
    const [openAddAgency, setOpenAddAgency] = useState(false);
    const [editingCity, setEditingCity] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [citiesRes, agenciesRes]: [IResponse, IResponse] = await Promise.all([
                request("/cities", "GET"),
                request("/users/role/Agencia", "GET")
            ]);

            if (citiesRes.status) {
                const data = await citiesRes.response.json();
                setCities(data);
            }
            if (agenciesRes.status) {
                const data = await agenciesRes.response.json();
                setAgencies(data.data);
            }
        } catch (e) {
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isValid) fetchData();
    }, [isValid]);

    const handleSaveCity = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        const url = editingCity ? `/cities/${editingCity.id}` : "/cities";
        const method = editingCity ? "PUT" : "POST";

        try {
            const { status, response }: IResponse = await request(url, method, data as any);
            if (status) {
                toast.success(editingCity ? "Ciudad actualizada" : "Ciudad creada");
                setOpenAdd(false);
                setEditingCity(null);
                fetchData();
            } else {
                const err = await response.json();
                toast.error(err.message || "Error al guardar");
            }
        } catch (e) {
            toast.error("Error inesperado");
        }
    };

    const handleDeleteCity = async (id: number) => {
        if (!confirm("¿Eliminar esta ciudad?")) return;
        try {
            const { status }: IResponse = await request(`/cities/${id}`, "DELETE");
            if (status) {
                toast.success("Ciudad eliminada");
                fetchData();
            }
        } catch (e) {
            toast.error("Error al eliminar");
        }
    };

    if (loadingSession || loading) return <Loading />;

    return (
        <Layout>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <DescripcionDeVista title="Ciudades y Agencias" description="Administración de ciudades, costos de delivery y agencias asignadas" />
                <Box display="flex" gap={2}>
                    <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={() => setOpenAddAgency(true)} color="secondary">
                        Nueva Agencia
                    </Button>
                    {user.role?.description === 'Admin' && (
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingCity(null); setOpenAdd(true); }}>
                            Nueva Ciudad
                        </Button>
                    )}
                </Box>
            </Box>

            <Grid container spacing={3}>
                {cities.map((city) => (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={city.id}>
                        <Card elevation={3} sx={{ borderRadius: 4, height: '100%' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">{city.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Costo Delivery: <b>${city.delivery_cost_usd}</b>
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Agencia: <b>{city.agency?.names || 'No asignada'}</b>
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <IconButton onClick={() => { setEditingCity(city); setOpenAdd(true); }}><EditIcon /></IconButton>
                                        <IconButton color="error" onClick={() => handleDeleteCity(city.id)}><DeleteIcon /></IconButton>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Dialog Add/Edit */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="xs">
                <form onSubmit={handleSaveCity}>
                    <DialogTitle>{editingCity ? 'Editar Ciudad' : 'Nueva Ciudad'}</DialogTitle>
                    <DialogContent>
                        <Box display="flex" flexDirection="column" gap={2} mt={1}>
                            <TextField name="name" label="Nombre de la Ciudad" fullWidth required defaultValue={editingCity?.name} />
                            <TextField
                                name="delivery_cost_usd"
                                label="Costo de Delivery (USD)"
                                type="number"
                                fullWidth
                                required
                                defaultValue={editingCity?.delivery_cost_usd}
                                inputProps={{ step: "0.01" }}
                            />
                            <TextField
                                select
                                name="agency_id"
                                label="Agencia Asignada"
                                fullWidth
                                defaultValue={editingCity?.agency_id || ""}
                            >
                                <MenuItem value=""><em>Sin agencia</em></MenuItem>
                                {agencies.map(agency => (
                                    <MenuItem key={agency.id} value={agency.id}>
                                        {agency.names}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenAdd(false)}>Cancelar</Button>
                        <Button variant="contained" type="submit">Guardar</Button>
                    </DialogActions>
                </form>
            </Dialog>

            <AddUserDialog
                open={openAddAgency}
                onClose={() => setOpenAddAgency(false)}
                defaultRole="Agencia"
                onUserAdded={() => {
                    fetchData();
                }}
            />
        </Layout>
    );
};
