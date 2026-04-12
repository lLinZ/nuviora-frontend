import { FC, useState } from "react";
import { Box, Typography, List, ListItemButton, Avatar, Badge, Chip, TextField, InputAdornment, Divider, Button, IconButton } from "@mui/material";
import { SearchRounded, ArrowBackRounded, DoneAllRounded, MarkChatUnreadRounded, ChatBubbleRounded } from "@mui/icons-material";
import { Tabs, Tab } from "@mui/material";
import { ContactData } from "../WhatsAppPage";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface SidebarProps {
    contacts: ContactData[];
    selectedContact: ContactData | null;
    onSelect: (contact: ContactData) => void;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    filter: 'all' | 'unread' | 'read';
    onFilterChange: (value: 'all' | 'unread' | 'read') => void;
    hasMore: boolean;
    onLoadMore: () => void;
}

import { ShiftManagement } from "./ShiftManagement";
import { useUserStore } from "../../../store/user/UserStore";

export const Sidebar: FC<SidebarProps> = ({ 
    contacts, 
    selectedContact, 
    onSelect,
    searchTerm,
    onSearchChange,
    filter,
    onFilterChange,
    hasMore,
    onLoadMore
}) => {
    const user = useUserStore(state => state.user);
    const navigate = useNavigate();
    const [openShift, setOpenShift] = useState(false);
    const isAdmin = ['Admin', 'Manager', 'Gerente', 'Master'].includes(user.role?.description || '');

    return (
        <Box 
            sx={{ 
                width: { xs: '100%', md: 320 }, 
                flexShrink: 0,
                borderRight: '1px solid', 
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: { xs: selectedContact ? 'none' : 'flex', md: 'flex' },
                flexDirection: 'column'
            }}
        >
            {user.is_lite_view && (
                <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                    <Button 
                        startIcon={<ArrowBackRounded />} 
                        fullWidth 
                        onClick={() => navigate('/dashboard')}
                        sx={{ 
                            textTransform: 'none', 
                            justifyContent: 'start', 
                            fontWeight: 'bold',
                            borderRadius: 2,
                            color: 'text.secondary'
                        }}
                    >
                        Volver al Panel
                    </Button>
                </Box>
            )}
            <Box sx={{ p: 2, pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="h6" fontWeight="bold">
                        Mensajes
                    </Typography>
                    {isAdmin && (
                        <Button 
                            size="small" 
                            variant="outlined" 
                            onClick={() => setOpenShift(true)}
                            sx={{ borderRadius: 4, textTransform: 'none', px: 1.5 }}
                        >
                            Turnos
                        </Button>
                    )}
                </Box>
                <ShiftManagement open={openShift} onClose={() => setOpenShift(false)} />
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar o empezar un chat"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRounded fontSize="small" sx={{ opacity: 0.6 }} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 3, bgcolor: 'action.hover', '& fieldset': { border: 'none' } }
                        }
                    }}
                />
            </Box>

            <Tabs 
                value={filter} 
                onChange={(_, val) => onFilterChange(val)}
                variant="fullWidth"
                sx={{ 
                    minHeight: 48,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '& .MuiTab-root': { 
                        textTransform: 'none', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        minWidth: 0,
                        px: 1,
                        gap: 0.5
                    }
                }}
            >
                <Tab 
                    value="all" 
                    label="Todos" 
                    icon={<ChatBubbleRounded sx={{ fontSize: '1rem' }} />} 
                    iconPosition="start"
                />
                <Tab 
                    value="unread" 
                    label="No leídos" 
                    icon={<MarkChatUnreadRounded sx={{ fontSize: '1rem' }} />} 
                    iconPosition="start"
                />
                <Tab 
                    value="read" 
                    label="Leídos" 
                    icon={<DoneAllRounded sx={{ fontSize: '1rem' }} />} 
                    iconPosition="start"
                />
            </Tabs>

            <Divider />

            <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
                {contacts.map(contact => (
                    <ListItemButton
                        key={contact.id}
                        selected={selectedContact?.id === contact.id}
                        onClick={() => onSelect(contact)}
                        sx={{ 
                            p: 2, 
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&.Mui-selected': {
                                bgcolor: 'primary.light',
                                color: 'primary.contrastText',
                                '&:hover': {
                                    bgcolor: 'primary.main',
                                }
                            }
                        }}
                    >
                        <Badge 
                            color="error" 
                            badgeContent={contact.unread_count} 
                            invisible={contact.unread_count === 0}
                            sx={{ mr: 2 }}
                        >
                            <Avatar sx={{ bgcolor: contact.type === 'lead' ? 'secondary.main' : 'primary.main', fontWeight: 'bold' }}>
                                {contact.name.charAt(0)}
                            </Avatar>
                        </Badge>
                        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight="bold" noWrap>
                                    {contact.name}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7, whiteSpace: 'nowrap' }}>
                                    {dayjs(contact.last_message_date).format('HH:mm')}
                                </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>
                                    {contact.last_message}
                                </Typography>
                                {contact.type === 'lead' ? (
                                    <Chip label="Lead Nuevo" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                ) : contact.context.order?.name ? (
                                    <Chip label={`#${contact.context.order.name}`} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold', borderColor: 'currentColor', color: 'inherit' }} />
                                ) : (
                                    <Chip label="Lead Nuevo" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                )}
                            </Box>
                        </Box>
                    </ListItemButton>
                ))}
                
                {hasMore && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Button 
                            onClick={onLoadMore} 
                            fullWidth 
                            size="small" 
                            variant="text"
                            sx={{ color: 'primary.main', fontWeight: 'bold' }}
                        >
                            Cargar más chats...
                        </Button>
                    </Box>
                )}

                {contacts.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                        <Typography variant="body2">No encontramos chats</Typography>
                    </Box>
                )}
            </List>
        </Box>
    );
};
