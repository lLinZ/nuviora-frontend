import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    FormControlLabel,
    Switch,
    MenuItem
} from '@mui/material';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { toast } from 'react-toastify';

interface CreateWarehouseDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface IWarehouseType {
    id: number;
    name: string;
    code: string;
}

export const CreateWarehouseDialog: React.FC<CreateWarehouseDialogProps> = ({ open, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [types, setTypes] = useState<IWarehouseType[]>([]);
    
    // Form state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [typeId, setTypeId] = useState<number | ''>('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [isMain, setIsMain] = useState(false);

    useEffect(() => {
        if (open) {
            loadTypes();
            resetForm();
        }
    }, [open]);

    const loadTypes = async () => {
        try {
            const { status, response }: IResponse = await request('/warehouse-types', 'GET');
            if (status) {
                const data = await response.json();
                setTypes(data.data || []);
                // Default to first type if available
                if (data.data && data.data.length > 0 && !typeId) {
                    setTypeId(data.data[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading warehouse types:', error);
        }
    };

    const resetForm = () => {
        setName('');
        setCode('');
        setTypeId('');
        setLocation('');
        setDescription('');
        setIsMain(false);
    };

    const handleSubmit = async () => {
        if (!name || !code || !typeId) {
            toast.error('Por favor complete los campos requeridos');
            return;
        }

        setLoading(true);
        try {
            const body = {
                name,
                code,
                warehouse_type_id: typeId,
                location,
                description,
                is_main: isMain,
                is_active: true
            };

            const { status, response }: IResponse = await request('/warehouses', 'POST', JSON.stringify(body));
            
            if (status === 201 || status === 200) {
                toast.success('Almacén creado exitosamente');
                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Error al crear almacén');
                if (data.errors) {
                    Object.values(data.errors).forEach((err: any) => {
                        toast.error(err[0]);
                    });
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Nuevo Almacén</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label="Nombre"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label="Código"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                            helperText="Debe ser único"
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            select
                            fullWidth
                            label="Tipo de Almacén"
                            value={typeId}
                            onChange={(e) => setTypeId(Number(e.target.value))}
                            required
                        >
                            {types.map((type) => (
                                <MenuItem key={type.id} value={type.id}>
                                    {type.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            label="Ubicación / Dirección"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Descripción"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isMain}
                                    onChange={(e) => setIsMain(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Es Almacén Principal"
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Almacén'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
