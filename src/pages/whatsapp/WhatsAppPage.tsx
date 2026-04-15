import { useEffect, useRef, useState, useCallback } from "react";
import { Box, Paper, CircularProgress, Drawer } from "@mui/material";
import { Layout } from "../../components/ui/Layout";
import { request } from "../../common/request";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { ContextPanel } from "./components/ContextPanel";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { OrderDialog } from "../../components/orders/OrderDialog";
import { useUserStore } from "../../store/user/UserStore";

// ─── Utilidades de notificacion ───────────────────────────────────────────────

/** Solicita permiso de notificacion del navegador una sola vez */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

/**
 * Reproduce un tono suave usando Web Audio API (sin archivos externos).
 * Nota corta tipo "ping" — solo suena para mensajes del cliente.
 */
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
    } catch (_) {
        // Si el navegador bloquea AudioContext, silencio sin error
    }
}

/**
 * Muestra notificacion del SO solo cuando la pestana no tiene foco.
 * Unifica multiples notificaciones en una sola (tag unico).
 */
function showBrowserNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        const notif = new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: 'whatsapp-crm-incoming',
        });
        setTimeout(() => notif.close(), 5000);
    }
}

export type ConversationBucket = 'requires_attention' | 'follow_up' | 'closed';
export type MessageType = 'incoming_message' | 'outgoing_agent_message' | 'outgoing_automated_message' | 'system_event';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface ContactData {
    id: number;
    name: string;
    phone: string;
    unread_count: number;
    is_window_open: boolean;
    last_message: string;
    last_message_date: string;
    last_message_type: MessageType;
    conversation_bucket: ConversationBucket;
    type: 'lead' | 'order';
    context: {
        order?: any;
        agent?: any;
        conversation?: any;
    };
}

// Prioridad numérica de bucket para ordenar en el cliente
const BUCKET_PRIORITY: Record<ConversationBucket, number> = {
    requires_attention: 1,
    follow_up: 2,
    closed: 3,
};

function insertContactSorted(list: ContactData[], contact: ContactData): ContactData[] {
    const result = [...list];
    // Encontrar posición correcta por prioridad de bucket → unread DESC → fecha DESC
    const idx = result.findIndex(c => {
        const pa = BUCKET_PRIORITY[contact.conversation_bucket] ?? 2;
        const pb = BUCKET_PRIORITY[c.conversation_bucket] ?? 2;
        if (pa !== pb) return pa < pb;
        if (contact.unread_count !== c.unread_count) return contact.unread_count > c.unread_count;
        return new Date(contact.last_message_date) > new Date(c.last_message_date);
    });
    if (idx === -1) result.push(contact);
    else result.splice(idx, 0, contact);
    return result;
}

