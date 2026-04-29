import { useEffect, useRef, useState, useCallback } from "react";
import { Box, Paper, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";
import { Layout } from "../../components/ui/Layout";
import { request } from "../../common/request";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { useUserStore } from "../../store/user/UserStore";
import { CrmSidebar } from "./components/CrmSidebar";
import { CrmChatArea } from "./components/CrmChatArea";
import { CrmConversation } from "./components/CrmContactCard";

// ── helpers de notificación ──────────────────────────────────────────────────
function playPing() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch { /* silencio */ }
}

function showDesktopNotif(title: string, body: string) {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        const n = new Notification(title, { body, icon: "/favicon.ico", tag: "crm-v2" });
        setTimeout(() => n.close(), 5000);
    }
}

// ── Ordenar conversaciones: opcionalmente por bucket o estrictamente por fecha ──
function sortConversations(list: CrmConversation[], sortBy: "latency" | "unread"): CrmConversation[] {
    return [...list].sort((a, b) => {
        if (sortBy === "unread") {
            const BUCKET_P: Record<string, number> = { requires_attention: 1, follow_up: 2, closed: 3 };
            const pa = BUCKET_P[a.conversation_bucket] ?? 2;
            const pb = BUCKET_P[b.conversation_bucket] ?? 2;
            if (pa !== pb) return pa - pb;
            if (a.unread_count !== b.unread_count) return b.unread_count - a.unread_count;
        }
        
        // Orden de llegada (Latency) o fallback
        const dateA = new Date(a.last_message_at || 0).getTime();
        const dateB = new Date(b.last_message_at || 0).getTime();
        return dateB - dateA;
    });
}

type BucketFilter = "all" | "requires_attention" | "follow_up" | "closed";

