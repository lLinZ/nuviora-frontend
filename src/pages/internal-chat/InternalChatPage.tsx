import { useEffect, useRef, useState } from "react";
import {
    Box, Typography, List, ListItemButton, ListItemText, Avatar, Divider, TextField,
    IconButton, CircularProgress, Badge, Dialog, DialogTitle, DialogContent, List as MuiList,
    ListItemButton as PickItem, Chip, Tooltip,
} from "@mui/material";
import { SendRounded, AddCommentRounded, PersonRounded } from "@mui/icons-material";
import dayjs from "dayjs";
import { toast } from "react-toastify";

import { Layout } from "../../components/ui/Layout";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { request } from "../../common/request";
import { useSocketStore } from "../../store/sockets/SocketStore";

interface Conversation {
    id: number;
    counterpart: { id: number; name: string } | null;
    vendedor: { id: number; name: string } | null;
    agency: { id: number; name: string } | null;
    last_message: { body: string; sender_id: number; created_at: string } | null;
    last_message_at: string | null;
    unread: number;
}

interface Message {
    id: number;
    sender_id: number;
    sender: { id: number; name: string } | null;
    body: string;
    order_id: number | null;
    read_at: string | null;
    created_at: string;
    mine?: boolean;
}

interface Contact {
    id: number;
    name: string;
}

