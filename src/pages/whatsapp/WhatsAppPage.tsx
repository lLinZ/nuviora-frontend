import { useEffect, useState } from "react";
import { Box, Paper, CircularProgress, Drawer } from "@mui/material";
import { Layout } from "../../components/ui/Layout";
import { request } from "../../common/request";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { ContextPanel } from "./components/ContextPanel";
import { useSocketStore } from "../../store/sockets/SocketStore";

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

    // Sockets
    const { echo } = useSocketStore();

    const fetchContacts = async (isLoadMore = false, forcedSearch?: string) => {
        try {
            const search = forcedSearch !== undefined ? forcedSearch : searchTerm;
            const currentPage = isLoadMore ? page + 1 : 1;
            const url = `/whatsapp-conversations?search=${encodeURIComponent(search)}&page=${currentPage}`;
            
            const { status, response } = await request(url, 'GET');
            if (status) {
                const json = await response.json();
                const newContacts = json.data;
                
                if (isLoadMore) {
                    setContacts(prev => [...prev, ...newContacts]);
                    setPage(currentPage);
                } else {
                    setContacts(newContacts);
                    setPage(1);
                }
                
                setHasMore(!!json.next_page_url);

                if (selectedContact) {
                    const updated = newContacts.find((c: ContactData) => c.id === selectedContact.id);
                    if (updated) setSelectedContact(prev => ({ ...prev, ...updated }));
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

    // Escuchar cambios en tiempo real para el Sidebar
    useEffect(() => {
        if (!echo) return;

        const channel = echo.private('whatsapp');
        
        channel.listen('WhatsappMessageReceived', (data: any) => {
            const { message } = data;
            if (!message) return;

            setContacts(prev => {
                const client_id = message.client_id || (message.client ? message.client.id : null);
                if (!client_id) return prev;

                const index = prev.findIndex(c => c.id === client_id);
                
                if (index !== -1) {
                    const updatedContacts = [...prev];
                    const contact = { ...updatedContacts[index] };
                    
                    contact.last_message = message.body;
                    contact.last_message_date = message.sent_at;
                    
                    if (selectedContact?.id !== client_id) {
                        contact.unread_count = (contact.unread_count || 0) + 1;
                    }

                    updatedContacts.splice(index, 1);
                    return [contact, ...updatedContacts];
                } else {
                    if (!searchTerm) fetchContacts(false);
                    return prev;
                }
            });
        });

        return () => {
            channel.stopListening('WhatsappMessageReceived');
        };
    }, [echo, selectedContact?.id, searchTerm]);

    // Debounced search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (!loading) {
                fetchContacts(false, searchTerm);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleLoadMore = () => {
        fetchContacts(true);
    };

    const handleSelectContact = (contact: ContactData) => {
        const updated = contacts.map(c => 
            c.id === contact.id ? { ...c, unread_count: 0 } : c
        );
        setContacts(updated);
        setSelectedContact({ ...contact, unread_count: 0 });
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
                            hasMore={hasMore}
                            onLoadMore={handleLoadMore}
                        />

                        <ChatArea 
                            selectedContact={selectedContact} 
                            onRefreshContacts={() => fetchContacts(false)}
                            onBack={() => setSelectedContact(null)}
                            onOpenContext={() => setShowMobileContext(true)}
                        />

                        <ContextPanel 
                            selectedContact={selectedContact} 
                            onRefresh={() => fetchContacts(false)}
                        />

                        <Drawer
                            anchor="right"
                            open={showMobileContext}
                            onClose={() => setShowMobileContext(false)}
                        >
                            <Box sx={{ width: 320 }}>
                                <ContextPanel 
                                    selectedContact={selectedContact} 
                                    onRefresh={() => fetchContacts(false)}
                                />
                            </Box>
                        </Drawer>
                    </>
                )}
            </Paper>
        </Layout>
    );
};
