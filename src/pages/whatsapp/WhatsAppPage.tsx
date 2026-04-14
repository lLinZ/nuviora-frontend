import { useEffect, useRef, useState } from "react";
import { Box, Paper, CircularProgress, Drawer } from "@mui/material";
import { Layout } from "../../components/ui/Layout";
import { request } from "../../common/request";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { ContextPanel } from "./components/ContextPanel";
import { useSocketStore } from "../../store/sockets/SocketStore";
import { OrderDialog } from "../../components/orders/OrderDialog";

export interface ContactData {
    id: number;
    name: string;
    phone: string;
    unread_count: number;
    is_window_open: boolean;
    last_message: string;
    last_message_date: string;
    type: 'lead' | 'order';
    context: {
        order?: any;
        agent?: any;
        conversation?: any;
    };
}

export const WhatsAppPage = () => {
    const [contacts, setContacts] = useState<ContactData[]>([]);
    const [selectedContact, setSelectedContact] = useState<ContactData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [showMobileContext, setShowMobileContext] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

    // Used to pass incoming real-time messages directly to ChatArea without re-subscribing
    const [incomingMessage, setIncomingMessage] = useState<any>(null);

    // Contextual Order Dialog
    const [orderDialogOpen, setOrderDialogOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>(undefined);

    // Sockets
    const { echo } = useSocketStore();

    // Keep a ref so the WebSocket closure always has the current selectedContact id
    const selectedContactRef = useRef<ContactData | null>(null);
    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    const fetchContacts = async (isLoadMore = false, forcedSearch?: string, forcedFilter?: string) => {
        try {
            const search = forcedSearch !== undefined ? forcedSearch : searchTerm;
            const currentFilter = forcedFilter !== undefined ? forcedFilter : filter;
            const currentPage = isLoadMore ? page + 1 : 1;
            const url = `/whatsapp-conversations?search=${encodeURIComponent(search)}&page=${currentPage}&filter=${currentFilter}`;
            
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
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    // ─── SINGLE WebSocket hub — all real-time logic lives here ───────────────
    useEffect(() => {
        if (!echo) return;

        const channel = echo.private('whatsapp');

        // New message received (incoming from client OR outgoing from agent/n8n)
        channel.listen('WhatsappMessageReceived', (data: any) => {
            const { message } = data;
            if (!message) return;

            const client_id = message.client_id || (message.client ? message.client.id : null);
            if (!client_id) return;

            // 1. Update Sidebar contact list
            setContacts(prev => {
                const index = prev.findIndex(c => c.id == client_id);

                if (index !== -1) {
                    const updatedContacts = [...prev];
                    const contact = { ...updatedContacts[index] };

                    contact.last_message = message.body;
                    contact.last_message_date = message.sent_at;

                    // Only increment unread if the chat is NOT currently selected
                    if (selectedContactRef.current?.id != client_id && message.is_from_client) {
                        contact.unread_count = (contact.unread_count || 0) + 1;
                    }

                    // Bubble to top
                    updatedContacts.splice(index, 1);
                    return [contact, ...updatedContacts];
                } else {
                    // New contact not yet in list — reload if not searching
                    if (!searchTerm) fetchContacts(false);
                    return prev;
                }
            });

            // 2. If this matches the active chat, push message to ChatArea
            if (selectedContactRef.current?.id == client_id) {
                setIncomingMessage(message);
            }
        });

        // A chat was marked as read — zero out unread count in sidebar
        channel.listen('WhatsappChatRead', (data: any) => {
            const { client_id } = data;
            if (!client_id) return;
            setContacts(prev =>
                prev.map(c => c.id == client_id ? { ...c, unread_count: 0 } : c)
            );
        });

        return () => {
            channel.stopListening('WhatsappMessageReceived');
            channel.stopListening('WhatsappChatRead');
        };
    }, [echo, searchTerm]);

    // Debounced search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (!loading) {
                fetchContacts(false, searchTerm);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Filter change
    useEffect(() => {
        if (!loading) {
            fetchContacts(false, searchTerm, filter);
        }
    }, [filter]);

    const handleLoadMore = () => {
        fetchContacts(true);
    };

    const handleSelectContact = (contact: ContactData) => {
        // Clear locally in sidebar list for immediate UX
        setContacts(prev => prev.map(c => 
            c.id === contact.id ? { ...c, unread_count: 0 } : c
        ));
        setIncomingMessage(null); // Clear any stale incoming message from previous chat
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
                            filter={filter}
                            onFilterChange={setFilter}
                            hasMore={hasMore}
                            onLoadMore={handleLoadMore}
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
                                    filter={filter}
                                    onFilterChange={setFilter}
                                    hasMore={hasMore}
                                    onLoadMore={handleLoadMore}
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
