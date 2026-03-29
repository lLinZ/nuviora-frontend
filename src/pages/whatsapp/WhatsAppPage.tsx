import { useEffect, useState } from "react";
import { Box, Paper, CircularProgress, Drawer } from "@mui/material";
import { Layout } from "../../components/ui/Layout";
import { request } from "../../common/request";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { ContextPanel } from "./components/ContextPanel";
import { toast } from "react-toastify";

export interface ContactData {
    id: number;
    name: string;
    phone: string;
    unread_count: number;
    last_message: string;
    last_message_date: string;
    type: 'lead' | 'order';
    context: {
        order?: any;
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

                // Update selected contact context if it exists in the new data
                if (selectedContact) {
                    const updated = newContacts.find((c: ContactData) => c.id === selectedContact.id);
                    if (updated) setSelectedContact(updated);
                }
            }
        } catch (error) {
            toast.error("Error al cargar conversaciones");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load and polling (only for first page/last activity)
    useEffect(() => {
        fetchContacts();
        
        const interval = setInterval(() => {
            // Only poll if not searching or on first page to keep it light
            if (!searchTerm && page === 1) {
                fetchContacts();
            }
        }, 15000); 
        return () => clearInterval(interval);
    }, []);

    // Debounced search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (loading === false) { // Avoid double triggering on initial mount
                fetchContacts(false, searchTerm);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const [showMobileContext, setShowMobileContext] = useState(false);

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
                        {/* Sidebar */}
                        <Sidebar 
                            contacts={contacts} 
                            selectedContact={selectedContact} 
                            onSelect={handleSelectContact} 
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            hasMore={hasMore}
                            onLoadMore={handleLoadMore}
                        />

                        {/* Chat Area */}
                        <ChatArea 
                            selectedContact={selectedContact} 
                            onRefreshContacts={fetchContacts}
                            onBack={() => setSelectedContact(null)}
                            onOpenContext={() => setShowMobileContext(true)}
                        />

                        {/* Context Right Panel (Desktop) */}
                        <ContextPanel 
                            selectedContact={selectedContact} 
                        />

                        {/* Context Right Panel (Mobile Drawer) */}
                        <Drawer 
                            open={showMobileContext} 
                            anchor="right" 
                            onClose={() => setShowMobileContext(false)}
                            sx={{ display: { xs: 'block', lg: 'none' }, '& .MuiDrawer-paper': { width: '100%', maxWidth: 360 } }}
                        >
                            <ContextPanel selectedContact={selectedContact} isMobileDrawer={true} />
                        </Drawer>
                    </>
                )}
            </Paper>
        </Layout>
    );
};
