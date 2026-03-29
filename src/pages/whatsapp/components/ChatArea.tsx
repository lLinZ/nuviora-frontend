import { FC, useEffect, useRef, useState } from "react";
import { Box, Typography, Avatar, IconButton, TextField, CircularProgress, Paper } from "@mui/material";
import { SendRounded, AttachFileRounded, ArrowBackRounded, InfoRounded } from "@mui/icons-material";
import { ContactData } from "../WhatsAppPage";
import { request } from "../../../common/request";
import dayjs from "dayjs";
import { toast } from "react-toastify";

interface ChatAreaProps {
    selectedContact: ContactData | null;
    onRefreshContacts: () => void;
    onBack?: () => void;
    onOpenContext?: () => void;
}

interface Message {
    id: number;
    body: string;
    is_from_client: boolean;
    status: string;
    media: string | null;
    sent_at: string;
}

export const ChatArea: FC<ChatAreaProps> = ({ selectedContact, onRefreshContacts, onBack, onOpenContext }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        if (!selectedContact) return;
        setLoading(true);
        try {
            const { status, response } = await request(`/whatsapp-conversations/${selectedContact.id}/messages`, 'GET');
            if (status) {
                const json = await response.json();
                setMessages(json);
                scrollToBottom();
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando mensajes");
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async () => {
        if (!selectedContact || selectedContact.unread_count === 0) return;
        // The API used for orders was /orders/{id}/read-whatsapp. 
        // We will need a centralized one or just rely on optimistic local clear for now.
        // onRefreshContacts(); 
    };

    useEffect(() => {
        if (selectedContact) {
            fetchMessages();
            markAsRead();
        } else {
            setMessages([]);
        }
    }, [selectedContact]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !selectedContact) return;

        setSending(true);
        const textToSend = inputText;
        setInputText("");

        // Optimistic ui update
        const tempMsg: Message = {
            id: Date.now(),
            body: textToSend,
            is_from_client: false,
            status: 'sending',
            media: null,
            sent_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const { status, response } = await request(`/whatsapp-conversations/${selectedContact.id}/messages`, 'POST', {
                body: textToSend,
                is_from_client: false
            });

            if (status) {
                const json = await response.json();
                setMessages(prev => prev.map(m => m.id === tempMsg.id ? json : m));
                onRefreshContacts();
            } else {
                toast.error("Error enviando");
                setMessages(prev => prev.filter(m => m.id !== tempMsg.id)); // revert
                setInputText(textToSend);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSending(false);
            scrollToBottom();
        }
    };

    if (!selectedContact) {
        return (
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
                <Paper elevation={0} sx={{ p: 4, borderRadius: 5, textAlign: 'center', bgcolor: 'transparent' }}>
                    <Typography variant="h5" fontWeight="bold" color="text.secondary">Nuviora Web</Typography>
                    <Typography variant="body1" color="text.disabled" sx={{ mt: 1 }}>
                        Selecciona un chat en la barra lateral para conversar.
                    </Typography>
                </Paper>
            </Box>
        );
    }

    return (
        <Box sx={{ flexGrow: 1, display: { xs: selectedContact ? 'flex' : 'none', md: 'flex' }, flexDirection: 'column', bgcolor: '#efeae2', position: 'relative' }}>
            {/* Header */}
            <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 0, zIndex: 2 }}>
                <IconButton onClick={onBack} sx={{ display: { xs: 'block', md: 'none' } }}>
                    <ArrowBackRounded />
                </IconButton>
                <Avatar sx={{ bgcolor: selectedContact.type === 'lead' ? 'secondary.main' : 'primary.main', fontWeight: 'bold' }}>
                    {selectedContact.name.charAt(0)}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{selectedContact.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{selectedContact.phone}</Typography>
                </Box>
                <IconButton onClick={onOpenContext} sx={{ display: { xs: 'block', lg: 'none' } }}>
                    <InfoRounded />
                </IconButton>
            </Paper>

            {/* Message Area */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {loading ? (
                    <Box sx={{ alignSelf: 'center', m: 'auto' }}><CircularProgress size={30} /></Box>
                ) : (
                    messages.map((msg) => (
                        <Box 
                            key={msg.id}
                            sx={{
                                alignSelf: msg.is_from_client ? 'flex-start' : 'flex-end',
                                maxWidth: '70%',
                                minWidth: 100,
                            }}
                        >
                            <Paper 
                                elevation={0}
                                sx={{ 
                                    p: 1.5, 
                                    pt: 1,
                                    bgcolor: msg.is_from_client ? 'white' : '#d9fdd3',
                                    borderRadius: 3,
                                    borderTopLeftRadius: msg.is_from_client ? 0 : 12,
                                    borderTopRightRadius: msg.is_from_client ? 12 : 0,
                                }}
                            >
                                {msg.media && (
                                    <Box sx={{ mb: 1, borderRadius: 2, overflow: 'hidden' }}>
                                        {/* Extremely basic media rendering just for layout demo */}
                                        <a href={msg.media} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                                            📦 Archivo Adjunto
                                        </a>
                                    </Box>
                                )}
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {msg.body}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'flex-end', opacity: 0.6, mt: 0.5, fontSize: '0.65rem' }}>
                                    {dayjs(msg.sent_at).format('HH:mm')} 
                                    {!msg.is_from_client && (
                                        <Box component="span" sx={{ ml: 0.5 }}>
                                            {msg.status === 'read' ? '✓✓' : (msg.status === 'sent' || msg.status === 'delivered' ? '✓' : '⌚')}
                                        </Box>
                                    )}
                                </Typography>
                            </Paper>
                        </Box>
                    ))
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input Form */}
            <Paper component="form" onSubmit={handleSend} elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 0, bgcolor: 'background.paper', zIndex: 2 }}>
                <IconButton color="default" disabled>
                    <AttachFileRounded />
                </IconButton>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Escribe un mensaje aquí..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    sx={{ '& fieldset': { borderRadius: 4 } }}
                />
                <IconButton color="primary" type="submit" disabled={!inputText.trim() || sending}>
                    {sending ? <CircularProgress size={24} /> : <SendRounded />}
                </IconButton>
            </Paper>
        </Box>
    );
};
