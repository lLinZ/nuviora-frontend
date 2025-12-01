import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    InputAdornment,
    IconButton
} from '@mui/material';
import {
    Search as SearchIcon,
    ArrowBack as BackIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { IWarehouse, IInventory } from '../../interfaces/inventory.types';
import { Loading } from '../../components/ui/content/Loading';
import { useValidateSession } from '../../hooks/useValidateSession';

export const WarehouseInventory: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [warehouse, setWarehouse] = useState<IWarehouse | null>(null);
    const [inventory, setInventory] = useState<IInventory[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { loadingSession, isValid, user } = useValidateSession();

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load warehouse details
            const whReq: IResponse = await request(`/warehouses/${id}`, 'GET');
            if (whReq.status) {
                const whData = await whReq.response.json();
                setWarehouse(whData.data);
            }

            // Load inventory
            const invReq: IResponse = await request(`/warehouses/${id}/inventory`, 'GET');
            if (invReq.status) {
                const invData = await invReq.response.json();
                setInventory(invData.data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredInventory = inventory.filter(item =>
        item.product?.title.toLowerCase().includes(search.toLowerCase()) ||
        item.product?.sku?.toLowerCase().includes(search.toLowerCase())
    );

    if (loadingSession || !isValid || !user.token) return <Loading />;
    if (loading) return <Loading />;
    if (!warehouse) return <Typography>Almacén no encontrado</Typography>;

    return (
        <Layout>
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <IconButton onClick={() => navigate('/inventory/warehouses')} sx={{ mr: 1 }}>
                        <BackIcon />
                    </IconButton>
                    <Box>
                        <Typography variant="h5" fontWeight="bold">{warehouse.name}</Typography>
                        <Typography variant="body2" color="text.secondary">Inventario detallado</Typography>
                    </Box>
                </Box>

                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Buscar producto..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                            }}
                            sx={{ width: 300 }}
                        />
                        <IconButton onClick={loadData}>
                            <RefreshIcon />
                        </IconButton>
                    </Box>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Producto</TableCell>
                                    <TableCell>SKU</TableCell>
                                    <TableCell align="right">Cantidad</TableCell>
                                    <TableCell align="right">Valor Unit.</TableCell>
                                    <TableCell align="right">Valor Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredInventory.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>{item.product?.title}</TableCell>
                                        <TableCell>{item.product?.sku || '—'}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                            {item.quantity}
                                        </TableCell>
                                        <TableCell align="right">
                                            ${Number(item.product?.price || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell align="right">
                                            ${(Number(item.product?.price || 0) * item.quantity).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredInventory.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            No hay productos en este almacén
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>
        </Layout>
    );
};
