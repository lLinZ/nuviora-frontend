import { useEffect, useRef, useState } from "react";
import {
    Box, Typography, List, ListItemButton, ListItemText, Avatar, Divider, TextField,
    IconButton, CircularProgress, Badge, Dialog, DialogTitle, DialogContent,
    InputAdornment, Chip, Tooltip,
} from "@mui/material";
import { SendRounded, AddCommentRounded, SearchRounded, ReceiptLongRounded, ArrowBackRounded } from "@mui/icons-material";
import { useSearchParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { toast } from "react-toastify";

import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { request } from "../../common/request";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { playNotificationSound } from "../../lib/sound";

interface Party { id: number; name: string }

interface Conversation {
    id: number;
    order: { id: number; name: string } | null;
    client: string | null;
    counterpart: Party | null;
    vendedor: Party | null;
    agency: Party | null;
    last_message: { body: string; sender_id: number; created_at: string } | null;
    last_message_at: string | null;
    unread: number;
}

interface Message {
    id: number;
    sender_id: number;
    sender: Party | null;
    body: string;
    read_at: string | null;
    created_at: string;
    mine?: boolean;
}

interface OrderResult {
    order_id: number;
    order_name: string;
    client: string | null;
    counterpart: Party | null;
    conversation_id: number | null;
}

export const InternalChatPage = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const echo = useSocketStore((s) => s.echo);
    const setSocket = useSocketStore((s) => s.setSocket);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const isAdmin = ["Admin", "Gerente", "Master"].includes(user.role?.description ?? "");
    const isLite = !!user.is_lite_view;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);

    // Buscador de órdenes
    const [pickerOpen, setPickerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<OrderResult[]>([]);
    const [searching, setSearching] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<Conversation | null>(null);
    selectedRef.current = selected;

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    };

    const fetchConversations = async () => {
        const { ok, response } = await request("/internal-chat/conversations", "GET");
        if (ok) setConversations(await response.json());
    };

    useEffect(() => {
        if (!isValid) return;
        fetchConversations();
        if (!echo) setSocket();
    }, [isValid]);

    // ── Abrir un hilo y cargar mensajes ───────────────────────────
    const openConversation = async (conv: Conversation) => {
        setSelected(conv);
        setLoadingMessages(true);
        const { ok, response } = await request(`/internal-chat/conversations/${conv.id}/messages`, "GET");
        setLoadingMessages(false);
        if (ok) {
            setMessages(await response.json());
            scrollToBottom();
            setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)));
        } else {
            toast.error("No se pudieron cargar los mensajes");
        }
    };

    // ── Abrir (o crear) el hilo de una orden ──────────────────────
    const openByOrderId = async (orderId: number) => {
        const { ok, response } = await request(`/internal-chat/orders/${orderId}/open`, "POST");
        if (!ok) {
            const err = await response.json().catch(() => ({}));
            toast.error(err.message ?? "No se pudo abrir el chat de la orden");
            return;
        }
        const conv = await response.json();
        await fetchConversations();
        openConversation({
            id: conv.id,
            order: conv.order,
            client: conv.client,
            counterpart: conv.counterpart,
            vendedor: null, agency: null,
            last_message: null, last_message_at: null, unread: 0,
        });
    };

    // ── Deep-link: /internal-chat?order=123 (botón en la orden) ────
    useEffect(() => {
        if (!isValid) return;
        const orderId = searchParams.get("order");
        if (orderId) {
            openByOrderId(parseInt(orderId, 10));
            searchParams.delete("order");
            setSearchParams(searchParams, { replace: true });
        }
    }, [isValid]);

    // ── Buscador de órdenes (debounced) ───────────────────────────
    useEffect(() => {
        if (!pickerOpen) return;
        setSearching(true);
        const t = setTimeout(async () => {
            const { ok, response } = await request(
                `/internal-chat/orders/search?q=${encodeURIComponent(searchTerm)}`, "GET"
            );
            setSearching(false);
            if (ok) setSearchResults(await response.json());
        }, 300);
        return () => clearTimeout(t);
    }, [searchTerm, pickerOpen]);

    const openPicker = () => {
        setSearchTerm("");
        setSearchResults([]);
        setPickerOpen(true);
    };

    // ── WebSocket del hilo abierto ────────────────────────────────
    useEffect(() => {
        if (!echo || !selected) return;
        const channelName = `internal-chat.${selected.id}`;
        const channel = echo.private(channelName);

        const onMessage = (e: any) => {
            const msg = e?.message;
            if (!msg || selectedRef.current?.id !== msg.conversation_id) return;
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, { ...msg, mine: msg.sender_id === user.id }];
            });
            scrollToBottom();
            if (msg.sender_id !== user.id) {
                playNotificationSound();
                request(`/internal-chat/conversations/${selectedRef.current?.id}/read`, "POST");
            }
        };

        channel.listen(".App\\Events\\InternalMessageSent", onMessage);
        channel.listen("InternalMessageSent", onMessage);
        return () => { echo.leave(channelName); };
    }, [echo, selected?.id]);

    // ── Canal personal: refrescar bandeja ─────────────────────────
    useEffect(() => {
        if (!echo || !user.id) return;
        const channelName = `App.Models.User.${user.id}`;
        const channel = echo.private(channelName);

        const onAny = (e: any) => {
            const msg = e?.message;
            // Mensaje de OTRO hilo (no el abierto): refrescar bandeja y sonar.
            if (!msg || selectedRef.current?.id !== msg.conversation_id) {
                if (msg && msg.sender_id !== user.id) playNotificationSound();
                fetchConversations();
            }
        };

        channel.listen(".App\\Events\\InternalMessageSent", onAny);
        channel.listen("InternalMessageSent", onAny);
        return () => { echo.leave(channelName); };
    }, [echo, user.id]);

    // ── Enviar ─────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (!selected || !input.trim() || sending) return;
        setSending(true);
        const { ok, response } = await request(
            `/internal-chat/conversations/${selected.id}/messages`, "POST", { body: input.trim() }
        );
        setSending(false);
        if (ok) {
            const msg = await response.json();
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            setInput("");
            scrollToBottom();
            fetchConversations();
        } else {
            const err = await response.json().catch(() => ({}));
            toast.error(err.message ?? "No se pudo enviar el mensaje");
        }
    };

    // ── Etiquetas ──────────────────────────────────────────────────
    const orderLabel = (c: Conversation) => (c.order?.name ? `Orden ${c.order.name}` : "Orden");
    const partyLabel = (c: Conversation) => {
        if (isAdmin) return `${c.vendedor?.name ?? "?"} ↔ ${c.agency?.name ?? "?"}`;
        return c.counterpart?.name ?? "";
    };

    if (loadingSession) return <Loading />;
    if (!isValid) return null;

    return (
        <Layout noMargin>
            <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
                {/* ── Bandeja ────────────────────────────── */}
                <Box sx={{ width: 340, borderRight: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column" }}>
                    <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            {isLite && (
                                <Tooltip title="Volver">
                                    <IconButton size="small" onClick={() => navigate("/orders")}>
                                        <ArrowBackRounded />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <Typography variant="h6" fontWeight="bold">Chat interno</Typography>
                        </Box>
                        {!isAdmin && (
                            <Tooltip title="Nuevo chat por orden">
                                <IconButton color="primary" onClick={openPicker}>
                                    <AddCommentRounded />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                    <Divider />
                    <List sx={{ overflowY: "auto", flex: 1, p: 0 }}>
                        {conversations.length === 0 && (
                            <Box sx={{ p: 4, textAlign: "center", opacity: 0.6 }}>
                                <Typography variant="body2" color="text.secondary">
                                    {isAdmin ? "No hay conversaciones." : "Busca una orden con el botón +"}
                                </Typography>
                            </Box>
                        )}
                        {conversations.map((c) => (
                            <ListItemButton
                                key={c.id}
                                selected={selected?.id === c.id}
                                onClick={() => openConversation(c)}
                                sx={{ gap: 1.5 }}
                            >
                                <Badge color="error" badgeContent={c.unread} overlap="circular">
                                    <Avatar sx={{ bgcolor: "primary.main" }}><ReceiptLongRounded /></Avatar>
                                </Badge>
                                <ListItemText
                                    primary={`${orderLabel(c)} · ${partyLabel(c)}`}
                                    secondary={c.last_message?.body ?? "Sin mensajes"}
                                    primaryTypographyProps={{ noWrap: true, fontWeight: c.unread ? "bold" : "normal" }}
                                    secondaryTypographyProps={{ noWrap: true }}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </Box>

                {/* ── Conversación ───────────────────────── */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
                    {!selected ? (
                        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
                            <Typography variant="h6" color="text.secondary">Selecciona una conversación</Typography>
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Avatar sx={{ bgcolor: "primary.main" }}><ReceiptLongRounded /></Avatar>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                                        {orderLabel(selected)} · {partyLabel(selected)}
                                    </Typography>
                                    {selected.client && (
                                        <Typography variant="caption" color="text.secondary">
                                            Cliente: {selected.client}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>

                            <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                                {loadingMessages ? (
                                    <Box sx={{ alignSelf: "center", mt: 4 }}><CircularProgress size={28} /></Box>
                                ) : (
                                    messages.map((m) => {
                                        const mine = m.mine ?? m.sender_id === user.id;
                                        return (
                                            <Box key={m.id} sx={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                                                {(isAdmin || !mine) && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                        {m.sender?.name}
                                                    </Typography>
                                                )}
                                                <Box sx={{
                                                    px: 1.5, py: 1, borderRadius: 2,
                                                    bgcolor: mine ? "primary.main" : "background.paper",
                                                    color: mine ? "primary.contrastText" : "text.primary",
                                                    boxShadow: 1,
                                                }}>
                                                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                                        {m.body}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ opacity: 0.7, display: "block", textAlign: "right" }}>
                                                        {dayjs(m.created_at).format("HH:mm")}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </Box>

                            <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", gap: 1, alignItems: "flex-end" }}>
                                <TextField
                                    fullWidth multiline maxRows={4} size="small"
                                    placeholder="Escribe un mensaje…"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                                    }}
                                />
                                <IconButton color="primary" onClick={sendMessage} disabled={sending || !input.trim()}>
                                    {sending ? <CircularProgress size={22} /> : <SendRounded />}
                                </IconButton>
                            </Box>
                        </>
                    )}
                </Box>
            </Box>

            {/* ── Buscador de órdenes para nuevo hilo ── */}
            <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Iniciar chat — busca una orden</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus fullWidth size="small" placeholder="Número de orden o cliente…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start"><SearchRounded /></InputAdornment>
                            ),
                        }}
                        sx={{ mb: 1 }}
                    />
                    {searching ? (
                        <Box sx={{ textAlign: "center", py: 3 }}><CircularProgress size={24} /></Box>
                    ) : searchResults.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No se encontraron órdenes asignadas.
                        </Typography>
                    ) : (
                        <List>
                            {searchResults.map((o) => (
                                <ListItemButton
                                    key={o.order_id}
                                    onClick={() => { setPickerOpen(false); openByOrderId(o.order_id); }}
                                >
                                    <Avatar sx={{ bgcolor: "primary.main", mr: 1.5 }}><ReceiptLongRounded /></Avatar>
                                    <ListItemText
                                        primary={`Orden ${o.order_name} · ${o.counterpart?.name ?? ""}`}
                                        secondary={o.client ?? undefined}
                                    />
                                    {o.conversation_id && <Chip size="small" color="success" label="Chat activo" />}
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                </DialogContent>
            </Dialog>
        </Layout>
    );
};
