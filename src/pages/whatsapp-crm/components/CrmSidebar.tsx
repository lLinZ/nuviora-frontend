import { FC, useRef, useCallback } from "react";
import {
    Box, Typography, TextField, InputAdornment, Divider,
    IconButton, Tooltip, CircularProgress, Button, Chip,
} from "@mui/material";
import {
    SearchRounded, RefreshRounded, WifiOffRounded,
} from "@mui/icons-material";
import { CrmContactCard, CrmConversation } from "./CrmContactCard";

type BucketFilter = "all" | "requires_attention" | "follow_up" | "closed";

interface Props {
    conversations: CrmConversation[];
    selected: CrmConversation | null;
    onSelect: (conv: CrmConversation) => void;
    loading: boolean;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    bucket: BucketFilter;
    onBucketChange: (b: BucketFilter) => void;
    bucketCounts: Record<string, number>;
    hasMore: boolean;
    onLoadMore: () => void;
    isOffline: boolean;
    onRefresh: () => void;
}

const BUCKET_TABS: { key: BucketFilter; label: string; color: string }[] = [
    { key: "requires_attention", label: "🔴 Atención",    color: "#ef4444" },
    { key: "follow_up",          label: "🟡 Seguimiento", color: "#f59e0b" },
    { key: "closed",             label: "⚫ Cerrados",    color: "#6b7280" },
    { key: "all",                label: "Todos",          color: "#3b82f6" },
];

export const CrmSidebar: FC<Props> = ({
    conversations,
    selected,
    onSelect,
    loading,
    searchTerm,
    onSearchChange,
    bucket,
    onBucketChange,
    bucketCounts,
    hasMore,
    onLoadMore,
    isOffline,
    onRefresh,
}) => {
    const listRef = useRef<HTMLDivElement>(null);

    const handleScroll = useCallback(() => {
        const el = listRef.current;
        if (!el || !hasMore || loading) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
            onLoadMore();
        }
    }, [hasMore, loading, onLoadMore]);

    const totalUnread = bucketCounts.requires_attention ?? 0;

    return (
        <Box
            sx={{
                width: { xs: "100%", md: 320 },
                flexShrink: 0,
                borderRight: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                bgcolor: "background.paper",
            }}
        >
            {/* ── HEADER ───────────────────────────────────────────────── */}
            <Box
                sx={{
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: "background.paper",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                        💬 WhatsApp CRM
                    </Typography>
                    {totalUnread > 0 && (
                        <Chip
                            label={totalUnread}
                            size="small"
                            sx={{
                                height: 18,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                bgcolor: "error.main",
                                color: "white",
                                borderRadius: 1,
                            }}
                        />
                    )}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {isOffline && (
                        <Tooltip title="Sin conexión — Reconectando...">
                            <WifiOffRounded fontSize="small" color="warning" />
                        </Tooltip>
                    )}
                    <Tooltip title="Refrescar lista">
                        <IconButton size="small" onClick={onRefresh} disabled={loading}>
                            {loading ? (
                                <CircularProgress size={16} />
                            ) : (
                                <RefreshRounded fontSize="small" />
                            )}
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* ── BÚSQUEDA ─────────────────────────────────────────────── */}
            <Box sx={{ px: 1.5, py: 1, bgcolor: "background.paper" }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar por nombre, teléfono o nº orden..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchRounded fontSize="small" color="action" />
                            </InputAdornment>
                        ),
                        sx: { borderRadius: 3, fontSize: "0.83rem" },
                    }}
                />
            </Box>

            {/* ── TABS DE BUCKET ───────────────────────────────────────── */}
            <Box
                sx={{
                    display: "flex",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    overflowX: "auto",
                    "&::-webkit-scrollbar": { display: "none" },
                }}
            >
                {BUCKET_TABS.map((tab) => {
                    const count = tab.key !== "all" ? (bucketCounts[tab.key] ?? 0) : undefined;
                    const isActive = bucket === tab.key;
                    return (
                        <Box
                            key={tab.key}
                            onClick={() => onBucketChange(tab.key)}
                            sx={{
                                flex: 1,
                                minWidth: 70,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                py: 0.8,
                                px: 0.5,
                                cursor: "pointer",
                                borderBottom: isActive ? "2px solid" : "2px solid transparent",
                                borderColor: isActive ? tab.color : "transparent",
                                bgcolor: isActive ? `${tab.color}12` : "transparent",
                                transition: "all 0.15s",
                                "&:hover": { bgcolor: `${tab.color}10` },
                                gap: 0.2,
                            }}
                        >
                            <Typography
                                variant="caption"
                                fontWeight={isActive ? 700 : 500}
                                sx={{ fontSize: "0.65rem", color: isActive ? tab.color : "text.secondary", lineHeight: 1.2, textAlign: "center" }}
                            >
                                {tab.label}
                            </Typography>
                            {count !== undefined && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: "0.6rem",
                                        fontWeight: 700,
                                        color: count > 0 ? tab.color : "text.disabled",
                                        lineHeight: 1,
                                    }}
                                >
                                    {count}
                                </Typography>
                            )}
                        </Box>
                    );
                })}
            </Box>

            {/* ── LISTA DE CONVERSACIONES ──────────────────────────────── */}
            <Box
                ref={listRef}
                onScroll={handleScroll}
                sx={{
                    flexGrow: 1,
                    overflowY: "auto",
                    "&::-webkit-scrollbar": { width: 4 },
                    "&::-webkit-scrollbar-thumb": {
                        bgcolor: "divider",
                        borderRadius: 2,
                    },
                }}
            >
                {loading && conversations.length === 0 ? (
                    <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : conversations.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                            {searchTerm
                                ? "Sin resultados para esa búsqueda."
                                : "No hay conversaciones en este bucket."}
                        </Typography>
                    </Box>
                ) : (
                    conversations.map((conv, idx) => (
                        <Box key={conv.client_id}>
                            <CrmContactCard
                                conv={conv}
                                isSelected={selected?.client_id === conv.client_id}
                                onClick={() => onSelect(conv)}
                            />
                            {idx < conversations.length - 1 && (
                                <Divider sx={{ mx: 2, opacity: 0.4 }} />
                            )}
                        </Box>
                    ))
                )}

                {hasMore && !loading && (
                    <Box sx={{ p: 2, textAlign: "center" }}>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={onLoadMore}
                            sx={{ borderRadius: 3, fontSize: "0.75rem" }}
                        >
                            Cargar más
                        </Button>
                    </Box>
                )}
                {loading && conversations.length > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                        <CircularProgress size={20} />
                    </Box>
                )}
            </Box>
        </Box>
    );
};
