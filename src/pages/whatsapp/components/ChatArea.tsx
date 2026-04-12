import { FC, useEffect, useRef, useState } from "react";
import { Box, Typography, Avatar, IconButton, TextField, CircularProgress, Paper, Chip, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemButton, ListItemText, Divider, Stack, Alert } from "@mui/material";
import { SendRounded, AttachFileRounded, ArrowBackRounded, InfoRounded, MicRounded, DeleteRounded, VerifiedRounded, MessageRounded } from "@mui/icons-material";
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

interface ITemplate {
    id: number;
    name: string;
    label: string;
    body: string;
    is_official: boolean;
    meta_components?: any[];
}

// Extract {{1}}, {{2}} etc. from template strings
const extractVars = (textOrTpl: string | ITemplate): string[] => {
    let allText = '';
    if (typeof textOrTpl === 'string') {
        allText = textOrTpl;
    } else {
        // If it's a template object, check body AND components (header, body etc)
        allText = textOrTpl.body;
        if (textOrTpl.meta_components) {
            textOrTpl.meta_components.forEach(c => {
                if (c.text) allText += ' ' + c.text;
            });
        }
    }
    const matches = allText.match(/\{\{\d+\}\}/g) || [];
    const nums = [...new Set(matches.map(m => m.replace(/\D/g, '')))].sort((a, b) => +a - +b);
    return nums;
};

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

    // Template picker state
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [templates, setTemplates] = useState<ITemplate[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ITemplate | null>(null);
    const [templateVars, setTemplateVars] = useState<Record<string, string>>({});

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
        if (!selectedContact) return;
        try {
            await request(`/whatsapp-conversations/${selectedContact.id}/read`, 'POST');
            // Notify parent to refresh list if needed or simply let real-time updates handle it
        } catch (error) {
            console.error("Error marking as read", error);
        }
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
        
        console.log("Subscribed to whatsapp private channel for client", selectedContact.id);

        channel.listen('WhatsappMessageReceived', (data: any) => {
            const { message } = data;
            if (!message) return;

            console.log("Real-time Message Received in ChatArea:", message);

            const client_id = message.client_id || (message.client ? message.client.id : null);
            
            // Solo añadir si el mensaje pertenece al cliente seleccionado
            // Usamos == para evitar problemas de string vs number
            if (client_id == selectedContact.id) {
                console.log("Match! Updating messages list.");
                setMessages(prev => {
                    // Evitar duplicados
                    if (prev.find(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
                
                // Marcar como leído si estamos en la ventana del chat
                markAsRead();
            }
        });

        return () => {
            console.log("Unsubscribing from whatsapp channel");
            channel.stopListening('WhatsappMessageReceived');
        };
    }, [echo, selectedContact?.id]);

    const renderMedia = (media: any) => {
        if (!media) return null;
        
        // Handle both old string and new object
        const mediaUrl = typeof media === 'string' ? media : media.link;
        if (!mediaUrl) return null;

        // Strip query params for extension detection (e.g. CDN signed URLs)
        const urlLower = mediaUrl.toLowerCase().split('?')[0];
        const mediaType = typeof media === 'string' ? 'unknown' : (media.type || 'unknown');

        // Detect sticker first (before video — .webp stickers would otherwise fall through to image)
        const isSticker = mediaType === 'sticker' || urlLower.includes('wa_sticker_') || urlLower.endsWith('.webp');

        // Detect video by explicit type OR common extensions OR webhook filename prefix
        const isVideo = !isSticker && (
            mediaType === 'video' ||
            urlLower.endsWith('.mp4') ||
            urlLower.endsWith('.webm') ||
            urlLower.endsWith('.mov') ||
            urlLower.endsWith('.3gp') ||
            urlLower.includes('wa_vid_')
        );

        // Detect audio (only if not sticker and not video)
        const isAudio = !isSticker && !isVideo && (
            mediaType === 'audio' || mediaType === 'voice' ||
            urlLower.endsWith('.ogg') ||
            urlLower.endsWith('.mp3') ||
            urlLower.endsWith('.wav') ||
            urlLower.endsWith('.m4a') ||
            urlLower.includes('wa_audio_') ||
            (urlLower.endsWith('.webm') && mediaType !== 'video')
        );

        if (isSticker) {
            return (
                <Box 
                    component="img" 
                    src={mediaUrl}
                    alt="Sticker"
                    onClick={() => window.open(mediaUrl, '_blank')}
                    sx={{ width: 150, height: 150, objectFit: 'contain', display: 'block', cursor: 'pointer', mb: 1, bgcolor: 'transparent' }}
                />
            );
        }

        if (isAudio) {
            return (
                <Box sx={{ minWidth: { xs: 260, sm: 300 }, width: '100%', mb: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2, p: 0.5 }}>
                    <Box component="audio" controls sx={{ width: '100%', height: 45, outline: 'none', display: 'block' }}>
                        <source src={mediaUrl} type={urlLower.endsWith('.m4a') ? "audio/mp4" : urlLower.endsWith('.wav') ? "audio/wav" : "audio/ogg"} />
                        Tu navegador no soporta audio.
                    </Box>
                </Box>
            );
        }

        if (isVideo) {
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

        // Default: Image
        if (mediaType === 'image' || urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/) || mediaType === 'unknown') {
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
                📦 Archivo Adjunto ({mediaType || 'Archivo'})
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

    // ─── Template Picker ────────────────────────────────────────────────────

    const handleOpenTemplates = async () => {
        setTemplatesLoading(true);
        setSelectedTemplate(null);
        setTemplateVars({});
        setTemplateDialogOpen(true);
        try {
            const { status, response } = await request('/whatsapp-templates', 'GET');
            if (status === 200) {
                const data = await response.json();
                setTemplates(data);
            }
        } finally {
            setTemplatesLoading(false);
        }
    };

    const handleSelectTemplate = (tpl: ITemplate) => {
        setSelectedTemplate(tpl);
        // Pre-fill vars: use client name for {{1}} by default
        const nums = extractVars(tpl);
        const defaults: Record<string, string> = {};
        if (nums[0]) defaults[nums[0]] = selectedContact?.name?.split(' ')[0] ?? '';
        setTemplateVars(defaults);
    };

    const buildPreview = (tpl: ITemplate, vars: Record<string, string>) => {
        let full = '';
        const header = tpl.meta_components?.find((c: any) => c.type === 'HEADER')?.text;
        if (header) {
            full += header.replace(/\{\{(\d+)\}\}/g, (_: string, num: string) => vars[num] ? `*${vars[num]}*` : `{{${num}}}`) + '\n\n';
        }
        full += tpl.body.replace(/\{\{(\d+)\}\}/g, (_: string, num: string) => vars[num] ? `*${vars[num]}*` : `{{${num}}}`);
        return full;
    };

    const handleSendTemplate = async () => {
        if (!selectedTemplate || !selectedContact) return;
        setSending(true);
        try {
            const nums = extractVars(selectedTemplate);
            const vars = nums.map(n => templateVars[n] ?? '');
            const preview = buildPreview(selectedTemplate, templateVars);

            const payload: any = {
                body: preview,
            };

            if (selectedTemplate.is_official) {
                payload.template_name = selectedTemplate.name;
                payload.vars = vars;
            }

            const { status, response } = await request(
                `/whatsapp-conversations/${selectedContact.id}/messages`, 'POST', payload
            );

            if (status === 201 || status === 200) {
                const json = await response.json();
                setMessages(prev => [...prev, json]);
                onRefreshContacts();
                setTemplateDialogOpen(false);
                setSelectedTemplate(null);
            } else {
                const err = await response.json();
                toast.error(err.message || 'Error enviando plantilla');
            }
        } catch (err) {
            toast.error('Error de conexión');
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
            
            // Buscar un tipo de MIME compatible con WhatsApp
            const mimeTypes = ['audio/ogg; codecs=opus', 'audio/mp4', 'audio/aac', 'audio/mpeg'];
            const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
            
            const options = supportedMimeType ? { mimeType: supportedMimeType } : {};
            const mediaRecorder = new MediaRecorder(stream, options);
            
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const mimeType = supportedMimeType || 'audio/ogg';
                const extension = mimeType.includes('mp4') ? 'm4a' : 'ogg';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                const audioFile = new File([audioBlob], `voice-note-${Date.now()}.${extension}`, { type: mimeType });
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
                                    {(msg.body || '').split(/(https?:\/\/[^\s]+)/g).map((part, i) => (
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

            {/* Template Picker Dialog */}
            <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VerifiedRounded color="success" />
                    Enviar Plantilla de WhatsApp
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    {templatesLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                    ) : !selectedTemplate ? (
                        // Step 1: Pick a template
                        <List disablePadding>
                            {templates.length === 0 && (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography color="text.secondary">No hay plantillas registradas.</Typography>
                                </Box>
                            )}
                            {templates.map((tpl, i) => (
                                <Box key={tpl.id}>
                                    <ListItemButton onClick={() => handleSelectTemplate(tpl)} sx={{ py: 1.5, px: 3 }}>
                                        <Box sx={{ mr: 1.5, color: tpl.is_official ? 'secondary.main' : '#25d366' }}>
                                            {tpl.is_official ? <VerifiedRounded fontSize="small" /> : <MessageRounded fontSize="small" />}
                                        </Box>
                                        <ListItemText
                                            primary={<><strong>{tpl.label}</strong>{tpl.is_official && <Chip label="OFICIAL" size="small" color="secondary" sx={{ ml: 1, height: 18, fontSize: '0.6rem' }} />}</>}
                                            secondary={
                                                tpl.meta_components?.find((c: any) => c.type === 'HEADER')?.text 
                                                ? `${tpl.meta_components.find((c: any) => c.type === 'HEADER').text} | ${tpl.body}`.slice(0, 80) + '…'
                                                : (tpl.body.length > 80 ? tpl.body.slice(0, 80) + '…' : tpl.body)
                                            }
                                        />
                                    </ListItemButton>
                                    {i < templates.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </List>
                    ) : (
                        // Step 2: Fill variables
                        <Box sx={{ p: 3 }}>
                            <Button size="small" onClick={() => setSelectedTemplate(null)} sx={{ mb: 2 }}>← Volver</Button>
                            <Typography fontWeight="bold" sx={{ mb: 1 }}>{selectedTemplate.label}</Typography>

                            {extractVars(selectedTemplate).length > 0 && (
                                <Stack spacing={2} sx={{ mb: 2 }}>
                                    {extractVars(selectedTemplate).map(num => (
                                        <TextField
                                            key={num}
                                            label={`Variable {{${num}}}`}
                                            size="small"
                                            fullWidth
                                            value={templateVars[num] ?? ''}
                                            onChange={e => setTemplateVars(prev => ({ ...prev, [num]: e.target.value }))}
                                            helperText={num === '1' ? 'Normalmente el nombre del cliente' : undefined}
                                        />
                                    ))}
                                </Stack>
                            )}

                            <Alert severity="info" icon={false} sx={{ borderRadius: 2, fontStyle: 'italic', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                                Vista previa:<br />
                                {buildPreview(selectedTemplate, templateVars)}
                            </Alert>

                            {!selectedContact.is_window_open && selectedTemplate.is_official && (
                                <Alert severity="success" sx={{ mt: 1.5, borderRadius: 2, fontSize: 12 }}>
                                    ✅ Esta es una plantilla oficial — se puede enviar aunque la ventana de 24h esté cerrada.
                                </Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setTemplateDialogOpen(false)} color="inherit">Cancelar</Button>
                    {selectedTemplate && (
                        <Button
                            variant="contained"
                            onClick={handleSendTemplate}
                            disabled={sending}
                            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendRounded />}
                            sx={{ borderRadius: 2, bgcolor: '#25d366', '&:hover': { bgcolor: '#128c7e' } }}
                        >
                            Enviar Plantilla
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Input Form */}
            <Paper component="form" onSubmit={handleSend} elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 0, bgcolor: 'background.paper', zIndex: 2 }}>
                {!selectedContact.is_window_open ? (
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flexGrow: 1, p: 1, bgcolor: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 2, textAlign: 'center' }}>
                            <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                ⚠️ Ventana de 24h cerrada. Usa una plantilla oficial.
                            </Typography>
                        </Box>
                        <Tooltip title="Enviar plantilla oficial">
                            <IconButton onClick={handleOpenTemplates} sx={{ bgcolor: 'secondary.main', color: 'white', '&:hover': { bgcolor: 'secondary.dark' } }}>
                                <VerifiedRounded />
                            </IconButton>
                        </Tooltip>
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

                        <Tooltip title="Enviar plantilla">
                            <IconButton onClick={handleOpenTemplates} sx={{ color: 'secondary.main' }}>
                                <VerifiedRounded fontSize="small" />
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
