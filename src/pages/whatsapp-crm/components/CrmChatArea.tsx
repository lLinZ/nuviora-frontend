import { FC, useEffect, useRef, useState } from "react";
import {
    Box, Typography, Avatar, IconButton, TextField, CircularProgress,
    Paper, Chip, Tooltip, Button, Alert, Dialog, DialogTitle,
    DialogContent, DialogActions, List, ListItemButton, ListItemText, Divider,
    Stack, ClickAwayListener,
} from "@mui/material";
import {
    SendRounded, AttachFileRounded, ArrowBackRounded,
    VerifiedRounded, MicRounded, DeleteRounded, MessageRounded,
} from "@mui/icons-material";
import EmojiEmotionsRoundedIcon from "@mui/icons-material/EmojiEmotionsRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { request } from "../../../common/request";
import { CrmConversation } from "./CrmContactCard";
import { OrderDialog } from "../../../components/orders/OrderDialog";
import { LiteOrderDialog } from "../../lite/LiteOrderDialog";
import { useUserStore } from "../../../store/user/UserStore";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Message {
    id: number;
    body: string;
    is_from_client: boolean;
    status: string;
    media: any | null;
    sent_at: string;
    message_type: string;
}

interface ITemplate {
    id: number;
    name: string;
    label: string;
    body: string;
    is_official: boolean;
    meta_components?: any[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const extractVars = (tpl: ITemplate): string[] => {
    let allText = tpl.body;
    tpl.meta_components?.forEach((c) => { if (c.text) allText += " " + c.text; });
    const matches = allText.match(/\{\{\d+\}\}/g) || [];
    const nums = [...new Set(matches.map((m) => m.replace(/\D/g, "")))].sort((a, b) => +a - +b);
    return nums;
};

const buildPreview = (tpl: ITemplate, vars: Record<string, string>) => {
    let full = "";
    const header = tpl.meta_components?.find((c: any) => c.type === "HEADER")?.text;
    if (header) full += header.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => vars[n] ? `*${vars[n]}*` : `{{${n}}}`) + "\n\n";
    full += tpl.body.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => vars[n] ? `*${vars[n]}*` : `{{${n}}}`);
    return full;
};

const renderMedia = (media: any) => {
    if (!media) return null;
    const mediaUrl = typeof media === "string" ? media : media.link;
    if (!mediaUrl) return null;
    const urlLower = mediaUrl.toLowerCase().split("?")[0];
    const mType = typeof media === "string" ? "unknown" : (media.type || "unknown");
    const isAudio = mType === "audio" || mType === "voice" || urlLower.match(/\.(ogg|mp3|wav|m4a)$/);
    const isVideo = mType === "video" || urlLower.match(/\.(mp4|webm|mov|3gp)$/);
    const isPdf = urlLower.endsWith(".pdf");
    const isImage = mType === "image" || urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/);

    if (isAudio) return <Box component="audio" controls sx={{ width: "100%", height: 45 }}><source src={mediaUrl} /></Box>;
    if (isVideo) return <Box component="video" controls sx={{ width: "100%", maxHeight: 300, borderRadius: 2 }}><source src={mediaUrl} /></Box>;
    if (isPdf) return <Box onClick={() => window.open(mediaUrl, "_blank")} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, borderRadius: 2, bgcolor: "rgba(0,0,0,0.06)", cursor: "pointer" }}>📄 <Typography variant="caption">Documento PDF — Click para abrir</Typography></Box>;
    if (isImage) return <Box component="img" src={mediaUrl} sx={{ maxWidth: 280, width: "100%", borderRadius: 2, cursor: "pointer" }} onClick={() => window.open(mediaUrl, "_blank")} />;
    return <a href={mediaUrl} target="_blank" rel="noopener noreferrer">📦 Archivo adjunto</a>;
};

// ── Componente principal ─────────────────────────────────────────────────────
interface Props {
    selected: CrmConversation | null;
    incomingMessage: any;
    onRefresh: () => void;
    onBack: () => void;
}

