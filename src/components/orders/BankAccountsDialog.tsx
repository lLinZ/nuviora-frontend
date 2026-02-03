import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Typography,
    Box,
    Paper,
    Divider,
    useTheme,
    alpha
} from '@mui/material';
import { ContentCopyRounded, AccountBalanceRounded, CloseRounded } from '@mui/icons-material';
import { request } from '../../common/request';
import { toast } from 'react-toastify';

interface BankAccountsDialogProps {
    open: boolean;
    onClose: () => void;
}

interface Bank {
    id: number;
    name: string;
    code: string; // Will store the account number/details
    active: boolean;
}

export const BankAccountsDialog: React.FC<BankAccountsDialogProps> = ({ open, onClose }) => {
    const theme = useTheme();
    const [banks, setBanks] = useState<Bank[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchBanks();
        }
    }, [open]);

    const fetchBanks = async () => {
        setLoading(true);
        try {
            const { status, response } = await request('/banks', 'GET');
            if (status === 200) {
                const data = await response.json();
                setBanks(data);
            }
        } catch (e) {
            console.error("Error fetching banks", e);
            toast.error("Error al cargar cuentas bancarias");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado al portapapeles`);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3 }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            display: 'flex'
                        }}
                    >
                        <AccountBalanceRounded />
                    </Paper>
                    <Typography variant="h6" fontWeight="bold">
                        Cuentas Bancarias
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseRounded />
                </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 2 }}>
                {loading ? (
                    <Typography align="center" sx={{ py: 4, color: 'text.secondary' }}>Cargando...</Typography>
                ) : banks.length === 0 ? (
                    <Typography align="center" sx={{ py: 4, color: 'text.secondary' }}>No hay cuentas registradas</Typography>
                ) : (
                    <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {banks.map((bank) => (
                            <Paper
                                key={bank.id}
                                elevation={0}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: theme.palette.primary.main,
                                        bgcolor: alpha(theme.palette.primary.main, 0.02)
                                    }
                                }}
                            >
                                <ListItem alignItems="flex-start">
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                                {bank.name}
                                            </Typography>
                                        }
                                        secondary={
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '1.1rem', letterSpacing: 0.5, fontWeight: 'medium' }}>
                                                    {bank.code || 'Sin número de cuenta'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                    Click en el botón para copiar
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                    <ListItemSecondaryAction sx={{ top: '50%', transform: 'translateY(-50%)', right: 16 }}>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleCopy(bank.code, bank.name)}
                                            sx={{
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                color: theme.palette.primary.main,
                                                '&:hover': { bgcolor: theme.palette.primary.main, color: 'white' }
                                            }}
                                        >
                                            <ContentCopyRounded />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </Paper>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button onClick={onClose} fullWidth variant="contained" sx={{ borderRadius: 2 }}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