export const WhatsAppPage = () => {
    const [contacts, setContacts] = useState<ContactData[]>([]);
    const [selectedContact, setSelectedContact] = useState<ContactData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [showMobileContext, setShowMobileContext] = useState(false);
    const [bucket, setBucket] = useState<ConversationBucket | 'all'>('all');
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
    const [totalUnread, setTotalUnread] = useState(0);

    const [incomingMessage, setIncomingMessage] = useState<any>(null);

    const [orderDialogOpen, setOrderDialogOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>(undefined);

    const { echo } = useSocketStore();
    const user = useUserStore(state => state.user);

    const selectedContactRef = useRef<ContactData | null>(null);
    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    const bucketRef = useRef(bucket);
    useEffect(() => { bucketRef.current = bucket; }, [bucket]);

    const searchTermRef = useRef(searchTerm);
    useEffect(() => { searchTermRef.current = searchTerm; }, [searchTerm]);

    // Pedir permiso de notificaciones al abrir la pagina
    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // Titulo de pestana con contador de no leidos
    useEffect(() => {
        if (totalUnread > 0) {
            document.title = `(${totalUnread}) Mensajes – Nuviora`;
        } else {
            document.title = 'Mensajes – Nuviora';
        }
        return () => { document.title = 'Nuviora'; };
    }, [totalUnread]);


    const fetchContacts = useCallback(async (isLoadMore = false, forcedSearch?: string, forcedBucket?: string) => {
        try {
            const search = forcedSearch !== undefined ? forcedSearch : searchTermRef.current;
            const currentBucket = forcedBucket !== undefined ? forcedBucket : bucketRef.current;
            const currentPage = isLoadMore ? page + 1 : 1;
            const url = `/whatsapp-conversations?search=${encodeURIComponent(search)}&page=${currentPage}&bucket=${currentBucket}`;
            
            const { status, response } = await request(url, 'GET');
            if (status) {
                const json = await response.json();
                const newContacts = json.data;
                
                if (isLoadMore) {
                    setContacts(prev => [...prev, ...newContacts].map(c => 
                        selectedContactRef.current?.id === c.id ? { ...c, unread_count: 0 } : c
                    ));
                    setPage(currentPage);
                } else {
                    setContacts(newContacts.map((c: ContactData) => 
                        selectedContactRef.current?.id === c.id ? { ...c, unread_count: 0 } : c
                    ));
                    setPage(1);
                }
                
                setHasMore(!!json.next_page_url);

                if (selectedContactRef.current) {
                    const updated = newContacts.find((c: ContactData) => c.id === selectedContactRef.current!.id);
                    if (updated) setSelectedContact(prev => ({ ...prev, ...updated, unread_count: 0 }));
                }
            }
        } catch (error) {
            console.error("Error fetching contacts", error);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, bucket, page]);

    useEffect(() => {
        fetchContacts();
    }, []);

    // ─── WebSocket hub ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!echo) return;

        const channel = echo.private('whatsapp');

        // Monitorear estado de conexión del socket
        const connector = (echo as any).connector;
        if (connector?.pusher) {
            const pusher = connector.pusher;

            // Un solo handler para 'connected': actualiza estado Y recupera mensajes perdidos
            pusher.connection.bind('connected', () => {
                setConnectionStatus('connected');
                fetchContacts(false); // recuperar mensajes perdidos durante la desconexión
            });
            pusher.connection.bind('connecting',  () => setConnectionStatus('reconnecting'));
            pusher.connection.bind('unavailable', () => setConnectionStatus('disconnected'));
            pusher.connection.bind('disconnected', () => setConnectionStatus('disconnected'));
            pusher.connection.bind('failed',      () => setConnectionStatus('disconnected'));
        }

        // Mensaje nuevo (entrante del cliente O saliente del agente/n8n)
        channel.listen('WhatsappMessageReceived', (data: any) => {
            const { message } = data;
            if (!message) return;

            const client_id = message.client_id || (message.client ? message.client.id : null);
            if (!client_id) return;

            const isIncoming   = message.message_type === 'incoming_message';
            const newBucket: ConversationBucket = message.conversation_bucket ?? 'follow_up';
            const isActiveChat = selectedContactRef.current?.id == client_id;

            // ─── NOTIFICACIONES ───────────────────────────────────────────────
            // Regla: SOLO mensajes del cliente activan sonido y notificacion.
            // Automatizaciones, respuestas del agente y eventos internos: silencio total.
            if (isIncoming && !isActiveChat) {
                playNotificationSound();

                const clientName = message.client?.first_name
                    ? `${message.client.first_name} ${message.client.last_name ?? ''}`.trim()
                    : 'Cliente';
                showBrowserNotification(
                    `Nuevo mensaje de ${clientName}`,
                    message.body?.slice(0, 120) ?? 'Nuevo mensaje'
                );

                setTotalUnread(n => n + 1);
            }

            // 1. Actualizar sidebar
            setContacts(prev => {
                const index = prev.findIndex(c => c.id == client_id);

                if (index !== -1) {
                    const oldContact = prev[index];
                    const updatedContact: ContactData = {
                        ...oldContact,
                        last_message: message.body,
                        last_message_date: message.sent_at,
                        last_message_type: message.message_type ?? 'outgoing_agent_message',
                        conversation_bucket: newBucket,
                        unread_count: isIncoming && !isActiveChat
                            ? (oldContact.unread_count || 0) + 1
                            : oldContact.unread_count,
                    };

                    const without = prev.filter(c => c.id != client_id);
                    return insertContactSorted(without, updatedContact);
                } else {
                    // Contacto nuevo — recargar la lista solo si le corresponde a este usuario o es Admin
                    const isAdmin = ['Admin', 'Manager', 'Gerente', 'Master'].includes(user?.role?.description || '');
                    if (isAdmin || message.agent_id === user?.id || message.order?.agent_id === user?.id) {
                        fetchContacts(false);
                    }
                    return prev;
                }
            });

            // 2. Si es el chat activo, enviar mensaje al ChatArea
            if (isActiveChat) {
                setIncomingMessage(message);
            }
        });

        // Chat marcado como leido
        channel.listen('WhatsappChatRead', (data: any) => {
            const { client_id } = data;
            if (!client_id) return;
            setContacts(prev => {
                const contact = prev.find(c => c.id == client_id);
                const diff = contact?.unread_count ?? 0;
                if (diff > 0) setTotalUnread(n => Math.max(0, n - diff));
                return prev.map(c => c.id == client_id ? { ...c, unread_count: 0 } : c);
            });
        });

        return () => {
            channel.stopListening('WhatsappMessageReceived');
            channel.stopListening('WhatsappChatRead');
        };
    // searchTerm NO va en deps — causaría re-suscripción con cada letra que escribe la vendedora
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [echo]);


    // Debounced search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (!loading) {
                fetchContacts(false, searchTerm);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Bucket change
    useEffect(() => {
        if (!loading) {
            fetchContacts(false, searchTerm, bucket);
        }
    }, [bucket]);

    const handleLoadMore = () => fetchContacts(true);

    const handleSelectContact = (contact: ContactData) => {
        setContacts(prev => prev.map(c => 
            c.id === contact.id ? { ...c, unread_count: 0 } : c
        ));
        setIncomingMessage(null);
        setSelectedContact(contact);
    };

    const handleOpenOrder = (id: number) => {
        setSelectedOrderId(id);
        setOrderDialogOpen(true);
    };

    return (
        <Layout noMargin>
            <Paper 
                elevation={0} 
                sx={{ 
                    display: 'flex', 
                    height: '100vh', 
                    borderRadius: 0, 
                    overflow: 'hidden',
                    bgcolor: 'background.default'
                }}
            >
                {loading && contacts.length === 0 ? (
                    <Box sx={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <>
                        <Sidebar 
                            contacts={contacts} 
                            selectedContact={selectedContact} 
                            onSelect={handleSelectContact} 
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            bucket={bucket}
                            onBucketChange={setBucket}
                            hasMore={hasMore}
                            onLoadMore={handleLoadMore}
                            connectionStatus={connectionStatus}
                        />

                        <ChatArea 
                            selectedContact={selectedContact} 
                            onRefreshContacts={() => fetchContacts(false)}
                            onBack={() => setSelectedContact(null)}
                            onOpenContext={() => setShowMobileContext(true)}
                            incomingMessage={incomingMessage}
                        />

                        <ContextPanel 
                            selectedContact={selectedContact} 
                            onRefresh={() => fetchContacts(false)}
                            onOpenOrder={handleOpenOrder}
                        />

                        <Drawer
                            anchor="right"
                            open={showMobileContext}
                            onClose={() => setShowMobileContext(false)}
                        >
                            <Box sx={{ width: 320 }}>
                                <Sidebar 
                                    contacts={contacts} 
                                    selectedContact={selectedContact} 
                                    onSelect={handleSelectContact} 
                                    searchTerm={searchTerm}
                                    onSearchChange={setSearchTerm}
                                    bucket={bucket}
                                    onBucketChange={setBucket}
                                    hasMore={hasMore}
                                    onLoadMore={handleLoadMore}
                                    connectionStatus={connectionStatus}
                                />
                            </Box>
                        </Drawer>

                        <OrderDialog 
                            id={selectedOrderId} 
                            open={orderDialogOpen} 
                            setOpen={setOrderDialogOpen} 
                        />
                    </>
                )}
            </Paper>
        </Layout>
    );
};
