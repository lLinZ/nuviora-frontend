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

    const fetchContacts = async () => {
        try {
            const { status, response } = await request('/whatsapp-conversations', 'GET');
            if (status) {
                const json = await response.json();
                setContacts(json);
                // Update selected contact if it exists
                if (selectedContact) {
                    const updated = json.find((c: ContactData) => c.id === selectedContact.id);
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

    useEffect(() => {
        fetchContacts();
        
        // TODO: In the future, attach Pusher socket listener here 
        // to listen for 'WhatsappMessageReceived' and reload fetchContacts()
        const interval = setInterval(fetchContacts, 15000); // Temporary polling
        return () => clearInterval(interval);
    }, []);

    const [showMobileContext, setShowMobileContext] = useState(false);

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