export const WhatsAppCrmPage = () => {
    const [conversations, setConversations] = useState<CrmConversation[]>([]);
    const [selected, setSelected] = useState<CrmConversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [bucket, setBucket] = useState<BucketFilter>("all");
    const [agentId, setAgentId] = useState<string>("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [bucketCounts, setBucketCounts] = useState<Record<string, number>>({});
    const [incomingMessage, setIncomingMessage] = useState<any>(null);
    const [agents, setAgents] = useState<any[]>([]);
    const [sortBy, setSortBy] = useState<"latency" | "unread">("latency");

    const { echo } = useSocketStore();
    const user = useUserStore((s) => s.user);
    const isAdmin = ["Admin", "Manager", "Gerente", "Master"].includes(user?.role?.description ?? "");

    // Refs para evitar stale closures en el WebSocket
    const selectedRef = useRef<CrmConversation | null>(null);
    const bucketRef = useRef<BucketFilter>("all");
    const conversationsRef = useRef<CrmConversation[]>([]);
    const searchRef = useRef("");

    useEffect(() => { selectedRef.current = selected; }, [selected]);
    useEffect(() => { bucketRef.current = bucket; }, [bucket]);
    useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
    useEffect(() => { searchRef.current = searchTerm; }, [searchTerm]);

    // Solicitar permisos de notificación al montar
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Título de pestaña con badge de no leídos
    const totalUnread = bucketCounts.requires_attention ?? 0;
    useEffect(() => {
        document.title = totalUnread > 0 ? `(${totalUnread}) Mensajes — Nuviora` : "WhatsApp CRM — Nuviora";
        return () => { document.title = "Nuviora"; };
    }, [totalUnread]);

    // Fetch agentes (solo admins)
    useEffect(() => {
        if (!isAdmin) return;
        const loadAgents = async () => {
            try {
                const { status, response } = await request('/users/agents', 'GET');
                if (status === 200) {
                    const data = await response.json();
                    setAgents(Array.isArray(data) ? data : (data.data || []));
                }
            } catch (e) {
                console.error("Error fetching agents", e);
            }
        };
        loadAgents();
    }, [isAdmin]);

    // ── Fetch de conversaciones ───────────────────────────────────────────────
    const fetchConversations = useCallback(async (isLoadMore = false) => {
        const currentPage = isLoadMore ? page + 1 : 1;
        const params = new URLSearchParams({
            page: String(currentPage),
            bucket: bucket,
            search: searchTerm,
            sort_by: sortBy,
        });
        if (agentId) params.set("agent_id", agentId);

        try {
            const { status, response } = await request(`/whatsapp-crm/conversations?${params}`, "GET");
            if (status === 200) {
                const json = await response.json();
                const newItems: CrmConversation[] = json.data ?? [];

                setConversations((prev) => {
                    const merged = isLoadMore ? [...prev, ...newItems] : newItems;
                    
                    // Deduplicar por ID de cliente
                    const uniqueMap = new Map();
                    merged.forEach(c => uniqueMap.set(c.id || c.client_id, c));
                    const uniqueList = Array.from(uniqueMap.values());

                    // Si el chat activo está en la lista, mantener unread_count = 0
                    const updatedList = uniqueList.map((c) =>
                        selectedRef.current?.client_id === c.client_id
                            ? { ...c, unread_count: 0 }
                            : c
                    );
                    return sortConversations(updatedList, sortBy);
                });

                if (isLoadMore) setPage(currentPage);
                else setPage(1);

                setHasMore(!!json.next_page_url);
                if (json.bucket_counts) setBucketCounts(json.bucket_counts);

                // Actualizar el chat seleccionado si está en la respuesta
                if (selectedRef.current) {
                    const updated = newItems.find((c) => c.client_id === selectedRef.current!.client_id);
                    if (updated) setSelected((prev) => ({ ...prev!, ...updated, unread_count: 0 }));
                }
            }
        } catch (err) {
            console.error("Error fetching CRM conversations", err);
        } finally {
            setLoading(false);
        }
    }, [agentId, page, bucket, searchTerm, sortBy]);

    // ── Triggers de re-fetch ──────────────────────────────────────────────────
    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => fetchConversations(false), searchTerm ? 400 : 0);
        return () => clearTimeout(timer);
    }, [searchTerm, bucket, agentId, sortBy]);

    // ── WebSocket hub ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!echo) return;
        const channel = echo.private("whatsapp");

        // Estado de conexión
        const pusher = (echo as any).connector?.pusher;
        if (pusher) {
            pusher.connection.bind("connected", () => { setIsOffline(false); fetchConversations(false); });
            pusher.connection.bind("connecting", () => setIsOffline(true));
            pusher.connection.bind("disconnected", () => setIsOffline(true));
            pusher.connection.bind("unavailable", () => setIsOffline(true));
        }

        let refreshTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleRefresh = () => {
            if (refreshTimer) clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => fetchConversations(false), 1500);
        };

        channel.listen("WhatsappMessageReceived", (data: any) => {
            const { message } = data;
            if (!message) return;

            const clientId = message.client_id;
            if (!clientId) return;

            const isIncoming = message.message_type === "incoming_message";
            const isActiveChat = selectedRef.current?.client_id == clientId;

            // Filtrar mensajes que no me pertenecen (solo en cliente, el servidor ya filtra en fetch)
            const isAdmin = ["Admin", "Manager", "Gerente", "Master"].includes(user?.role?.description ?? "");
            const isMine = isAdmin
                || Number(message.agent_id) === Number(user?.id)
                || Number(message.order?.agent_id) === Number(user?.id)
                || conversationsRef.current.some((c) => c.client_id == clientId);
            if (!isMine) return;

            // Notificaciones
            if (isIncoming && !isActiveChat) {
                playPing();
                const name = message.client?.first_name || "Cliente";
                const preview = (message.body || "Nuevo mensaje").slice(0, 80);
                showDesktopNotif(`📩 ${name}`, preview);
                toast.info(`📩 ${name}: ${preview}`, { autoClose: 3500 });
            }

            // Actualización optimista
            setConversations((prev) => {
                const idx = prev.findIndex((c) => c.client_id == clientId);
                if (idx === -1) return prev; // El refresh lo traerá

                const cur = prev[idx];
                const newBucket = message.conversation_bucket ?? cur.conversation_bucket;
                const updated: CrmConversation = {
                    ...cur,
                    last_message: message.body ?? cur.last_message,
                    last_message_at: message.sent_at || new Date().toISOString(),
                    last_message_type: message.message_type ?? cur.last_message_type,
                    conversation_bucket: newBucket,
                    unread_count: isIncoming && !isActiveChat ? (cur.unread_count || 0) + 1 : cur.unread_count,
                };

                // Si hay filtro de bucket activo y el chat salió → removerlo
                const activeBucket = bucketRef.current;
                if (activeBucket !== "all" && newBucket !== activeBucket) {
                    return sortConversations(prev.filter((c) => c.client_id != clientId), sortBy);
                }
                return sortConversations(prev.map((c) => c.client_id == clientId ? updated : c), sortBy);
            });

            scheduleRefresh();

            // Pasar al área de chat activa
            if (isActiveChat) setIncomingMessage(message);
        });

        channel.listen("WhatsappChatRead", (data: any) => {
            const { client_id } = data;
            if (!client_id) return;
            setConversations((prev) =>
                prev.map((c) => c.client_id == client_id ? { ...c, unread_count: 0 } : c)
            );
        });

        return () => {
            channel.stopListening("WhatsappMessageReceived");
            channel.stopListening("WhatsappChatRead");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [echo]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSelect = (conv: CrmConversation) => {
        setConversations((prev) => prev.map((c) => c.client_id === conv.client_id ? { ...c, unread_count: 0 } : c));
        setIncomingMessage(null);
        setSelected(conv);
    };

    const handleLoadMore = () => fetchConversations(true);

    return (
        <Layout noMargin>
            <Paper elevation={0} sx={{ display: "flex", height: "100vh", borderRadius: 0, overflow: "hidden", bgcolor: "background.default" }}>
                {loading && conversations.length === 0 ? (
                    <Box sx={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        {/* Sidebar — visible en desktop, ocupa pantalla completa en mobile sin chat activo */}
                        <Box sx={{ display: { xs: selected ? "none" : "flex", md: "flex" }, flexDirection: "column", height: "100%" }}>
                                <CrmSidebar
                                    conversations={conversations}
                                    selected={selected}
                                    onSelect={handleSelect}
                                    loading={loading}
                                    searchTerm={searchTerm}
                                    onSearchChange={(v) => { setSearchTerm(v); }}
                                    bucket={bucket}
                                    onBucketChange={(b) => { setBucket(b); }}
                                    bucketCounts={bucketCounts}
                                    hasMore={hasMore}
                                    onLoadMore={handleLoadMore}
                                    isOffline={isOffline}
                                    onRefresh={() => fetchConversations(false)}
                                    isAdmin={isAdmin}
                                    agents={agents}
                                    agentId={agentId}
                                    onAgentChange={(id) => setAgentId(id)}
                                    sortBy={sortBy}
                                    onSortChange={(s) => setSortBy(s)}
                                />
                        </Box>

                        {/* Área de chat */}
                        <Box sx={{ display: { xs: selected ? "flex" : "none", md: "flex" }, flexGrow: 1, flexDirection: "column", height: "100%", overflow: "hidden" }}>
                            <CrmChatArea
                                selected={selected}
                                incomingMessage={incomingMessage}
                                onRefresh={() => fetchConversations(false)}
                                onBack={() => setSelected(null)}
                                isAdmin={isAdmin}
                                agents={agents}
                            />
                        </Box>
                    </>
                )}
            </Paper>
        </Layout>
    );
};
