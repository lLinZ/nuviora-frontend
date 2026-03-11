import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Switch,
    FormControlLabel,
    Stack,
    Tooltip,
    Divider,
    Paper,
    LinearProgress,
    Chip
} from '@mui/material';
import {
    AddRounded,
    EditRounded,
    DeleteRounded,
    WhatsApp as WhatsAppIcon,
    VerifiedRounded,
    MessageRounded,
    HelpOutline
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { toast } from 'react-toastify';
import { useValidateSession } from '../../hooks/useValidateSession';

interface IWhatsappTemplate {
    id: number;
    name: string;
    label: string;
    body: string;
    is_official: boolean;
    created_at?: string;
}

export const WhatsappTemplates: React.FC = () => {
    const { isValid } = useValidateSession();
    const [templates, setTemplates] = useState<IWhatsappTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<IWhatsappTemplate | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        label: '',
        body: '',
        is_official: false
    });

    useEffect(() => {
        if (isValid) {
            loadTemplates();
        }
    }, [isValid]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/whatsapp-templates', 'GET');
            if (status === 200) {
                const data = await response.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar las plantillas');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (template: IWhatsappTemplate | null = null) => {
        if (template) {
            setSelectedTemplate(template);
            setFormData({
                name: template.name,
                label: template.label,
                body: template.body,
                is_official: !!template.is_official
            });
        } else {
            setSelectedTemplate(null);
            setFormData({
                name: '',
                label: '',
                body: '',
                is_official: false
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedTemplate(null);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.label || !formData.body) {
            toast.warning('Todos los campos son obligatorios');
            return;
        }

        setLoading(true);
        try {
            const endpoint = selectedTemplate ? `/whatsapp-templates/${selectedTemplate.id}` : '/whatsapp-templates';
            const method = selectedTemplate ? 'PUT' : 'POST';

            // Clean name (lowercase, underscores)
            const submissionData = {
                ...formData,
                name: formData.name.toLowerCase().replace(/\s+/g, '_')
            };

            const { status } = await request(endpoint, method, submissionData);

            if (status === 200 || status === 201) {
                toast.success(selectedTemplate ? 'Plantilla actualizada' : 'Plantilla creada');
                handleCloseDialog();
                loadTemplates();
            } else {
                toast.error('Error al guardar la plantilla');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar la plantilla');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar esta plantilla?')) return;

        setLoading(true);
        try {
            const { status } = await request(`/whatsapp-templates/${id}`, 'DELETE');
            if (status === 200) {
                toast.success('Plantilla eliminada');
                loadTemplates();
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar la plantilla');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <Box sx={{ p: { xs: 2, md: 4 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="800" sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <WhatsAppIcon sx={{ color: '#25d366', fontSize: 40 }} />
                            Plantillas de WhatsApp
                        </Typography>
                        <DescripcionDeVista
                            title="Plantillas de WhatsApp"
                            description="Configura mensajes predefinidos y plantillas oficiales de Meta API."
                        />
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddRounded />}
                        onClick={() => handleOpenDialog()}
                        sx={{
                            borderRadius: 3,
                            px: 3,
                            py: 1.5,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                            bgcolor: '#25d366',
                            '&:hover': { bgcolor: '#128c7e' }
                        }}
                    >
                        Nueva Plantilla
                    </Button>
                </Stack>

                {loading && <LinearProgress sx={{ mb: 4, borderRadius: 2 }} />}

                <Grid container spacing={3}>
                    {templates.map((template) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id}>
                            <Card
                                sx={{
                                    borderRadius: 4,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 12px 24px rgba(0,0,0,0.1)'
                                    }
                                }}
                            >
                                <CardContent sx={{ flex: 1 }}>
                                    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
                                        <Box sx={{
                                            p: 1.5,
                                            borderRadius: 3,
                                            bgcolor: template.is_official ? 'secondary.main' : 'rgba(37, 211, 102, 0.1)',
                                            color: template.is_official ? 'white' : '#25d366'
                                        }}>
                                            {template.is_official ? <VerifiedRounded /> : <MessageRounded />}
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                                                {template.label}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', display: 'block' }}>
                                                {template.name}
                                            </Typography>
                                        </Box>
                                        {!!template.is_official && (
                                            <Chip
                                                label="OFICIAL"
                                                size="small"
                                                color="secondary"
                                                sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: 20 }}
                                            />
                                        )}
                                    </Stack>

                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            borderRadius: 3,
                                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                                            borderStyle: 'dashed'
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', fontStyle: 'italic' }}>
                                            "{template.body}"
                                        </Typography>
                                    </Paper>
                                </CardContent>

                                <Divider />

                                <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleOpenDialog(template)}
                                        sx={{ bgcolor: 'action.hover' }}
                                    >
                                        <EditRounded fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDelete(template.id)}
                                        sx={{ bgcolor: 'rgba(255,0,0,0.05)', '&:hover': { bgcolor: 'rgba(255,0,0,0.1)' } }}
                                    >
                                        <DeleteRounded fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                    {templates.length === 0 && !loading && (
                        <Grid size={{ xs: 12 }}>
                            <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 4, bgcolor: 'background.default', border: '2px dashed', borderColor: 'divider' }}>
                                <MessageRounded sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                <Typography color="text.secondary">No hay plantillas registradas</Typography>
                                <Button
                                    sx={{ mt: 2 }}
                                    variant="outlined"
                                    onClick={() => handleOpenDialog()}
                                >
                                    Crear mi primera plantilla
                                </Button>
                            </Paper>
                        </Grid>
                    )}
                </Grid>

                <Dialog
                    open={dialogOpen}
                    onClose={handleCloseDialog}
                    PaperProps={{
                        sx: { borderRadius: 4, width: '100%', maxWidth: 500 }
                    }}
                >
                    <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                        {selectedTemplate ? <EditRounded color="primary" /> : <AddRounded color="primary" />}
                        {selectedTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField
                                label="Título amigable (Etiqueta)"
                                fullWidth
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                placeholder="Ej: Pedir Ubicación"
                                helperText="Nombre que verán los vendedores en el chat."
                            />

                            <TextField
                                label="Nombre técnico (API ID)"
                                fullWidth
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: pedir_ubicacion"
                                helperText="Debe ser minúsculas y sin espacios. Si es oficial, debe coincidir con Meta."
                            />

                            <TextField
                                label="Contenido del Mensaje"
                                fullWidth
                                multiline
                                rows={4}
                                value={formData.body}
                                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                placeholder="Escribe el mensaje aquí..."
                                helperText={
                                    <span>
                                        Usa <strong>{"{{1}}"}</strong> para insertar el nombre del cliente automáticamente.
                                    </span>
                                }
                            />

                            <Paper sx={{ p: 2, bgcolor: (theme) => formData.is_official ? 'secondary.main' : 'action.hover', color: formData.is_official ? 'white' : 'inherit', transition: 'all 0.3s' }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            color="default"
                                            checked={formData.is_official}
                                            onChange={(e) => setFormData({ ...formData, is_official: e.target.checked })}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold">Plantilla Oficial de Meta API</Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                Actívalo solo si ya registraste y aprobaste este template en Facebook Business.
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Paper>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={handleCloseDialog} color="inherit">Cancelar</Button>
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={loading || !formData.name || !formData.label || !formData.body}
                            sx={{ borderRadius: 2, px: 4 }}
                        >
                            Guardar Plantilla
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
};
