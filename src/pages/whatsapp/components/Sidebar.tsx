import { FC, useState } from "react";
import {
    Box, Typography, List, ListItemButton, Avatar, Badge,
    Chip, TextField, InputAdornment, Divider, Button, Tooltip
} from "@mui/material";
import {
    SearchRounded, ArrowBackRounded,
    ErrorOutlineRounded,        // requires_attention icon
    HourglassTopRounded,        // follow_up icon
    CheckCircleOutlineRounded,  // closed icon
    ChatBubbleRounded,          // all icon
    WifiRounded, WifiOffRounded, SyncRounded
} from "@mui/icons-material";
import { Tabs, Tab } from "@mui/material";
import { ContactData, ConversationBucket, ConnectionStatus } from "../WhatsAppPage";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { ShiftManagement } from "./ShiftManagement";
import { useUserStore } from "../../../store/user/UserStore";

// ─── Bucket config ────────────────────────────────────────────────────────────
const BUCKET_CONFIG = {
    all: {
        label: 'Todos',
        Icon: ChatBubbleRounded,
        dotColor: 'transparent',
    },
    requires_attention: {
        label: 'Requieren atención',
        Icon: ErrorOutlineRounded,
        dotColor: '#f44336',
    },
    follow_up: {
        label: 'En seguimiento',
        Icon: HourglassTopRounded,
        dotColor: '#ff9800',
    },
    closed: {
        label: 'Cerrados',
        Icon: CheckCircleOutlineRounded,
        dotColor: '#4caf50',
    },
} as const;

// ─── Connection status config ─────────────────────────────────────────────────
const CONNECTION_CONFIG: Record<ConnectionStatus, { label: string; color: string; Icon: any }> = {
    connected:    { label: 'Conectado',     color: '#4caf50', Icon: WifiRounded },
    reconnecting: { label: 'Reconectando…', color: '#ff9800', Icon: SyncRounded },
    disconnected: { label: 'Desconectado',  color: '#f44336', Icon: WifiOffRounded },
};

interface SidebarProps {
    contacts: ContactData[];
    selectedContact: ContactData | null;
    onSelect: (contact: ContactData) => void;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    bucket: ConversationBucket | 'all';
    onBucketChange: (value: ConversationBucket | 'all') => void;
    hasMore: boolean;
    onLoadMore: () => void;
    connectionStatus: ConnectionStatus;
}

