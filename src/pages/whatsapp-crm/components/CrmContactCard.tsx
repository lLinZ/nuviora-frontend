import { FC } from "react";
import { Box, Typography, Avatar, Badge, Chip } from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

export interface CrmConversation {
    client_id: number;
    client_name: string;
    client_phone: string;
    agent_id: number | null;
    agent_name: string | null;
    is_lead: boolean;
    is_window_open: boolean;
    unread_count: number;
    last_message: string;
    last_message_at: string;
    last_message_type: string;
    conversation_bucket: "requires_attention" | "follow_up" | "closed";
    conversation_id: number | null;
    order: {
        id: number;
        order_number: string;
        status: string;
        status_id: number;
        products_summary: string;
        total_usd: number;
        total_ves: number;
        agent_name: string | null;
    } | null;
}

interface Props {
    conv: CrmConversation;
    isSelected: boolean;
    onClick: () => void;
}

const BUCKET_ACCENT: Record<string, string> = {
    requires_attention: "#ef4444",
    follow_up: "#f59e0b",
    closed: "#64748b",
};

const STATUS_BG: Record<string, { bg: string; color: string }> = {
    "Nuevo":              { bg: "#dbeafe", color: "#1d4ed8" },
    "En proceso":         { bg: "#ede9fe", color: "#6d28d9" },
    "Entregado":          { bg: "#dcfce7", color: "#15803d" },
    "Cancelado":          { bg: "#fee2e2", color: "#b91c1c" },
    "En ruta":            { bg: "#fef9c3", color: "#92400e" },
    "Sin Stock":          { bg: "#ffedd5", color: "#c2410c" },
    "Novedades":          { bg: "#fce7f3", color: "#be185d" },
};

function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#10b981","#3b82f6","#ef4444"];
    return colors[Math.abs(hash) % colors.length];
}

export const CrmContactCard: FC<Props> = ({ conv, isSelected, onClick }) => {
    const initials = conv.client_name
        .split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

    const timeAgo = conv.last_message_at ? dayjs(conv.last_message_at).fromNow(true) : "";
    const isIncoming = conv.last_message_type === "incoming_message";
    const accent = BUCKET_ACCENT[conv.conversation_bucket] ?? "#64748b";
    const hasUnread = conv.unread_count > 0;
    const avatarColor = stringToColor(conv.client_name || conv.client_phone);
    const statusStyle = STATUS_BG[conv.order?.status ?? ""] ?? null;

    return (
        <Box
            onClick={onClick}
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 1.5,
                py: 1.2,
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "background 0.18s ease",
                bgcolor: isSelected
                    ? "rgba(99,102,241,0.08)"
                    : "transparent",
                "&:hover": {
                    bgcolor: isSelected
                        ? "rgba(99,102,241,0.10)"
                        : "rgba(0,0,0,0.025)",
                },
                // Borde izquierdo de bucket
                "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: "15%",
                    height: "70%",
                    width: isSelected || hasUnread ? 3 : 2,
                    borderRadius: "0 3px 3px 0",
                    bgcolor: accent,
                    opacity: isSelected || hasUnread ? 1 : 0.35,
                    transition: "all 0.18s",
                },
            }}
        >
            {/* Avatar */}
            <Badge
                badgeContent={conv.unread_count > 0 ? conv.unread_count : 0}
                max={99}
                sx={{
                    flexShrink: 0,
                    "& .MuiBadge-badge": {
                        bgcolor: "#ef4444",
                        color: "#fff",
                        fontSize: "0.58rem",
                        height: 17,
                        minWidth: 17,
                        fontWeight: 800,
                        boxShadow: "0 0 0 2px white",
                    },
                }}
            >
                <Avatar
                    sx={{
                        width: 46,
                        height: 46,
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        bgcolor: avatarColor,
                        boxShadow: hasUnread
                            ? `0 0 0 2.5px ${accent}, 0 2px 8px rgba(0,0,0,0.12)`
                            : "0 1px 4px rgba(0,0,0,0.10)",
                        transition: "box-shadow 0.2s",
                        letterSpacing: "-0.5px",
                    }}
                >
                    {initials}
                </Avatar>
            </Badge>

            {/* Contenido principal */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                {/* Fila 1: nombre + tiempo */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.15 }}>
                    <Typography
                        noWrap
                        sx={{
                            fontSize: "0.83rem",
                            fontWeight: hasUnread ? 700 : 500,
                            color: hasUnread ? "text.primary" : "text.primary",
                            maxWidth: "62%",
                            letterSpacing: "-0.1px",
                        }}
                    >
                        {conv.client_name || conv.client_phone}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: "0.62rem",
                            color: hasUnread ? accent : "text.disabled",
                            fontWeight: hasUnread ? 700 : 400,
                            flexShrink: 0,
                            ml: 0.5,
                        }}
                    >
                        {timeAgo}
                    </Typography>
                </Box>

                {/* Fila 2: preview del último mensaje */}
                <Typography
                    noWrap
                    sx={{
                        fontSize: "0.76rem",
                        color: hasUnread ? "text.primary" : "text.secondary",
                        fontWeight: hasUnread ? 600 : 400,
                        mb: 0.4,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.3,
                    }}
                >
                    {!isIncoming && (
                        <Box component="span" sx={{ color: "text.disabled", fontSize: "0.72rem", flexShrink: 0 }}>Tú: </Box>
                    )}
                    <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.last_message || "Sin mensajes"}
                    </Box>
                </Typography>

                {/* Fila 3: chips de estado */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "nowrap", overflow: "hidden" }}>
                    {conv.is_lead ? (
                        <Chip
                            label="Lead"
                            size="small"
                            sx={{ height: 15, fontSize: "0.55rem", fontWeight: 700, bgcolor: "#ede9fe", color: "#6d28d9", borderRadius: 0.8, "& .MuiChip-label": { px: 0.7 } }}
                        />
                    ) : statusStyle ? (
                        <Chip
                            label={conv.order!.status}
                            size="small"
                            sx={{ height: 15, fontSize: "0.55rem", fontWeight: 700, bgcolor: statusStyle.bg, color: statusStyle.color, borderRadius: 0.8, "& .MuiChip-label": { px: 0.7 } }}
                        />
                    ) : conv.order ? (
                        <Chip
                            label={conv.order.status}
                            size="small"
                            sx={{ height: 15, fontSize: "0.55rem", fontWeight: 700, bgcolor: "action.hover", borderRadius: 0.8, "& .MuiChip-label": { px: 0.7 } }}
                        />
                    ) : null}

                    {!conv.is_window_open && (
                        <Typography sx={{ fontSize: "0.58rem", color: "#f59e0b", fontWeight: 700, flexShrink: 0 }}>
                            ⏱ 24h
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
};
