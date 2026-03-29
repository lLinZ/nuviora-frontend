import { FC, useState } from "react";
import { Box, Typography, List, ListItemButton, Avatar, Badge, Chip, TextField, InputAdornment, Divider } from "@mui/material";
import { SearchRounded, PhoneRounded, ShoppingBagRounded } from "@mui/icons-material";
import { ContactData } from "../WhatsAppPage";
import dayjs from "dayjs";

interface SidebarProps {
    contacts: ContactData[];
    selectedContact: ContactData | null;
    onSelect: (contact: ContactData) => void;
}

export const Sidebar: FC<SidebarProps> = ({ contacts, selectedContact, onSelect }) => {
    const [search, setSearch] = useState("");

    const filtered = contacts.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.phone.includes(search)
    );

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
            <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5 }}>
                    Mensajes
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar o empezar un chat"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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

            <Divider />

            <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
                {filtered.map(contact => (
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
                                    <Chip label="Lead" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                                ) : (
                                    <Chip label={`#${contact.context.order?.name}`} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold', borderColor: 'currentColor', color: 'inherit' }} />
                                )}
                            </Box>
                        </Box>
                    </ListItemButton>
                ))}
                {filtered.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                        <Typography variant="body2">No encontramos chats</Typography>
                    </Box>
                )}
            </List>
        </Box>
    );
};