export const InternalChatPage = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const echo = useSocketStore((s) => s.echo);
    const setSocket = useSocketStore((s) => s.setSocket);

    const isAdmin = ["Admin", "Gerente", "Master"].includes(user.role?.description ?? "");

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [input, setInput] = useState("");
    const [orderRef, setOrderRef] = useState("");
    const [sending, setSending] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<Conversation | null>(null);
    selectedRef.current = selected;

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    };

    // ── Carga inicial ─────────────────────────────────────────────
    const fetchConversations = async () => {
        const { ok, response } = await request("/internal-chat/conversations", "GET");
        if (ok) setConversations(await response.json());
    };

    const fetchContacts = async () => {
        const { ok, response } = await request("/internal-chat/contacts", "GET");
        if (ok) setContacts(await response.json());
    };

    useEffect(() => {
        if (!isValid) return;
        fetchConversations();
        if (!isAdmin) fetchContacts();
        if (!echo) setSocket();
    }, [isValid]);

    // ── Selección de hilo ─────────────────────────────────────────
    const openConversation = async (conv: Conversation) => {
        setSelected(conv);
        setLoadingMessages(true);
        const { ok, response } = await request(`/internal-chat/conversations/${conv.id}/messages`, "GET");
        setLoadingMessages(false);
        if (ok) {
            setMessages(await response.json());
            scrollToBottom();
            // Limpiar el contador local de no-leídos del hilo abierto
            setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)));
        } else {
            toast.error("No se pudieron cargar los mensajes");
        }
    };

    // ── WebSocket del hilo abierto ─────────────────────────────────
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
            // Marcar como leído lo recibido si no es mío
            if (msg.sender_id !== user.id) {
                request(`/internal-chat/conversations/${selectedRef.current?.id}/read`, "POST");
            }
        };

        channel.listen(".App\\Events\\InternalMessageSent", onMessage);
        channel.listen("InternalMessageSent", onMessage);

        return () => {
            echo.leave(channelName);
        };
    }, [echo, selected?.id]);

    // ── Canal personal: refrescar bandeja ante cualquier mensaje ──
    useEffect(() => {
        if (!echo || !user.id) return;
        const channelName = `App.Models.User.${user.id}`;
        const channel = echo.private(channelName);

        const onAny = (e: any) => {
            const msg = e?.message;
            // Si el mensaje no es del hilo abierto, refrescamos la bandeja para
            // actualizar último mensaje / no-leídos.
            if (!msg || selectedRef.current?.id !== msg.conversation_id) {
                fetchConversations();
            }
        };

        channel.listen(".App\\Events\\InternalMessageSent", onAny);
        channel.listen("InternalMessageSent", onAny);

        return () => {
            echo.leave(channelName);
        };
    }, [echo, user.id]);

    // ── Enviar ─────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (!selected || !input.trim() || sending) return;
        setSending(true);
        const body: any = { body: input.trim() };
        const ref = parseInt(orderRef, 10);
        if (!isNaN(ref)) body.order_id = ref;

        const { ok, response } = await request(
            `/internal-chat/conversations/${selected.id}/messages`,
            "POST",
            body
        );
        setSending(false);

        if (ok) {
            const msg = await response.json();
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            setInput("");
            setOrderRef("");
            scrollToBottom();
            fetchConversations();
        } else {
            const err = await response.json().catch(() => ({}));
            toast.error(err.message ?? "No se pudo enviar el mensaje");
        }
    };

    // ── Iniciar hilo nuevo ─────────────────────────────────────────
    const startChat = async (contact: Contact) => {
        setPickerOpen(false);
        const { ok, response } = await request("/internal-chat/conversations", "POST", {
            counterpart_id: contact.id,
        });
        if (!ok) {
            const err = await response.json().catch(() => ({}));
            toast.error(err.message ?? "No se pudo abrir el chat");
            return;
        }
        const conv = await response.json();
        await fetchConversations();
        openConversation({
            id: conv.id,
            counterpart: contact,
            vendedor: null,
            agency: null,
            last_message: null,
            last_message_at: null,
            unread: 0,
        });
    };

    const titleFor = (c: Conversation) => {
        if (isAdmin) return `${c.vendedor?.name ?? "?"} ↔ ${c.agency?.name ?? "?"}`;
        return c.counterpart?.name ?? "Conversación";
    };

    if (loadingSession) return <Loading />;
    if (!isValid) return null;

    return (
        <Layout noMargin>
            <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
                {/* ── Bandeja ────────────────────────────── */}
                <Box sx={{ width: 320, borderRight: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column" }}>
                    <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography variant="h6" fontWeight="bold">Chat interno</Typography>
                        {!isAdmin && (
                            <Tooltip title="Nuevo chat">
                                <IconButton color="primary" onClick={() => setPickerOpen(true)}>
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
                                    {isAdmin ? "No hay conversaciones." : "Inicia un chat con el botón +"}
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
                                    <Avatar sx={{ bgcolor: "primary.main" }}><PersonRounded /></Avatar>
                                </Badge>
                                <ListItemText
                                    primary={titleFor(c)}
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
                                <Avatar sx={{ bgcolor: "primary.main" }}><PersonRounded /></Avatar>
                                <Typography variant="subtitle1" fontWeight="bold">{titleFor(selected)}</Typography>
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
                                                    {m.order_id && (
                                                        <Chip size="small" label={`Pedido #${m.order_id}`} sx={{ mb: 0.5 }} />
                                                    )}
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

                            {/* Input — los admins observan; no escriben salvo intervención */}
                            <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", gap: 1, alignItems: "flex-end" }}>
                                <TextField
                                    size="small"
                                    sx={{ width: 130 }}
                                    label="Pedido # (opc.)"
                                    value={orderRef}
                                    onChange={(e) => setOrderRef(e.target.value.replace(/\D/g, ""))}
                                />
                                <TextField
                                    fullWidth
                                    multiline
                                    maxRows={4}
                                    size="small"
                                    placeholder="Escribe un mensaje…"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
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

            {/* ── Selector de contacto para nuevo hilo ── */}
            <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Iniciar chat</DialogTitle>
                <DialogContent dividers>
                    {contacts.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No hay contactos disponibles.
                        </Typography>
                    ) : (
                        <MuiList>
                            {contacts.map((ct) => (
                                <PickItem key={ct.id} onClick={() => startChat(ct)}>
                                    <Avatar sx={{ bgcolor: "primary.main", mr: 1.5 }}><PersonRounded /></Avatar>
                                    <ListItemText primary={ct.name} />
                                </PickItem>
                            ))}
                        </MuiList>
                    )}
                </DialogContent>
            </Dialog>
        </Layout>
    );
};
