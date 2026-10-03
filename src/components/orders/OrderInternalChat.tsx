// src/components/orders/OrderInternalChat.tsx
// El chat interno de la orden (vendedora ↔ agencia), dentro de la ficha (Fran, 2026-10-02). Lo ven la
// vendedora y la agencia de la orden, la Líder de esa vendedora y el Admin. El hilo se crea con el primer
// mensaje (GET /internal-chat/orders/{id} no crea nada).
import { FC, useEffect, useRef, useState } from "react";
import {
    Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, TextField, Typography,
} from "@mui/material";
import { CloseRounded, OpenInNewRounded, SendRounded } from "@mui/icons-material";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { useUserStore } from "../../store/user/UserStore";

interface Message {
    id: number;
    sender_id: number;
    sender: { id: number; name: string } | null;
    body: string;
    created_at: string;
    mine?: boolean;
}

interface Thread {
    conversation_id: number | null;
    counterpart: { id: number; name: string } | null;
    messages: Message[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    orderId: number;
    orderName: string;
}

export const OrderInternalChat: FC<Props> = ({ open, onClose, orderId, orderName }) => {
    const user = useUserStore((s) => s.user);
    const echo = useSocketStore((s) => s.echo);
    const setSocket = useSocketStore((s) => s.setSocket);
    const [thread, setThread] = useState<Thread | null>(null);
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

    useEffect(() => {
        if (!open) return;
        if (!echo) setSocket();
        setLoading(true);
        setThread(null);
        request(`/internal-chat/orders/${orderId}`, "GET")
            .then(async ({ status, response }) => {
                const data = await response.json().catch(() => ({}));
                if (status >= 200 && status < 300) {
                    setThread(data);
                    scrollToBottom();
                } else {
                    toast.error(data.message ?? "No se pudo abrir el chat de la orden");
                }
            })
            .finally(() => setLoading(false));
    }, [open, orderId]);

    // En vivo: los mensajes nuevos del hilo
    const conversationId = thread?.conversation_id ?? null;
    useEffect(() => {
        if (!open || !echo || !conversationId) return;
        const name = `internal-chat.${conversationId}`;
        const channel = echo.private(name);
        const onMessage = (e: { message?: Message & { conversation_id: number } }) => {
            const msg = e?.message;
            if (!msg || msg.conversation_id !== conversationId) return;
            setThread((prev) => prev && !prev.messages.some((m) => m.id === msg.id)
                ? { ...prev, messages: [...prev.messages, { ...msg, mine: msg.sender_id === user.id }] }
                : prev);
            scrollToBottom();
            if (msg.sender_id !== user.id) request(`/internal-chat/conversations/${conversationId}/read`, "POST");
        };
        channel.listen(".App\\Events\\InternalMessageSent", onMessage);
        channel.listen("InternalMessageSent", onMessage);
        return () => { echo.leave(name); };
    }, [open, echo, conversationId]);

    const send = async () => {
        const body = input.trim();
        if (!body || sending || !thread) return;
        setSending(true);
        try {
            let id = thread.conversation_id;
            if (!id) {
                const opened = await request(`/internal-chat/orders/${orderId}/open`, "POST");
                const data = await opened.response.json().catch(() => ({}));
                if (opened.status < 200 || opened.status >= 300) {
                    toast.error(data.message ?? "No se pudo abrir el chat de la orden");
                    return;
                }
                id = data.id as number;
            }
            const { status, response } = await request(`/internal-chat/conversations/${id}/messages`, "POST", { body });
            const msg = await response.json().catch(() => ({}));
            if (status >= 200 && status < 300) {
                setThread((prev) => prev && {
                    ...prev,
                    conversation_id: id,
                    messages: prev.messages.some((m) => m.id === msg.id) ? prev.messages : [...prev.messages, msg],
                });
                setInput("");
                scrollToBottom();
            } else {
                toast.error(msg.message ?? "No se pudo enviar el mensaje");
            }
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { height: { xs: "100%", sm: "80vh" }, m: { xs: 0, sm: 2 }, maxHeight: { xs: "100%", sm: "80vh" } } }}>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>Chat interno · Orden {orderName}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {thread?.counterpart?.name ? `Con ${thread.counterpart.name}` : "Vendedora y agencia de la orden"}
                    </Typography>
                </Box>
                <IconButton size="small" title="Abrir en la pantalla de chats" onClick={() => window.open(`/internal-chat?order=${orderId}`, "_blank")}>
                    <OpenInNewRounded fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={onClose}><CloseRounded /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 1, bgcolor: "background.default", p: 2 }}>
                {loading ? (
                    <Box sx={{ alignSelf: "center", mt: 4 }}><CircularProgress size={28} /></Box>
                ) : !thread ? null : thread.messages.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center", mt: 4, textAlign: "center" }}>
                        Todavía no hay mensajes. Escribe el primero.
                    </Typography>
                ) : (
                    thread.messages.map((m) => {
                        const mine = m.mine ?? m.sender_id === user.id;
                        return (
                            <Box key={m.id} sx={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                                {!mine && (
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{m.sender?.name}</Typography>
                                )}
                                <Box sx={{
                                    px: 1.5, py: 1, borderRadius: 2, boxShadow: 1,
                                    bgcolor: mine ? "primary.main" : "background.paper",
                                    color: mine ? "primary.contrastText" : "text.primary",
                                }}>
                                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.7, display: "block", textAlign: "right" }}>
                                        {dayjs(m.created_at).format("DD/MM HH:mm")}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })
                )}
                <div ref={endRef} />
            </DialogContent>
            <Box sx={{ p: 1.5, display: "flex", gap: 1, alignItems: "flex-end" }}>
                <TextField
                    fullWidth multiline maxRows={4} size="small"
                    placeholder="Escribe un mensaje…"
                    value={input}
                    disabled={!thread}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                    }}
                />
                <IconButton color="primary" onClick={send} disabled={sending || !input.trim() || !thread}>
                    {sending ? <CircularProgress size={22} /> : <SendRounded />}
                </IconButton>
            </Box>
        </Dialog>
    );
};
