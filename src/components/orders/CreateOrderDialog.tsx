import { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Typography, IconButton, Grid, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import { ButtonCustom } from "../custom";
import { ProductSearchDialog } from "../products/ProductsSearchDialog";
import { DeleteOutline, AddCircleOutline } from "@mui/icons-material";
import { request } from "../../common/request";
import { toast } from "react-toastify";
import { useUserStore } from "../../store/user/UserStore";
import { fmtMoney } from "../../lib/money";

interface CreateOrderDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (order: any) => void;
}

export const CreateOrderDialog = ({ open, onClose, onSuccess }: CreateOrderDialogProps) => {
    const user = useUserStore(state => state.user);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [clientName, setClientName] = useState("");

    // Phone Split
    const [phonePrefix, setPhonePrefix] = useState("0412");
    const [phoneNumber, setPhoneNumber] = useState("");

    const [clientProvince, setClientProvince] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [selectedAgent, setSelectedAgent] = useState("");

    // Product List
    const [products, setProducts] = useState<any[]>([]);
    const [openProductSearch, setOpenProductSearch] = useState(false);

    // Dynamic Data
    const [agents, setAgents] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const isAdminOrManager = ['Admin', 'Manager', 'Gerente', 'Master'].includes(user.role?.description || '');

    useEffect(() => {
        if (open) {
            fetchCities();
            if (isAdminOrManager) {
                fetchAgents();
            }
        }
    }, [open, isAdminOrManager]);

    const fetchCities = async () => {
        try {
            const { status, response } = await request('/cities', 'GET');
            if (status === 200) {
                const data = await response.json();
                setCities(data || []);
            }
        } catch (error) {
            console.error(error);
        }
    };
    const fetchAgents = async () => {
        try {
            const { status, response } = await request('/users/role/Vendedor', 'GET');
            if (status === 200) {
                const data = await response.json();
                setAgents(data.data || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddProduct = (product: any) => {
        setProducts(prev => {
            const exists = prev.find(p => p.id === product.id);
            if (exists) {
                return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { ...product, quantity: 1, price: parseFloat(product.price || 0) }];
        });
        setOpenProductSearch(false);
    };

    const handleRemoveProduct = (id: number) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const handleQuantityChange = (id: number, qty: number) => {
        if (qty < 1) return;
        setProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: qty } : p));
    };

    const handlePriceChange = (id: number, price: number) => {
        if (price < 0) return;
        setProducts(prev => prev.map(p => p.id === id ? { ...p, price: price } : p));
    };

    const calculateTotal = () => {
        return products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    };

    const handleSubmit = async () => {
        const fullPhone = `${phonePrefix}${phoneNumber}`;

        if (!clientName || phoneNumber.length !== 7 || !clientProvince || products.length === 0) {
            toast.warning("Por favor complete los campos obligatorios. El teléfono debe tener 7 dígitos.");
            return;
        }

        setLoading(true);
        try {
            const payload: any = {
                client_name: clientName,
                client_phone: fullPhone,
                client_province: clientProvince,
                client_address: clientAddress,
                products: products.map(p => ({
                    id: p.id,
                    quantity: p.quantity,
                    price: p.price
                }))
            };

            if (isAdminOrManager && selectedAgent) {
                payload.agent_id = selectedAgent;
            }

            const { status, response } = await request('/orders', 'POST', JSON.stringify(payload));
            const data = await response.json();

            if (status === 200 && data.status) {
                toast.success(`Orden #${data.order.name} creada exitosamente`);
                if (onSuccess) onSuccess(data.order);
                handleClose();
            } else {
                toast.error(data.message || "Error al crear la orden");
            }

        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setClientName("");
        setPhonePrefix("0412");
        setPhoneNumber("");
        setClientProvince("");
        setClientAddress("");
        setSelectedAgent("");
        setProducts([]);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Crear Orden Manual</DialogTitle>
            <DialogContent>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>

                    {/* Sección Cliente */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Datos del Cliente</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Nombre Completo"
                                    fullWidth
                                    required
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                />
                            </Grid>

                            {/* Teléfono Dividido */}
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <FormControl sx={{ minWidth: 100 }}>
                                        <InputLabel>Prefijo</InputLabel>
                                        <Select
                                            value={phonePrefix}
                                            label="Prefijo"
                                            onChange={(e) => setPhonePrefix(e.target.value)}
                                        >
                                            {['0412', '0422', '0414', '0424', '0416', '0426'].map(p => (
                                                <MenuItem key={p} value={p}>{p}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        label="Número (7 dígitos)"
                                        fullWidth
                                        required
                                        value={phoneNumber}
                                        onChange={e => {
                                            // Allow only numbers and max 7 chars
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 7) setPhoneNumber(val);
                                        }}
                                        slotProps={{ htmlInput: { maxLength: 7, inputMode: 'numeric' } }}
                                    />
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>Provincia / Ciudad</InputLabel>
                                    <Select
                                        value={clientProvince}
                                        label="Provincia / Ciudad"
                                        onChange={(e) => setClientProvince(e.target.value)}
                                    >
                                        {cities.map((city: any) => (
                                            <MenuItem key={city.id} value={city.name}>
                                                {city.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Dirección Detallada"
                                    fullWidth
                                    value={clientAddress}
                                    onChange={e => setClientAddress(e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Sección Asignación (Solo Admin) */}
                    {isAdminOrManager && (
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Asignación</Typography>
                            <FormControl fullWidth size="small">
                                <InputLabel>Vendedora Asignada</InputLabel>
                                <Select
                                    label="Vendedora Asignada"
                                    value={selectedAgent}
                                    onChange={(e) => setSelectedAgent(e.target.value)}
                                >
                                    <MenuItem value="">-- Sin asignar (Nuevo) --</MenuItem>
                                    {agents.map((agent: any) => (
                                        <MenuItem key={agent.id} value={agent.id}>
                                            {agent.username || agent.name + ' ' + (agent.last_name || '')}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}

                    {/* Sección Productos */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" color="text.secondary">Productos</Typography>
                            <Button startIcon={<AddCircleOutline />} onClick={() => setOpenProductSearch(true)} size="small">
                                Agregar Producto
                            </Button>
                        </Box>

                        {products.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                No hay productos agregados
                            </Typography>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {products.map((p) => (
                                    <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body2" fontWeight="bold">{p.name || p.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">{p.sku}</Typography>
                                        </Box>

                                        <TextField
                                            label="Cant."
                                            type="number"
                                            size="small"
                                            sx={{ width: 80 }}
                                            value={p.quantity}
                                            onChange={(e) => handleQuantityChange(p.id, parseInt(e.target.value))}
                                        />

                                        <TextField
                                            label="Precio ($)"
                                            type="number"
                                            size="small"
                                            sx={{ width: 100 }}
                                            value={p.price}
                                            onChange={(e) => handlePriceChange(p.id, parseFloat(e.target.value))}
                                        />

                                        <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 60, textAlign: 'right' }}>
                                            {fmtMoney(p.price * p.quantity, 'USD')}
                                        </Typography>

                                        <IconButton size="small" color="error" onClick={() => handleRemoveProduct(p.id)}>
                                            <DeleteOutline />
                                        </IconButton>
                                    </Box>
                                ))}
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Total: {fmtMoney(calculateTotal(), 'USD')}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>

                </Box>
            </DialogContent>
            <DialogActions>
                <ButtonCustom variant="outlined" onClick={handleClose} disabled={loading}>Cancelar</ButtonCustom>
                <ButtonCustom variant="contained" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Orden'}
                </ButtonCustom>
            </DialogActions>

            <ProductSearchDialog
                open={openProductSearch}
                onClose={() => setOpenProductSearch(false)}
                onPick={handleAddProduct}
            />
        </Dialog>
    );
};