export const Sidebar: FC<SidebarProps> = ({
    contacts,
    selectedContact,
    onSelect,
    searchTerm,
    onSearchChange,
    bucket,
    onBucketChange,
    hasMore,
    onLoadMore,
    connectionStatus,
}) => {
    const user = useUserStore(state => state.user);
    const navigate = useNavigate();
    const [openShift, setOpenShift] = useState(false);
    const isAdmin = ['Admin', 'Manager', 'Gerente', 'Master'].includes(user.role?.description || '');

    const connInfo = CONNECTION_CONFIG[connectionStatus];
    const ConnIcon = connInfo.Icon;

    // Count contacts per bucket for tab badges
    const bucketCounts = contacts.reduce((acc, c) => {
        acc[c.conversation_bucket] = (acc[c.conversation_bucket] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

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
            {/* Back button (lite view) */}
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

            {/* Header */}
            <Box sx={{ p: 2, pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    {/* Title + Connection indicator */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                            Mensajes
                        </Typography>
                        <Tooltip title={connInfo.label} placement="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                <ConnIcon
                                    sx={{
                                        fontSize: '0.9rem',
                                        color: connInfo.color,
                                        // Spin animation for reconnecting state
                                        animation: connectionStatus === 'reconnecting'
                                            ? 'spin 1.2s linear infinite'
                                            : 'none',
                                        '@keyframes spin': {
                                            from: { transform: 'rotate(0deg)' },
                                            to:   { transform: 'rotate(360deg)' },
                                        },
                                    }}
                                />
                                {connectionStatus !== 'connected' && (
                                    <Typography
                                        variant="caption"
                                        sx={{ color: connInfo.color, fontSize: '0.65rem', fontWeight: 'bold' }}
                                    >
                                        {connInfo.label}
                                    </Typography>
                                )}
                            </Box>
                        </Tooltip>
                    </Box>

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

            {/* Bucket tabs */}
            <Tabs
                value={bucket}
                onChange={(_, val) => onBucketChange(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    minHeight: 44,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                        textTransform: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        minWidth: 0,
                        px: 1.2,
                        gap: 0.4,
                        minHeight: 44,
                    }
                }}
            >
                <Tab
                    value="all"
                    label="Todos"
                    icon={<ChatBubbleRounded sx={{ fontSize: '0.9rem' }} />}
                    iconPosition="start"
                />
                <Tab
                    value="requires_attention"
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            Atención
                            {(bucketCounts.requires_attention ?? 0) > 0 && (
                                <Chip
                                    label={bucketCounts.requires_attention}
                                    size="small"
                                    sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#f44336', color: '#fff', fontWeight: 'bold' }}
                                />
                            )}
                        </Box>
                    }
                    icon={<ErrorOutlineRounded sx={{ fontSize: '0.9rem', color: '#f44336' }} />}
                    iconPosition="start"
                />
                <Tab
                    value="follow_up"
                    label="Seguimiento"
                    icon={<HourglassTopRounded sx={{ fontSize: '0.9rem', color: '#ff9800' }} />}
                    iconPosition="start"
                />
                <Tab
                    value="closed"
                    label="Cerrados"
                    icon={<CheckCircleOutlineRounded sx={{ fontSize: '0.9rem', color: '#4caf50' }} />}
                    iconPosition="start"
                />
            </Tabs>

            <Divider />

            {/* Contact list */}
            <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
                {contacts.map(contact => {
                    const bucketDotColor = BUCKET_CONFIG[contact.conversation_bucket]?.dotColor ?? 'transparent';
                    const isSelected = selectedContact?.id === contact.id;

                    return (
                        <ListItemButton
                            key={contact.id}
                            selected={isSelected}
                            onClick={() => onSelect(contact)}
                            sx={{
                                p: 0,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                position: 'relative',
                                overflow: 'hidden',
                                '&.Mui-selected': {
                                    bgcolor: 'primary.light',
                                    color: 'primary.contrastText',
                                    '&:hover': { bgcolor: 'primary.main' }
                                }
                            }}
                        >
                            {/* Bucket color stripe on the left */}
                            <Box
                                sx={{
                                    width: 4,
                                    alignSelf: 'stretch',
                                    bgcolor: bucketDotColor,
                                    flexShrink: 0,
                                    opacity: isSelected ? 0.6 : 1,
                                }}
                            />

                            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
                                <Badge
                                    color="error"
                                    badgeContent={contact.unread_count}
                                    invisible={contact.unread_count === 0}
                                >
                                    <Avatar sx={{
                                        bgcolor: contact.type === 'lead' ? 'secondary.main' : 'primary.main',
                                        fontWeight: 'bold',
                                        width: 40,
                                        height: 40,
                                        fontSize: '1rem'
                                    }}>
                                        {contact.name.charAt(0)}
                                    </Avatar>
                                </Badge>

                                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                                        <Typography variant="subtitle2" fontWeight="bold" noWrap>
                                            {contact.name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.7, whiteSpace: 'nowrap', ml: 1 }}>
                                            {dayjs(contact.last_message_date).format('HH:mm')}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                opacity: contact.last_message_type === 'incoming_message' ? 1 : 0.65,
                                                fontWeight: contact.last_message_type === 'incoming_message' && contact.unread_count > 0 ? 'bold' : 'normal',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: 150,
                                            }}
                                        >
                                            {/* Prefix for automated messages so vendedoras saben que fue automático */}
                                            {contact.last_message_type === 'outgoing_automated_message' && (
                                                <Box component="span" sx={{ opacity: 0.5, mr: 0.3 }}>🤖</Box>
                                            )}
                                            {contact.last_message}
                                        </Typography>
                                        {contact.type === 'lead' || !contact.context.order?.name ? (
                                            <Chip label="Lead" size="small" color="secondary" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 'bold', flexShrink: 0 }} />
                                        ) : (
                                            <Chip
                                                label={`#${contact.context.order.name}`}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 'bold', borderColor: 'currentColor', color: 'inherit', flexShrink: 0 }}
                                            />
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </ListItemButton>
                    );
                })}

                {hasMore && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Button
                            onClick={onLoadMore}
                            fullWidth
                            size="small"
                            variant="text"
                            sx={{ color: 'primary.main', fontWeight: 'bold' }}
                        >
                            Cargar más chats…
                        </Button>
                    </Box>
                )}

                {contacts.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                        <Typography variant="body2">No hay chats en este filtro</Typography>
                    </Box>
                )}
            </List>
        </Box>
    );
};
