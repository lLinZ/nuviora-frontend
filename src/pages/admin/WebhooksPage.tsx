import { FC, useEffect, useState } from "react";
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Button, IconButton, 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, MenuItem, Select, FormControl, InputLabel, 
    CircularProgress, Chip 
} from "@mui/material";
import { DeleteRounded, AddRounded, LinkRounded, SettingsEthernetRounded } from "@mui/icons-material";
import { request } from "../../common/request";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";

interface Status {
    id: number;
    description: string;
}

interface Webhook {
    id: number;
    name: string;
    url: string;
    status_id: number | null;
    status: Status | null;
    is_active: boolean;
}

export const WebhooksPage: FC = () => {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(false);
    const [openAdd, setOpenAdd] = useState(false);
    
    // Form state
    const [newName, setNewName] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<number | "all">("all");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [webhookRes, statusRes] = await Promise.all([
                request("/webhooks", "GET"),
                request("/statuses", "GET")
            ]);

            if (webhookRes.status === 200) {
                setWebhooks(await webhookRes.response.json());
            }
            if (statusRes.status === 200) {
                setStatuses(await statusRes.response.json());
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = async () => {
        if (!newName || !newUrl) {
            return toast.warning("Nombre y URL son obligatorios");
        }

        try {
            const body = {
                name: newName,
                url: newUrl,
                status_id: selectedStatus === "all" ? null : selectedStatus,
                event_type: "order.status_changed"
            };

            const { status } = await request("/webhooks", "POST", body);
            if (status === 200) {
                toast.success("Webhook configurado exitosamente");
                setOpenAdd(false);
                setNewName("");
                setNewUrl("");
                setSelectedStatus("all");
                fetchData();
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar webhook");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Estás seguro de eliminar este webhook?")) return;
        
        try {
            const { status } = await request(`/webhooks/${id}`, "DELETE");
            if (status === 200) {
                toast.success("Webhook eliminado");
                fetchData();
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar");
        }
    };

    return (
        <Layout>
            <Box sx={{ p: 4, maxWidth: 1200, margin: "0 auto" }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box>
                        <Typography variant="h4" fontWeight="black" sx={{ lineHeight: 1.2 }}>Integraciones Webhooks</Typography>
                        <DescripcionDeVista 
                            title="Webhooks / n8n" 
                            description="Gestiona tus conexiones con n8n, Make u otras herramientas externas para automatizar procesos." 
                        />
                    </Box>
                    <Button 
                        variant="contained" 
                        startIcon={<AddRounded />} 
                        onClick={() => setOpenAdd(true)}
                        sx={{ borderRadius: 3, px: 3, py: 1.5, textTransform: 'none', fontWeight: 'bold' }}
                    >
                        Añadir Integración
                    </Button>
                </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell><Typography fontWeight="bold">Nombre / Destino</Typography></TableCell>
                            <TableCell><Typography fontWeight="bold">Activador (Trigger)</Typography></TableCell>
                            <TableCell><Typography fontWeight="bold">Estado</Typography></TableCell>
                            <TableCell align="right"><Typography fontWeight="bold">Acciones</Typography></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 5 }}><CircularProgress size={30} /></TableCell>
                            </TableRow>
                        )}
                        {!loading && webhooks.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 10, opacity: 0.5 }}>
                                    <LinkRounded sx={{ fontSize: 48, mb: 1 }} />
                                    <Typography>No tienes webhooks configurados todavía.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {webhooks.map((webhook) => (
                            <TableRow key={webhook.id} hover>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight="bold">{webhook.name}</Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {webhook.url}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {webhook.status_id ? (
                                        <Chip 
                                            label={`Al pasar a: ${webhook.status?.description}`} 
                                            size="small" 
                                            color="primary" 
                                            sx={{ fontWeight: 'bold' }} 
                                        />
                                    ) : (
                                        <Chip label="Cualquier cambio de estado" size="small" variant="outlined" />
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={webhook.is_active ? "Activo" : "Inactivo"} 
                                        color={webhook.is_active ? "success" : "default"} 
                                        size="small" 
                                        variant={webhook.is_active ? "filled" : "outlined"}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton color="error" size="small" onClick={() => handleDelete(webhook.id)}>
                                        <DeleteRounded fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* DIALOG AÑADIR */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Nueva Integración con n8n / Webhook</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
                        <TextField
                            label="Nombre de la integración"
                            placeholder="Ej: n8n Ventas Confirmadas"
                            fullWidth
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <TextField
                            label="URL del Webhook (n8n)"
                            placeholder="https://n8n.tu-instancia.com/webhook/..."
                            fullWidth
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Disparar al cambiar a este estado...</InputLabel>
                            <Select
                                value={selectedStatus}
                                label="Disparar al cambiar a este estado..."
                                onChange={(e) => setSelectedStatus(e.target.value as number | "all")}
                            >
                                <MenuItem value="all"><strong>Cualquier cambio de estado</strong></MenuItem>
                                {statuses.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>{s.description}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenAdd(false)} color="inherit">Cancelar</Button>
                    <Button variant="contained" onClick={handleAdd} sx={{ borderRadius: 4, px: 4 }}>Crear Integración</Button>
                </DialogActions>
            </Dialog>
        </Box>
    </Layout>
    );
};
