import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
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
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    AddRounded,
    EditRounded,
    DeleteRounded,
    AccountBalanceRounded,
    AccountBalanceWalletRounded,
    PaymentRounded,
    ContactlessRounded,
    SavingsRounded,
    CheckCircleRounded,
    CancelRounded,
    CopyAllRounded
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { request } from '../../common/request';
import { IResponse } from '../../interfaces/response-type';
import { ICompanyAccount, ICompanyAccountDetail } from '../../interfaces/company-account.types';
import { Loading } from '../../components/ui/content/Loading';
import { toast } from 'react-toastify';
import { useValidateSession } from '../../hooks/useValidateSession';

const ICON_OPTIONS = [
    { label: 'Banco', value: 'AccountBalanceRounded', icon: <AccountBalanceRounded /> },
    { label: 'Billetera', value: 'AccountBalanceWalletRounded', icon: <AccountBalanceWalletRounded /> },
    { label: 'Pago/Tarjeta', value: 'PaymentRounded', icon: <PaymentRounded /> },
    { label: 'Sin contacto', value: 'ContactlessRounded', icon: <ContactlessRounded /> },
    { label: 'Ahorros', value: 'SavingsRounded', icon: <SavingsRounded /> },
];

const IconRenderer = ({ iconName, color = 'inherit' }: { iconName: string | null, color?: any }) => {
    switch (iconName) {
        case 'AccountBalanceRounded': return <AccountBalanceRounded color={color} />;
        case 'AccountBalanceWalletRounded': return <AccountBalanceWalletRounded color={color} />;
        case 'PaymentRounded': return <PaymentRounded color={color} />;
        case 'ContactlessRounded': return <ContactlessRounded color={color} />;
        case 'SavingsRounded': return <SavingsRounded color={color} />;
        default: return <PaymentRounded color={color} />;
    }
};

