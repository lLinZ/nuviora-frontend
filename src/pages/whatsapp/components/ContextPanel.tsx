import { FC } from "react";
import { Box, Typography, Button, Paper, Divider, Stack, Chip, Avatar } from "@mui/material";
import { ShoppingCartCheckoutRounded, OpenInNewRounded, ShoppingBagRounded } from "@mui/icons-material";
import { ContactData } from "../WhatsAppPage";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface ContextPanelProps {
    selectedContact: ContactData | null;
    isMobileDrawer?: boolean;
}

export const ContextPanel: FC<ContextPanelProps> = ({ selectedContact, isMobileDrawer = false }) => {
    const navigate = useNavigate();

    if (!selectedContact) {
        return <Box sx={{ width: 320, borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: { xs: 'none', lg: 'block' } }} />;
    }

    const { type, context, name, phone } = selectedContact;
    const isLead = type === 'lead' || !context.order;

    const handleConvertToOrder = () => {
        // Redirigir a vista de ordenes y pasar teléfono prellenado por state react-router
        navigate('/orders', { state: { createNewOrder: true, prefillPhone: phone, prefillName: name } });
    };

    return (
        <Box 
            sx={{ 
                width: isMobileDrawer ? '100%' : 320, 
                borderLeft: isMobileDrawer ? 'none' : '1px solid', 
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: isMobileDrawer ? 'flex' : { xs: 'none', lg: 'flex' },
                flexDirection: 'column',
                height: '100%'
            }}
        >
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Avatar 
                    sx={{ width: 80, height: 80, fontSize: '2rem', mx: 'auto', mb: 2, bgcolor: isLead ? 'secondary.main' : 'primary.main' }}
                >
                    {name.charAt(0)}
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                    {name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {phone}
                </Typography>
                
                <Chip 
                    label={isLead ? "Lead Huérfano" : "Cliente Activo"} 
                    color={isLead ? "secondary" : "success"}
                    variant="outlined"
                    size="small" 
                    sx={{ fontWeight: 'bold' }} 
                />
            </Box>

            <Divider />

            <Box sx={{ p: 3, flexGrow: 1 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold" sx={{ mb: 2, display: 'block' }}>
                    Acciones Comerciales
                </Typography>

                {isLead ? (
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 2, 
                            bgcolor: 'secondary.light', 
                            color: 'secondary.contrastText', 
                            textAlign: 'center',
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #f50057 0%, #ff4081 100%)'
                        }}
                    >
                        <ShoppingCartCheckoutRounded sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                            Potencial Venta
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, opacity: 0.8, fontSize: '0.75rem' }}>
                            Este cliente está esperando atención y no tiene una orden.
                        </Typography>
                        <Button 
                            variant="contained" 
                            color="inherit" 
                            fullWidth 
                            onClick={handleConvertToOrder}
                            endIcon={<OpenInNewRounded />}
                            sx={{ color: 'secondary.main', fontWeight: 'bold', bgcolor: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
                        >
                            Crear Nueva Orden
                        </Button>
                    </Paper>
                ) : (
                    <Box>
                        {context.order && (
                            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight="bold">
                                        Orden #{context.order.name}
                                    </Typography>
                                    <Chip 
                                        label={context.order.status?.description || 'Desconocido'} 
                                        size="small" 
                                        color="primary" 
                                    />
                                </Box>
                                <Typography variant="h4" fontWeight="bold" color="primary.main" sx={{ mb: 2 }}>
                                    ${context.order.current_total_price}
                                </Typography>
                                <Stack spacing={1}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" color="text.secondary">Fecha:</Typography>
                                        <Typography variant="caption" fontWeight="bold">{dayjs(context.order.created_at).format('DD/MM/YYYY')}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" color="text.secondary">Atendido por:</Typography>
                                        <Typography variant="caption" fontWeight="bold">{context.order.agent?.names || '...'}</Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        )}
                        <Button 
                            variant="outlined" 
                            fullWidth 
                            onClick={handleConvertToOrder} 
                            startIcon={<ShoppingBagRounded />}
                            sx={{ borderRadius: 3 }}
                        >
                            Ver en Tablero
                        </Button>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