export const CrmChatArea: FC<Props> = ({ selected, incomingMessage, onRefresh, onBack }) => {
    const isLite = useUserStore((s) => s.user.is_lite_view);

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);

    // Grabación de voz
    const [isRecording, setIsRecording] = useState(false);
    const [recDuration, setRecDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recIntervalRef = useRef<any>(null);

    // Order dialog
    const [orderOpen, setOrderOpen] = useState(false);

    // Template picker
    const [tplOpen, setTplOpen] = useState(false);
    const [templates, setTemplates] = useState<ITemplate[]>([]);
    const [tplLoading, setTplLoading] = useState(false);
    const [selectedTpl, setSelectedTpl] = useState<ITemplate | null>(null);
    const [tplVars, setTplVars] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

    // ── Carga de mensajes ────────────────────────────────────────────────────
    const fetchMessages = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            const { status, response } = await request(`/whatsapp-crm/conversations/${selected.client_id}/messages`, "GET");
            if (status === 200) {
                const json = await response.json();
                setMessages(Array.isArray(json) ? json : []);
                scrollToBottom();
            }
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async () => {
        if (!selected) return;
        await request(`/whatsapp-crm/conversations/${selected.client_id}/read`, "POST");
    };

    useEffect(() => {
        if (selected) { fetchMessages(); markAsRead(); }
        else { setMessages([]); }
    }, [selected?.client_id]);

    // Mensaje entrante en tiempo real
    useEffect(() => {
        if (!incomingMessage) return;
        setMessages((prev) => prev.find((m) => m.id === incomingMessage.id) ? prev : [...prev, incomingMessage]);
        markAsRead();
        scrollToBottom();
    }, [incomingMessage]);

    useEffect(() => { scrollToBottom(); }, [messages.length]);

    // ── Mover bucket ─────────────────────────────────────────────────────────
    const handleMoveBucket = async (bucket: string) => {
        if (!selected) return;
        const { status } = await request(`/whatsapp-crm/conversations/${selected.client_id}/move`, "POST", { bucket });
        if (status === 200) { toast.success(`Chat movido a ${bucket === "closed" ? "Cerrados" : "Seguimiento"}`); onRefresh(); }
    };

    // ── Enviar texto ─────────────────────────────────────────────────────────
    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !selected) return;
        setSending(true);
        const text = inputText;
        setInputText(""); setShowEmoji(false);
        try {
            const { status, response } = await request(`/whatsapp-crm/conversations/${selected.client_id}/messages`, "POST", { body: text });
            if (status === 201 || status === 200) {
                const json = await response.json();
                setMessages((prev) => [...prev, json]);
                onRefresh();
            } else { toast.error("Error enviando mensaje"); }
        } finally { setSending(false); }
    };

    // ── Subir archivo ────────────────────────────────────────────────────────
    const handleUpload = async (file: File) => {
        if (!selected) return;
        setUploading(true);
        const fd = new FormData(); fd.append("file", file);
        try {
            const { status, response } = await request(`/whatsapp-crm/conversations/${selected.client_id}/media`, "POST", fd);
            if (status === 201 || status === 200) {
                const json = await response.json(); setMessages((prev) => [...prev, json]); onRefresh();
            } else { const err = await response.json(); toast.error(err.message || "Error subiendo archivo"); }
        } finally { setUploading(false); }
    };

    // ── Grabación de voz ─────────────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr; audioChunksRef.current = [];
            mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mr.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/ogg" });
                handleUpload(new File([blob], `voice-${Date.now()}.ogg`, { type: "audio/ogg" }));
                stream.getTracks().forEach((t) => t.stop());
            };
            mr.start(); setIsRecording(true); setRecDuration(0);
            recIntervalRef.current = setInterval(() => setRecDuration((n) => n + 1), 1000);
        } catch { toast.error("No se pudo acceder al micrófono"); }
    };

    const stopRecording = (send = true) => {
        if (!mediaRecorderRef.current || !isRecording) return;
        if (!send) mediaRecorderRef.current.onstop = () => mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop(); setIsRecording(false); clearInterval(recIntervalRef.current);
    };

    // ── Plantillas ───────────────────────────────────────────────────────────
    const openTemplates = async () => {
        setTplLoading(true); setSelectedTpl(null); setTplVars({}); setTplOpen(true);
        try {
            const { status, response } = await request("/whatsapp-templates", "GET");
            if (status === 200) setTemplates(await response.json());
        } finally { setTplLoading(false); }
    };

    const handleSendTemplate = async () => {
        if (!selectedTpl || !selected) return;
        setSending(true);
        try {
            const nums = extractVars(selectedTpl);
            const vars = nums.map((n) => tplVars[n] ?? "");
            const preview = buildPreview(selectedTpl, tplVars);
            const payload: any = { body: preview };
            if (selectedTpl.is_official) { payload.template_name = selectedTpl.name; payload.vars = vars; }
            const { status, response } = await request(`/whatsapp-crm/conversations/${selected.client_id}/messages`, "POST", payload);
            if (status === 201 || status === 200) {
                const json = await response.json(); setMessages((prev) => [...prev, json]); onRefresh(); setTplOpen(false);
            } else { const e = await response.json(); toast.error(e.message || "Error enviando plantilla"); }
        } finally { setSending(false); }
    };

    // ── Emojis ───────────────────────────────────────────────────────────────
    const EMOJIS = ["😊","😂","❤️","😍","🙏","👏","🔥","✅","💪","🎉","😅","😭","🤔","👍","💯","🙌","😎","📦","🚀","⭐","⏰","📅","💵","💰","📢","👋","🤝","✔️","❌","⚠️"];

    // ── Pantalla vacía ───────────────────────────────────────────────────────
    if (!selected) {
        return (
            <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 1, bgcolor: "background.default" }}>
                <Typography variant="h6" color="text.secondary" fontWeight={700}>WhatsApp CRM v2</Typography>
                <Typography variant="body2" color="text.disabled">Selecciona un chat para comenzar</Typography>
            </Box>
        );
    }

    const isWindowOpen = selected.is_window_open;
    const orderId = selected.order?.id;

    return (
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", bgcolor: "#efeae2", overflow: "hidden" }}>

            {/* ── HEADER DEL CHAT ────────────────────────────────────────────── */}
            <Paper elevation={1} sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1.5, borderRadius: 0, zIndex: 2, flexShrink: 0 }}>
                <IconButton onClick={onBack} sx={{ display: { xs: "flex", md: "none" } }}>
                    <ArrowBackRounded />
                </IconButton>

                <Avatar sx={{ bgcolor: selected.is_lead ? "secondary.main" : "primary.main", fontWeight: 700, width: 38, height: 38, fontSize: "0.85rem" }}>
                    {selected.client_name.charAt(0).toUpperCase()}
                </Avatar>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>{selected.client_name}</Typography>
                        <Chip label={isWindowOpen ? "Sesión activa" : "24h vencida"} color={isWindowOpen ? "success" : "default"} size="small" sx={{ height: 16, fontSize: "0.55rem", fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">{selected.client_phone}</Typography>
                    {selected.order && (
                        <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                            · {selected.order.products_summary || selected.order.order_number}
                        </Typography>
                    )}
                </Box>

                {/* Acciones del header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                    {selected.conversation_bucket !== "follow_up" && (
                        <Button size="small" variant="outlined" onClick={() => handleMoveBucket("follow_up")} sx={{ fontSize: "0.65rem", borderRadius: 10, py: 0.2, px: 1, textTransform: "none", display: { xs: "none", lg: "flex" } }}>
                            Seguimiento
                        </Button>
                    )}
                    {selected.conversation_bucket !== "closed" && (
                        <Button size="small" variant="outlined" color="success" onClick={() => handleMoveBucket("closed")} sx={{ fontSize: "0.65rem", borderRadius: 10, py: 0.2, px: 1, textTransform: "none", display: { xs: "none", lg: "flex" } }}>
                            Cerrar
                        </Button>
                    )}
                    {/* BOTÓN VER ORDEN — la única diferencia lite/pro */}
                    {orderId && (
                        <Tooltip title={`Ver Orden #${selected.order?.order_number}`}>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<OpenInNewRoundedIcon fontSize="small" />}
                                onClick={() => setOrderOpen(true)}
                                sx={{ borderRadius: 2, fontSize: "0.7rem", textTransform: "none", py: 0.4, fontWeight: 700 }}
                            >
                                Orden
                            </Button>
                        </Tooltip>
                    )}
                </Box>
            </Paper>

            {/* ── ÁREA DE MENSAJES ───────────────────────────────────────────── */}
            <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 0.8 }}>
                {loading && messages.length === 0 ? (
                    <Box sx={{ m: "auto" }}><CircularProgress size={28} /></Box>
                ) : messages.map((msg) => (
                    <Box key={msg.id} sx={{ alignSelf: msg.is_from_client ? "flex-start" : "flex-end", maxWidth: "82%", minWidth: 80 }}>
                        <Paper elevation={0} sx={{ p: 1.2, bgcolor: msg.is_from_client ? "white" : "#d9fdd3", borderRadius: 3, borderTopLeftRadius: msg.is_from_client ? 0 : 12, borderTopRightRadius: msg.is_from_client ? 12 : 0 }}>
                            {msg.media && <Box sx={{ mb: 0.5 }}>{renderMedia(msg.media)}</Box>}
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#000", fontSize: "0.875rem" }}>
                                {(msg.body || "").split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                                    part.match(/^https?:\/\//) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#007bff" }}>{part}</a> : part
                                )}
                            </Typography>
                            <Typography variant="caption" sx={{ display: "flex", justifyContent: "flex-end", opacity: 0.55, fontSize: "0.62rem", mt: 0.3, color: "#000" }}>
                                {dayjs(msg.sent_at).format("HH:mm")}
                                {!msg.is_from_client && <Box component="span" sx={{ ml: 0.4 }}>{msg.status === "read" ? "✓✓" : msg.status === "sent" ? "✓" : "⌚"}</Box>}
                            </Typography>
                        </Paper>
                    </Box>
                ))}
                <div ref={bottomRef} />
            </Box>

            {/* ── INPUT AREA ─────────────────────────────────────────────────── */}
            <Paper component="form" onSubmit={handleSend} elevation={2} sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1, borderRadius: 0, flexShrink: 0 }}>
                {!isWindowOpen ? (
                    <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ flexGrow: 1, p: 1, bgcolor: "#fff3e0", border: "1px solid #ffe0b2", borderRadius: 2, textAlign: "center" }}>
                            <Typography variant="caption" color="warning.dark" fontWeight={700}>⚠️ Ventana de 24h cerrada. Usa una plantilla oficial.</Typography>
                        </Box>
                        <IconButton onClick={openTemplates} sx={{ bgcolor: "secondary.main", color: "white", "&:hover": { bgcolor: "secondary.dark" } }}>
                            <VerifiedRounded />
                        </IconButton>
                    </Box>
                ) : isRecording ? (
                    <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", bgcolor: "action.hover", p: 0.5, px: 2, borderRadius: 10, gap: 2 }}>
                        <Box sx={{ width: 8, height: 8, bgcolor: "error.main", borderRadius: "50%", animation: "blink 1s infinite", "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.2 } } }} />
                        <Typography variant="body2" fontWeight={700}>{Math.floor(recDuration / 60)}:{String(recDuration % 60).padStart(2, "0")}</Typography>
                        <Box sx={{ flexGrow: 1 }} />
                        <IconButton color="error" size="small" onClick={() => stopRecording(false)}><DeleteRounded /></IconButton>
                        <IconButton color="primary" size="small" onClick={() => stopRecording(true)} sx={{ bgcolor: "primary.main", color: "white" }}><SendRounded /></IconButton>
                    </Box>
                ) : (
                    <>
                        <input type="file" hidden ref={fileInputRef} accept="image/*,video/*,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
                        <Tooltip title="Adjuntar archivo">
                            <IconButton size="small" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                {uploading ? <CircularProgress size={20} /> : <AttachFileRounded fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Enviar plantilla">
                            <IconButton size="small" onClick={openTemplates} sx={{ color: "secondary.main" }}><VerifiedRounded fontSize="small" /></IconButton>
                        </Tooltip>

                        {/* Emoji picker */}
                        <ClickAwayListener onClickAway={() => setShowEmoji(false)}>
                            <Box sx={{ position: "relative" }}>
                                <IconButton size="small" onClick={() => setShowEmoji((v) => !v)} sx={{ color: showEmoji ? "primary.main" : "text.secondary" }}>
                                    <EmojiEmotionsRoundedIcon fontSize="small" />
                                </IconButton>
                                {showEmoji && (
                                    <Box sx={{ position: "absolute", bottom: 44, left: 0, zIndex: 1300, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 3, p: 1.5, boxShadow: 4, width: 260 }}>
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                            {EMOJIS.map((em) => (
                                                <Box key={em} onClick={() => { setInputText((p) => p + em); setShowEmoji(false); }} sx={{ fontSize: "1.3rem", cursor: "pointer", p: 0.3, borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}>{em}</Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </ClickAwayListener>

                        <TextField
                            fullWidth size="small" placeholder="Escribe un mensaje..."
                            value={inputText} onChange={(e) => setInputText(e.target.value)}
                            disabled={uploading}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
                            sx={{ "& fieldset": { borderRadius: 4 } }}
                        />
                        {inputText.trim() ? (
                            <IconButton color="primary" type="submit" disabled={sending}>
                                {sending ? <CircularProgress size={22} /> : <SendRounded />}
                            </IconButton>
                        ) : (
                            <IconButton color="primary" onClick={startRecording} disabled={uploading}>
                                <MicRounded />
                            </IconButton>
                        )}
                    </>
                )}
            </Paper>

            {/* ── TEMPLATE DIALOG ─────────────────────────────────────────────── */}
            <Dialog open={tplOpen} onClose={() => setTplOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                    <VerifiedRounded color="success" /> Enviar Plantilla
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    {tplLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
                    ) : !selectedTpl ? (
                        <List disablePadding>
                            {templates.length === 0 && <Box sx={{ p: 3, textAlign: "center" }}><Typography color="text.secondary">No hay plantillas registradas.</Typography></Box>}
                            {templates.map((tpl, i) => (
                                <Box key={tpl.id}>
                                    <ListItemButton onClick={() => { setSelectedTpl(tpl); const nums = extractVars(tpl); const defs: Record<string, string> = {}; if (nums[0]) defs[nums[0]] = selected?.client_name?.split(" ")[0] ?? ""; setTplVars(defs); }} sx={{ py: 1.5, px: 3 }}>
                                        <Box sx={{ mr: 1.5, color: tpl.is_official ? "secondary.main" : "#25d366" }}>{tpl.is_official ? <VerifiedRounded fontSize="small" /> : <MessageRounded fontSize="small" />}</Box>
                                        <ListItemText primary={tpl.label} secondary={tpl.body.slice(0, 80) + (tpl.body.length > 80 ? "…" : "")} />
                                    </ListItemButton>
                                    {i < templates.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </List>
                    ) : (
                        <Box sx={{ p: 3 }}>
                            <Button size="small" onClick={() => setSelectedTpl(null)} sx={{ mb: 2 }}>← Volver</Button>
                            <Typography fontWeight={700} sx={{ mb: 1 }}>{selectedTpl.label}</Typography>
                            {extractVars(selectedTpl).length > 0 && (
                                <Stack spacing={2} sx={{ mb: 2 }}>
                                    {extractVars(selectedTpl).map((num) => (
                                        <TextField key={num} label={`Variable {{${num}}}`} size="small" fullWidth value={tplVars[num] ?? ""} onChange={(e) => setTplVars((p) => ({ ...p, [num]: e.target.value }))} />
                                    ))}
                                </Stack>
                            )}
                            <Alert severity="info" icon={false} sx={{ borderRadius: 2, fontStyle: "italic", fontSize: 13, whiteSpace: "pre-wrap" }}>
                                Vista previa:{"\n"}{buildPreview(selectedTpl, tplVars)}
                            </Alert>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setTplOpen(false)} color="inherit">Cancelar</Button>
                    {selectedTpl && (
                        <Button variant="contained" onClick={handleSendTemplate} disabled={sending} startIcon={sending ? <CircularProgress size={14} color="inherit" /> : <SendRounded />} sx={{ bgcolor: "#25d366", "&:hover": { bgcolor: "#128c7e" }, borderRadius: 2 }}>
                            Enviar Plantilla
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* ── ORDER DIALOG — ÚNICA DIFERENCIA LITE / PRO ───────────────── */}
            {orderId && (
                isLite
                    ? <LiteOrderDialog id={orderId} open={orderOpen} setOpen={setOrderOpen} />
                    : <OrderDialog id={orderId} open={orderOpen} setOpen={setOrderOpen} />
            )}
        </Box>
    );
};
