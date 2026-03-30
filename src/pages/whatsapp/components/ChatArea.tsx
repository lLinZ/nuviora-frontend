import { FC, useEffect, useRef, useState } from "react";
import { Box, Typography, Avatar, IconButton, TextField, CircularProgress, Paper, Chip, Tooltip, Zoom } from "@mui/material";
import { SendRounded, AttachFileRounded, ArrowBackRounded, InfoRounded, MicRounded, StopRounded, DeleteRounded, ImageRounded, VideocamRounded } from "@mui/icons-material";
import { ContactData } from "../WhatsAppPage";
import { request } from "../../../common/request";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { useSocketStore } from "../../../store/sockets/SocketStore";

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
    media: any | null; // Changed to support object
    sent_at: string;
}

export const ChatArea: FC<ChatAreaProps> = ({ selectedContact, onRefreshContacts, onBack, onOpenContext }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { echo } = useSocketStore();

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
        // Logic to mark as read can be added here
    };

    useEffect(() => {
        if (selectedContact) {
            fetchMessages();
            markAsRead();
        } else {
            setMessages([]);
        }
    }, [selectedContact?.id]);

    // WebSocket: Escuchar mensajes en tiempo real para el chat ACTIVO
    useEffect(() => {
        if (!echo || !selectedContact) return;

        const channel = echo.private('whatsapp');
        
        channel.listen('WhatsappMessageReceived', (data: any) => {
            const { message } = data;
            if (!message) return;

            const client_id = message.client_id || (message.client ? message.client.id : null);
            
            // Solo añadir si el mensaje pertenece al cliente seleccionado
            if (client_id === selectedContact.id) {
                setMessages(prev => {
                    // Evitar duplicados (por ejemplo, si el socket llega antes del fetch o viceversa)
                    if (prev.find(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            }
        });

        return () => {
            channel.stopListening('WhatsappMessageReceived');
        };
    }, [echo, selectedContact?.id]);

    const renderMedia = (media: any) => {
        if (!media) return null;
        
        // Handle both old string and new object
        const mediaUrl = typeof media === 'string' ? media : media.link;
        if (!mediaUrl) return null;

        const url = mediaUrl.toLowerCase();
        
        // Video
        if (url.endsWith('.mp4') || url.endsWith('.webm') || (media.type === 'video')) {
            return (
                <Box sx={{ maxWidth: 320, width: '100%', mb: 1 }}>
                    <Box 
                        component="video" 
                        controls 
                        sx={{ 
                            width: '100%', 
                            maxHeight: 400, 
                            borderRadius: 2, 
                            bgcolor: '#000',
                            display: 'block' 
                        }}
                    >
                        <source src={mediaUrl} />
                    </Box>
                </Box>
            );
        }

        // Audio
        if (url.endsWith('.ogg') || url.endsWith('.mp3') || (media.type === 'audio')) {
            return (
                <Box sx={{ minWidth: { xs: 240, sm: 300 }, width: '100%', mb: 1 }}>
                    <Box component="audio" controls sx={{ width: '100%', height: 40 }}>
                        <source src={mediaUrl} />
                        Tu navegador no soporta audio.
                    </Box>
                </Box>
            );
        }

        // Image
        if (url.match(/\.(jpg|jpeg|png|gif|webp)$/) || (media.type === 'image')) {
            return (
                <Box 
                    component="img" 
                    src={mediaUrl} 
                    sx={{ 
                        maxWidth: 320, 
                        width: '100%', 
                        maxHeight: 400, 
                        objectFit: 'cover', 
                        borderRadius: 2, 
                        mb: 1, 
                        cursor: 'pointer' 
                    }}
                    onClick={() => window.open(mediaUrl, '_blank')}
                />
            );
        }

        // Fallback to link
        return (
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#000', textDecoration: 'underline', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>
                📦 Archivo Adjunto ({media.type || 'Archivo'})
            </a>
        );
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    // Auto-scroll solo cuando llegan mensajes nuevos
    useEffect(() => {
        scrollToBottom();
    }, [messages.length]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !selectedContact) return;

        setSending(true);
        const textToSend = inputText;
        setInputText("");

        try {
            const { status, response } = await request(`/whatsapp-conversations/${selectedContact.id}/messages`, 'POST', {
                body: textToSend
            });

            if (status) {
                const json = await response.json();
                setMessages(prev => [...prev, json]);
                onRefreshContacts();
            } else {
                toast.error("Error enviando mensaje");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        } finally {
            setSending(false);
        }
    };

    const handleUpload = async (file: File) => {
        if (!selectedContact) return;
        setUploading(true);
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const { status, response } = await request(`/whatsapp-conversations/${selectedContact.id}/media`, 'POST', formData);
            if (status) {
                const json = await response.json();
                setMessages(prev => [...prev, json]);
                onRefreshContacts();
            } else {
                const err = await response.json();
                toast.error(err.message || "Error subiendo archivo");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión al subir archivo");
        } finally {
            setUploading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
                const audioFile = new File([audioBlob], `voice-note-${Date.now()}.ogg`, { type: 'audio/ogg' });
                handleUpload(audioFile);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            toast.error("No se pudo acceder al micrófono");
        }
    };

    const stopRecording = (shouldSend = true) => {
        if (mediaRecorderRef.current && isRecording) {
            if (!shouldSend) {
                mediaRecorderRef.current.onstop = () => {
                    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
                };
            }
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(recordingIntervalRef.current);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <Box sx={{ flexGrow: 1, display: { xs: selectedContact ? 'flex' : 'none', md: 'flex' }, flexDirection: 'column', bgcolor: '#efeae2', position: 'relative', overflow: 'hidden' }}>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">{selectedContact.phone}</Typography>
                        <Chip 
                            label={selectedContact.is_window_open ? "Sesion Activa (24h)" : "Sesion Expirada"} 
                            color={selectedContact.is_window_open ? "success" : "default"} 
                            size="small" 
                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 'bold', opacity: 0.8 }} 
                        />
                    </Box>
                </Box>
                <IconButton onClick={onOpenContext} sx={{ display: { xs: 'block', lg: 'none' } }}>
                    <InfoRounded />
                </IconButton>
            </Paper>

            {/* Message Area */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {loading && messages.length === 0 ? (
                    <Box sx={{ alignSelf: 'center', m: 'auto' }}><CircularProgress size={30} /></Box>
                ) : (
                    messages.map((msg) => (
                        <Box 
                            key={msg.id}
                            sx={{
                                alignSelf: msg.is_from_client ? 'flex-start' : 'flex-end',
                                maxWidth: '85%',
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
                                        {renderMedia(msg.media)}
                                    </Box>
                                )}
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        whiteSpace: 'pre-wrap', 
                                        wordBreak: 'break-word',
                                        color: '#000' 
                                    }}
                                >
                                    {msg.body.split(/(https?:\/\/[^\s]+)/g).map((part, i) => (
                                        part.match(/^https?:\/\//) ? (
                                            <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>
                                                {part}
                                            </a>
                                        ) : part
                                    ))}
                                </Typography>
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'flex-end', 
                                        opacity: 0.6, 
                                        mt: 0.5, 
                                        fontSize: '0.65rem',
                                        color: '#000'
                                    }}
                                >
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
                {!selectedContact.is_window_open ? (
                    <Box sx={{ flexGrow: 1, p: 1, bgcolor: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            ⚠️ Ventana de 24h cerrada. El cliente debe escribir primero.
                        </Typography>
                    </Box>
                ) : isRecording ? (
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', bgcolor: 'action.hover', p: 0.5, px: 2, borderRadius: 10, gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                            <Box sx={{ width: 10, height: 10, bgcolor: 'error.main', borderRadius: '50%', animation: 'pulse-record 1s infinite', '@keyframes pulse-record': { '0%': { opacity: 1 }, '50%': { opacity: 0.3 }, '100%': { opacity: 1 } } }} />
                            <Typography variant="body2" fontWeight="bold">{formatDuration(recordingDuration)}</Typography>
                        </Box>
                        <IconButton color="error" onClick={() => stopRecording(false)}>
                            <DeleteRounded />
                        </IconButton>
                        <IconButton color="primary" onClick={() => stopRecording(true)} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
                            <SendRounded />
                        </IconButton>
                    </Box>
                ) : (
                    <>
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(file);
                                // Reset input
                                e.target.value = '';
                            }}
                            accept="image/*,video/*"
                        />
                        <Tooltip title="Adjuntar foto o video">
                            <IconButton color="default" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                {uploading ? <CircularProgress size={24} /> : <AttachFileRounded />}
                            </IconButton>
                        </Tooltip>
                        
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Escribe un mensaje aquí..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            sx={{ '& fieldset': { borderRadius: 4 } }}
                            disabled={uploading}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                        />

                        {inputText.trim() ? (
                            <IconButton color="primary" type="submit" disabled={sending}>
                                {sending ? <CircularProgress size={24} /> : <SendRounded />}
                            </IconButton>
                        ) : (
                            <Tooltip title="Enviar nota de voz">
                                <IconButton color="primary" onClick={startRecording} disabled={uploading}>
                                    <MicRounded />
                                </IconButton>
                            </Tooltip>
                        )}
                    </>
                )}
            </Paper>
        </Box>
    );
};
