import React, { useEffect, useState, useRef } from 'react';
import { Box, TextField, IconButton, Typography, CircularProgress, Paper, Button } from '@mui/material';
import { SendRounded } from '@mui/icons-material';
import { request } from '../../common/request';
import { toast } from 'react-toastify';
import { useSocketStore } from '../../store/sockets/SocketStore';
import { useUserStore } from '../../store/user/UserStore';

export const OrderWhatsApp = ({ orderId }: { orderId: number }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const user = useUserStore((s) => s.user);
    const echo = useSocketStore((s) => s.echo);

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

    useEffect(() => {
        if (orderId && orderId !== undefined) {
            fetchMessages(1);
        } else {
            setLoading(false);
        }

        // Real-time listener
        if (echo && orderId) {
            const channel = echo.private(getChannelName());

            channel.listen('WhatsappMessageReceived', (e: any) => {
                if (e.message.order_id === orderId) {
                    setMessages(prev => {
                        // Avoid duplicates if we were the sender and already added it
                        if (prev.some(m => m.id === e.message.id || (m.message_id && m.message_id === e.message.message_id))) {
                            return prev;
                        }
                        return [...prev, e.message];
                    });

                    // Scroll to bottom if we are at bottom or close to it
                    setTimeout(() => {
                        if (containerRef.current) {
                            containerRef.current.scrollTop = containerRef.current.scrollHeight;
                        }
                    }, 100);
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
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }


    return (
        <Paper elevation={0} sx={{
            display: 'flex', flexDirection: 'column', height: '600px',
            borderRadius: 4, bgcolor: 'background.paper', overflow: 'hidden',
            border: '1px solid', borderColor: 'divider'
        }}>
            {/* Messages Area */}
            <Box
                ref={containerRef}
                onScroll={handleScroll}
                sx={{
                    flex: 1, overflowY: 'auto', p: 2,
                    display: 'flex', flexDirection: 'column', gap: 1,
                    bgcolor: 'rgba(0,0,0,0.02)'
                }}
            >
                {loadingMore && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}

                {!loadingMore && hasMore && messages.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                        <Button size="small" variant="text" onClick={() => fetchMessages(page + 1, true)}>
                            Cargar anteriores
                        </Button>
                    </Box>
                )}

                {messages.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                        Aún no hay mensajes en esta orden.
                    </Typography>
                ) : (
                    messages.map((m, i) => (
                        <Box key={m.id || i} sx={{
                            alignSelf: m.is_from_client ? 'flex-start' : 'flex-end',
                            maxWidth: '75%',
                            bgcolor: m.is_from_client ? 'background.paper' : '#e0f7fa',
                            color: 'text.primary',
                            p: 1.5,
                            borderRadius: 2,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            borderTopLeftRadius: m.is_from_client ? 0 : 8,
                            borderTopRightRadius: !m.is_from_client ? 0 : 8
                        }}>
                            <Typography variant="body1">{m.body}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                                {new Date(m.created_at || m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                        </Box>
                    ))
                )}
            </Box>

            {/* Quick Replies */}
            <Box sx={{ p: 1, display: 'flex', gap: 1, overflowX: 'auto', borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                {quickReplies.map((qr, i) => (
                    <Button
                        key={i}
                        size="small"
                        variant="outlined"
                        onClick={() => handleQuickReply(qr.text)}
                        sx={{
                            whiteSpace: 'nowrap', borderRadius: 20, textTransform: 'none',
                            fontSize: '0.75rem', py: 0.5, px: 2,
                            borderColor: 'primary.main', color: 'primary.main',
                            '&:hover': { bgcolor: 'primary.light', color: 'white' }
                        }}
                    >
                        {qr.label}
                    </Button>
                ))}
            </Box>

            {/* Input Area */}
            <Box component="form" onSubmit={handleSend} sx={{
                p: 2, borderTop: '1px solid', borderColor: 'divider',
                display: 'flex', gap: 1, bgcolor: 'background.paper'
            }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Escribe un mensaje de WhatsApp..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sending}
                />
                <IconButton type="submit" color="primary" disabled={sending || !input.trim()}>
                    <SendRounded />
                </IconButton>
            </Box>
        </Paper>
    );
};
