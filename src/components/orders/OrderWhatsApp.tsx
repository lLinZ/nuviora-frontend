import React, { useEffect, useState, useRef } from 'react';
import { Box, TextField, IconButton, Typography, CircularProgress, Paper, Button } from '@mui/material';
import { SendRounded, AutoAwesomeRounded, AttachFileRounded, WhatsApp as WhatsAppIcon, VerifiedRounded } from '@mui/icons-material';
import { request } from '../../common/request';
import { toast } from 'react-toastify';
import { useSocketStore } from '../../store/sockets/SocketStore';
import { useUserStore } from '../../store/user/UserStore';
import { Avatar, Badge, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, ListItemButton, Divider } from '@mui/material';
import { useOrdersStore } from '../../store/orders/OrdersStore';


export const OrderWhatsApp = ({ orderId }: { orderId: number }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);

    const user = useUserStore((s) => s.user);
    const echo = useSocketStore((s) => s.echo);
    const { selectedOrder: order, updateOrderInColumns } = useOrdersStore();



    // Container ref to control scroll position
    const containerRef = useRef<HTMLDivElement>(null);

    // Dynamic channel name based on user role
    const getChannelName = () => {
        if (['Admin', 'Gerente', 'Master'].includes(user.role?.description || '')) {
            return 'orders';
        }
        if (user.role?.description === 'Agencia') return `orders.agency.${user.id}`;
        if (user.role?.description === 'Vendedor') return `orders.agent.${user.id}`;
        if (user.role?.description === 'Repartidor') return `orders.deliverer.${user.id}`;
        return 'orders';
    };

    const fetchMessages = async (pageNumber: number, isLoadMore = false) => {
        if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        try {
            const { status, response } = await request(`/orders/${orderId}/whatsapp-messages?page=${pageNumber}&per_page=20`, 'GET');
            if (status === 200) {
                const data = await response.json(); // Laravel pagination object

                // Because order in backend is desc, the array comes like [newest, older, oldest]
                // We want to reverse it before appending/prepending so newest is always at the bottom
                const fetchedMessages = data.data.reverse();

                if (isLoadMore) {
                    // Remember old scroll height
                    const container = containerRef.current;
                    const oldScrollHeight = container ? container.scrollHeight : 0;

                    // Add older messages to the top
                    setMessages(prev => [...fetchedMessages, ...prev]);

                    // Adjust scroll to maintain position relative to the older messages
                    setTimeout(() => {
                        if (container) {
                            const newScrollHeight = container.scrollHeight;
                            container.scrollTop = newScrollHeight - oldScrollHeight;
                        }
                    }, 10);
                } else {
                    setMessages(fetchedMessages);
                    // scroll to bottom on initial load
                    setTimeout(() => {
                        if (containerRef.current) {
                            containerRef.current.scrollTop = containerRef.current.scrollHeight;
                        }
                    }, 50);
                }

                // Keep track if there are more pages
                setHasMore(data.current_page < data.last_page);
                setPage(data.current_page);

            } else {
                toast.error('Error cargando mensajes de WhatsApp');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const markAsRead = async () => {
        if (!orderId) return;
        try {
            const { status } = await request(`/orders/${orderId}/read-whatsapp`, 'PUT');
            if (status === 200) {
                // Fetch fresh order to update unread counts everywhere
                const { status: ok, response } = await request(`/orders/${orderId}`, 'GET');
                if (ok) {
                    const data = await response.json();
                    updateOrderInColumns(data.order || data);
                }
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };


    useEffect(() => {
        if (orderId && orderId !== undefined) {
            fetchMessages(1);
            markAsRead();
        } else {
            setLoading(false);
        }

        // Real-time listener
        if (echo && orderId) {
            const channel = echo.private(getChannelName());

            channel.listen('WhatsappMessageReceived', (e: any) => {
                // If the message is from client
                if (e.message.is_from_client) {
                    // Show a notification if it's not the same order OR we are not active?
                    // For now, let's always show a notification if it belongs to this client/phone
                    // (Actually, maybe only show toast if it's a NEW message we haven't seen)
                    toast.info(`Nueva mensaje de WhatsApp de ${clientName || 'Cliente'}: "${e.message.body.substring(0, 30)}..."`, {
                        autoClose: 3000,
                        position: "top-right"
                    });
                }

                // If the message belongs to THIS client (even if it's a different order ID)
                if (e.message.client_id === order?.client_id) {
                    setMessages(prev => {
                        // Avoid duplicates if we were the sender and already added it
                        if (prev.some(m => m.id === e.message.id || (m.message_id && m.message_id === e.message.message_id))) {
                            return prev;
                        }
                        return [...prev, e.message];
                    });

                    // Since we have the chat OPEN, mark it as read immediately
                    if (e.message.is_from_client) {
                        markAsRead();
                    }

                    // Scroll to bottom

                    setTimeout(() => {
                        if (containerRef.current) {
                            containerRef.current.scrollTop = containerRef.current.scrollHeight;
                        }
                    }, 100);

                    // Mark as read immediately if chat is open
                    markAsRead();
                }
            });

            return () => {
                channel.stopListening('WhatsappMessageReceived');
            };
        }
    }, [orderId, echo]);


    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        // Si el usuario scrollea hasta arriba y hay más páginas
        if (target.scrollTop === 0 && hasMore && !loadingMore) {
            fetchMessages(page + 1, true);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim()) return;

        setSending(true);
        try {
            const body = new URLSearchParams();
            body.append('body', input.trim());
            // Since we are the user sending to client, is_from_client = false
            body.append('is_from_client', '0');

            const { status, response } = await request(`/orders/${orderId}/whatsapp-messages`, 'POST', body);
            if (status === 201) {
                const newMessage = await response.json();
                setMessages(prev => [...prev, newMessage]);
                setInput('');

                // Scroll al fondo al enviar
                setTimeout(() => {
                    if (containerRef.current) {
                        containerRef.current.scrollTop = containerRef.current.scrollHeight;
                    }
                }, 50);

            } else {
                toast.error('Error al enviar mensaje');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión');
        } finally {
            setSending(false);
        }
    };

    const quickReplies = [
        { label: 'Ubicación', text: 'Hola! Nos podrías enviar tu ubicación por favor para agendar la entrega?' },
        { label: 'Llamada no atendida', text: 'Hola! Intentamos llamarte para confirmar tu entrega pero no pudimos contactarte. Por favor avísanos cuando estés disponible.' },
        { label: 'Confirmar Mañana', text: 'Hola! Tu orden está agendada para mañana. ¿Estarás disponible para recibirla?' },
        { label: 'Transferencia', text: 'Hola! Recuerda que si vas a pagar por transferencia, debes enviarnos el comprobante por este medio. Gracias!' },
    ];

    const handleQuickReply = (text: string) => {
        setInput(text);
    };

    if (loading && messages.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
                <CircularProgress color="secondary" />
            </Box>
        );
    }

    const clientName = order?.client?.first_name ? `${order.client.first_name} ${order.client.last_name || ''}` : 'Cliente';
    const clientPhone = order?.client?.phone || '';

    return (
        <Paper elevation={0} sx={{
            display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px',
            borderRadius: { xs: 0, md: 4 }, bgcolor: '#0b141a', overflow: 'hidden',
            border: '1px solid', borderColor: 'rgba(255,255,255,0.05)',
            position: 'relative'
        }}>
            {/* Header */}
            <Box sx={{
                p: 2, bgcolor: '#202c33', display: 'flex', alignItems: 'center', gap: 2,
                borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10
            }}>
                <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    sx={{ '& .MuiBadge-badge': { bgcolor: '#25d366', width: 12, height: 12, borderRadius: '50%', border: '2px solid #202c33' } }}
                >
                    <Avatar sx={{ bgcolor: 'secondary.main', fontWeight: 'bold' }}>
                        {clientName.charAt(0)}
                    </Avatar>
                </Badge>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'white', lineHeight: 1.2 }}>
                        {clientName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        WhatsApp: {clientPhone}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(37, 211, 102, 0.1)', px: 1.5, py: 0.5, borderRadius: 2 }}>
                    <VerifiedRounded sx={{ fontSize: '0.9rem', color: '#25d366' }} />
                    <Typography variant="caption" fontWeight="bold" sx={{ color: '#25d366', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Official API
                    </Typography>
                </Box>
            </Box>

            {/* Messages Area */}
            <Box
                ref={containerRef}
                onScroll={handleScroll}
                sx={{
                    flex: 1, overflowY: 'auto', p: { xs: 2, md: 3 },
                    display: 'flex', flexDirection: 'column', gap: 1,
                    bgcolor: '#0b141a',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46-4c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm13-82c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46 44c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm44-18c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM4 66c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm18-50c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM5 28c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm14 78c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z'/%3E%3C/g%3E%3C/svg%3E")`,
                    '&::-webkit-scrollbar': { width: '6px' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }
                }}
            >
                {loadingMore && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={20} color="secondary" />
                    </Box>
                )}

                {!loadingMore && hasMore && messages.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                        <Button
                            size="small"
                            onClick={() => fetchMessages(page + 1, true)}
                            sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'none', fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.05)', px: 2, borderRadius: 20 }}
                        >
                            Cargar mensajes anteriores
                        </Button>
                    </Box>
                )}

                {messages.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                        <WhatsAppIcon sx={{ fontSize: 64, mb: 1 }} />
                        <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 500 }}>
                            Aún no hay mensajes en esta orden.
                        </Typography>
                    </Box>
                ) : (
                    messages.map((m, i) => {
                        const isSentByMe = !m.is_from_client;
                        const showTail = i === 0 || messages[i - 1].is_from_client !== m.is_from_client;

                        return (
                            <Box key={m.id || i} sx={{
                                alignSelf: isSentByMe ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                display: 'flex',
                                flexDirection: 'column',
                                mb: 0.2
                            }}>
                                <Box sx={{
                                    bgcolor: isSentByMe ? '#005c4b' : '#202c33',
                                    color: 'white',
                                    p: '6px 10px 8px 10px',
                                    borderRadius: '8px',
                                    borderTopRightRadius: (isSentByMe && showTail) ? 0 : '8px',
                                    borderTopLeftRadius: (!isSentByMe && showTail) ? 0 : '8px',
                                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                    position: 'relative',
                                    minWidth: '60px',
                                    '&::before': (isSentByMe && showTail) ? {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        right: -8,
                                        width: 0,
                                        height: 0,
                                        borderTop: '0px solid transparent',
                                        borderBottom: '10px solid transparent',
                                        borderLeft: '10px solid #005c4b',
                                    } : (!isSentByMe && showTail) ? {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: -8,
                                        width: 0,
                                        height: 0,
                                        borderTop: '0px solid transparent',
                                        borderBottom: '10px solid transparent',
                                        borderRight: '10px solid #202c33',
                                    } : {}
                                }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.9rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                                        {m.body}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mt: 0.2 }}>
                                        <Typography variant="caption" sx={{
                                            fontSize: '0.65rem', opacity: 0.6,
                                            fontWeight: 500, letterSpacing: 0.2
                                        }}>
                                            {new Date(m.created_at || m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                        {isSentByMe && (
                                            <Typography variant="caption" sx={{ color: '#53bdeb', fontSize: '0.8rem', fontWeight: 'black', mt: -0.2 }}>
                                                ✓✓
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })
                )}
            </Box>


            {/* Input Area */}
            <Box
                component="form"
                onSubmit={handleSend}
                sx={{
                    p: 1.5,
                    bgcolor: '#202c33',
                    display: 'flex', alignItems: 'center', gap: 1,
                    borderTop: '1px solid rgba(255,255,255,0.05)'
                }}
            >
                <IconButton
                    size="small"
                    onClick={() => setShowTemplates(true)}
                    sx={{ color: '#8696a0', '&:hover': { color: '#25d366', bgcolor: 'rgba(37, 211, 102, 0.1)' } }}
                >
                    <AutoAwesomeRounded />
                </IconButton>

                <IconButton
                    size="small"
                    sx={{ color: '#8696a0' }}
                >
                    <AttachFileRounded sx={{ transform: 'rotate(45deg)' }} />
                </IconButton>

                <TextField
                    fullWidth
                    size="small"
                    placeholder="Escribe un mensaje..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sending}
                    autoComplete="off"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            bgcolor: '#2a3942',
                            color: 'white',
                            borderRadius: 3,
                            '& fieldset': { border: 'none' },
                            '&:hover fieldset': { border: 'none' },
                            '&.Mui-focused fieldset': { border: 'none' },
                        }
                    }}
                />

                <IconButton
                    type="submit"
                    disabled={sending || !input.trim()}
                    sx={{
                        bgcolor: sending || !input.trim() ? 'transparent' : '#25d366',
                        color: sending || !input.trim() ? '#8696a0' : '#111b21',
                        '&:hover': { bgcolor: '#128c7e' },
                        transition: 'all 0.2s'
                    }}
                >
                    {sending ? <CircularProgress size={24} color="inherit" /> : <SendRounded />}
                </IconButton>
            </Box>

            {/* Templates Dialog */}
            <Dialog
                open={showTemplates}
                onClose={() => setShowTemplates(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        bgcolor: '#2a3942',
                        color: 'white',
                        maxWidth: '400px',
                        width: '100%'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    Plantillas de Respuesta
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <List sx={{ py: 0 }}>
                        {quickReplies.map((qr, i) => (
                            <React.Fragment key={i}>
                                <ListItem disablePadding>
                                    <ListItemButton
                                        onClick={() => {
                                            handleQuickReply(qr.text);
                                            setShowTemplates(false);
                                        }}
                                        sx={{ py: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                                    >
                                        <ListItemText
                                            primary={qr.label}
                                            secondary={qr.text}
                                            primaryTypographyProps={{ fontWeight: 'bold', color: 'secondary.main', mb: 0.5 }}
                                            secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' } }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                                {i < quickReplies.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}
                            </React.Fragment>
                        ))}
                    </List>
                </DialogContent>
                <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Button
                        fullWidth
                        onClick={() => setShowTemplates(false)}
                        sx={{ color: '#8696a0', textTransform: 'none' }}
                    >
                        Cerrar
                    </Button>
                </Box>
            </Dialog>
        </Paper>
    );
};

