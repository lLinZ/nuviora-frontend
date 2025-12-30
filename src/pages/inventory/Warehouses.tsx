import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    IconButton
} from '@mui/material';
import {
    Warehouse as WarehouseIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Inventory as InventoryIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IWarehouse } from '../../interfaces/inventory.types';
import { ButtonCustom } from '../../components/custom';
import { CreateWarehouseDialog } from '../../components/inventory/CreateWarehouseDialog';
import { useValidateSession } from '../../hooks/useValidateSession';
import { Loading } from '../../components/ui/content/Loading';

export const Warehouses: React.FC = () => {
    const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
    const [loading, setLoading] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const navigate = useNavigate();
    const { loadingSession, isValid, user } = useValidateSession();

    useEffect(() => {
        loadWarehouses();
    }, []);

    const loadWarehouses = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/warehouses', 'GET');
            if (status) {
                const data = await response.json();
                setWarehouses(data.data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista
                title="Almacenes"
                description="Gestión de ubicaciones de inventario"
            />

            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
                    <ButtonCustom variant="outlined" startIcon={<InventoryIcon />} onClick={() => navigate('/inventory')}>
                        Ver Inventario Global
                    </ButtonCustom>
                    <ButtonCustom variant='contained' startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
                        Nuevo Almacén
                    </ButtonCustom>
                </Box>

                <Grid container spacing={3}>
                    {warehouses.map((warehouse) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={warehouse.id}>
                            <Card elevation={2}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <WarehouseIcon color="primary" />
                                            <Typography variant="h6">{warehouse.name}</Typography>
                                        </Box>
                                        {warehouse.is_main && (
                                            <Chip label="Principal" size="small" color="primary" variant="outlined" />
                                        )}
                                    </Box>

                                    <Typography color="text.secondary" gutterBottom>
                                        Código: {warehouse.code}
                                    </Typography>

                                    <Typography variant="body2" sx={{ mb: 2, minHeight: 40 }}>
                                        {warehouse.description || 'Sin descripción'}
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip
                                            label={warehouse.is_active ? 'Activo' : 'Inactivo'}
                                            color={warehouse.is_active ? 'success' : 'default'}
                                            size="small"
                                        />
                                        <Chip
                                            label={warehouse.warehouse_type?.name || 'General'}
                                            size="small"
                                            variant="outlined"
                                        />
                                        {warehouse.user && (
                                            <Chip
                                                label={`Rep: ${warehouse.user.names}`}
                                                size="small"
                                                color="secondary"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                </CardContent>
                                <CardActions>
                                    <Button
                                        size="small"
                                        startIcon={<InventoryIcon />}
                                        onClick={() => navigate(`/inventory/warehouses/${warehouse.id}`)}
                                    >
                                        Ver Inventario
                                    </Button>
                                    <Box sx={{ flexGrow: 1 }} />
                                    <IconButton size="small" color="primary">
                                        <EditIcon />
                                    </IconButton>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

            </Box>

            <CreateWarehouseDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onSuccess={loadWarehouses}
            />
        </Layout >
    );
};