export const CompanyAccounts: React.FC = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const [accounts, setAccounts] = useState<ICompanyAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<ICompanyAccount | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        icon: 'AccountBalanceRounded',
        is_active: true,
        details: [{ label: '', value: '' }] as ICompanyAccountDetail[]
    });

    useEffect(() => {
        if (isValid) {
            loadAccounts();
        }
    }, [isValid]);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request('/company-accounts', 'GET');
            if (status) {
                const data = await response.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar las cuentas');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (account: ICompanyAccount | null = null) => {
        if (account) {
            setSelectedAccount(account);
            setFormData({
                name: account.name,
                icon: account.icon || 'AccountBalanceRounded',
                is_active: account.is_active,
                details: account.details && account.details.length > 0 ? [...account.details] : [{ label: '', value: '' }]
            });
        } else {
            setSelectedAccount(null);
            setFormData({
                name: '',
                icon: 'AccountBalanceRounded',
                is_active: true,
                details: [{ label: '', value: '' }]
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedAccount(null);
    };

    const handleAddDetail = () => {
        setFormData({ ...formData, details: [...formData.details, { label: '', value: '' }] });
    };

    const handleRemoveDetail = (index: number) => {
        const newDetails = formData.details.filter((_, i) => i !== index);
        setFormData({ ...formData, details: newDetails.length > 0 ? newDetails : [{ label: '', value: '' }] });
    };

    const handleDetailChange = (index: number, field: 'label' | 'value', value: string) => {
        const newDetails = [...formData.details];
        newDetails[index][field] = value;
        setFormData({ ...formData, details: newDetails });
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('El nombre es obligatorio');
            return;
        }

        const filteredDetails = formData.details.filter(d => d.label.trim() && d.value.trim());

        const payload = {
            ...formData,
            details: filteredDetails
        };

        const method = selectedAccount ? 'PUT' : 'POST';
        const url = selectedAccount ? `/company-accounts/${selectedAccount.id}` : '/company-accounts';

        setLoading(true);
        try {
            const { status }: IResponse = await request(url, method, payload as any);
            if (status) {
                toast.success(selectedAccount ? 'Cuenta actualizada' : 'Cuenta creada');
                handleCloseDialog();
                loadAccounts();
            } else {
                toast.error('Error al guardar la cuenta');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar esta cuenta?')) return;

        setLoading(true);
        try {
            const { status }: IResponse = await request(`/company-accounts/${id}`, 'DELETE');
            if (status) {
                toast.success('Cuenta eliminada');
                loadAccounts();
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar la cuenta');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (account: ICompanyAccount) => {
        try {
            const { status }: IResponse = await request(`/company-accounts/${account.id}`, 'PUT', {
                ...account,
                is_active: !account.is_active
            } as any);
            if (status) {
                loadAccounts();
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <Box sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                    <Box sx={{ flex: 1 }}>
                        <DescripcionDeVista
                            title="Cuentas de la Empresa"
                            description="Gestiona los métodos de pago y cuentas bancarias que se muestran a los clientes."
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
                            boxShadow: 3,
                            height: 'fit-content'
                        }}
                    >
                        Nueva Cuenta
                    </Button>
                </Stack>

                {loading && accounts.length === 0 ? (
                    <Loading />
                ) : (
                    <Grid container spacing={3}>
                        {accounts.map((account) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={account.id}>
                                <Card
                                    sx={{
                                        borderRadius: 4,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: 6
                                        },
                                        opacity: account.is_active ? 1 : 0.7,
                                        border: '1px solid',
                                        borderColor: 'divider'
                                    }}
                                >
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Box sx={{
                                                    p: 1.5,
                                                    borderRadius: 3,
                                                    bgcolor: account.is_active ? 'primary.main' : 'action.disabledBackground',
                                                    color: 'white',
                                                    display: 'flex'
                                                }}>
                                                    <IconRenderer iconName={account.icon} />
                                                </Box>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {account.name}
                                                </Typography>
                                            </Stack>
                                            <Tooltip title={account.is_active ? "Activo" : "Inactivo"}>
                                                <Switch
                                                    checked={account.is_active}
                                                    onChange={() => handleToggleActive(account)}
                                                    color="success"
                                                />
                                            </Tooltip>
                                        </Stack>

                                        <Divider sx={{ my: 2 }} />

                                        <Stack spacing={1.5}>
                                            {account.details?.map((detail, idx) => (
                                                <Box key={idx}>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                        {detail.label}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {detail.value}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                                        <IconButton color="primary" onClick={() => handleOpenDialog(account)}>
                                            <EditRounded />
                                        </IconButton>
                                        <IconButton color="error" onClick={() => handleDelete(account.id)}>
                                            <DeleteRounded />
                                        </IconButton>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Create/Edit Dialog */}
                <Dialog
                    open={dialogOpen}
                    onClose={handleCloseDialog}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: { borderRadius: 4, p: 1 }
                    }}
                >
                    <DialogTitle sx={{ fontWeight: 'bold' }}>
                        {selectedAccount ? 'Editar Cuenta' : 'Nueva Cuenta de Pago'}
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField
                                label="Nombre de la Cuenta"
                                fullWidth
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Zelle, Banesco, Binance"
                            />

                            <FormControl fullWidth>
                                <InputLabel>Icono</InputLabel>
                                <Select
                                    value={formData.icon}
                                    label="Icono"
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                >
                                    {ICON_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                {opt.icon}
                                                <span>{opt.label}</span>
                                            </Stack>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Box>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    Detalles de la Cuenta
                                    <IconButton size="small" color="primary" onClick={handleAddDetail}>
                                        <AddRounded fontSize="small" />
                                    </IconButton>
                                </Typography>
                                <Stack spacing={2}>
                                    {formData.details.map((detail, index) => (
                                        <Stack direction="row" spacing={1} key={index} alignItems="center">
                                            <TextField
                                                label="Etiqueta"
                                                size="small"
                                                value={detail.label}
                                                onChange={(e) => handleDetailChange(index, 'label', e.target.value)}
                                                placeholder="Ej. Correo, Titular"
                                                sx={{ flex: 1 }}
                                            />
                                            <TextField
                                                label="Valor"
                                                size="small"
                                                value={detail.value}
                                                onChange={(e) => handleDetailChange(index, 'value', e.target.value)}
                                                placeholder="Ej. pagos@empresa.com"
                                                sx={{ flex: 2 }}
                                            />
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => handleRemoveDetail(index)}
                                                disabled={formData.details.length === 1 && index === 0}
                                            >
                                                <DeleteRounded fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Box>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                }
                                label="Cuenta Activa"
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={handleCloseDialog} color="inherit" sx={{ fontWeight: 'bold' }}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="contained"
                            disabled={loading}
                            sx={{
                                borderRadius: 3,
                                px: 4,
                                fontWeight: 'bold'
                            }}
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Layout>
    );
};
