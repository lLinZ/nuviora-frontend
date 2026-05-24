// src/pages/round-robin/RoundRobinControl.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
    Box, Paper, Typography, Chip, Divider, Avatar, Tooltip,
    ToggleButton, ToggleButtonGroup, CircularProgress, Stack,
    MenuItem, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, Button, Badge, IconButton, Alert,
    LinearProgress
} from "@mui/material";
import {
    RefreshRounded, RestartAltRounded, ArrowForwardRounded,
    CheckCircleRounded, AccessTimeRounded, WarningAmberRounded,
    ShuffleRounded, BalanceRounded, StoreRounded,
    PersonSearchRounded, LockClockRounded, GroupsRounded
} from "@mui/icons-material";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { Loading } from "../../components/ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { RequireRole } from "../../components/auth/RequireRole";

/* ─────────────────────────── Types ─────────────────────────────────── */

interface RosterAgent {
    id: number;
    name: string;
    can_handle_no_stock: boolean;
    is_last?: boolean;
    is_next?: boolean;
}

interface ShopRoundRobin {
    id: number;
    name: string;
    is_open: boolean;
    pointer_agent_id: number | null;
    roster_normal: RosterAgent[];
    roster_no_stock: RosterAgent[];
    roster_default: RosterAgent[];
}

interface RoundRobinData {
    strategy: "round_robin" | "load_balanced";
    shops: ShopRoundRobin[];
}

/* ─────────────────────────── Helpers ───────────────────────────────── */

function getInitials(name: string) {
    return name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

/* ─────────────────────────── Sub-components ────────────────────────── */

interface AgentQueueProps {
    label: string;
    labelColor?: "primary" | "error" | "default" | "secondary";
    icon: React.ReactNode;
    agents: RosterAgent[];
    emptyText: string;
    shopColor?: string;
}

const AgentQueue: React.FC<AgentQueueProps> = ({
    label, labelColor = "default", icon, agents, emptyText, shopColor
}) => {
    if (agents.length === 0) {
        return (
            <Box sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                    {icon}
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">
                        {label}
                    </Typography>
                </Box>
                <Typography variant="caption" color="text.disabled" fontStyle="italic">
                    {emptyText}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                {icon}
                <Typography variant="caption" fontWeight="bold" color="text.secondary">
                    {label}
                </Typography>
                <Chip
                    label={agents.length}
                    size="small"
                    variant="outlined"
                    color={labelColor}
                    sx={{ height: 16, fontSize: "0.6rem", ml: 0.5 }}
                />
            </Box>
            <Box display="flex" flexWrap="wrap" gap={0.75}>
                {agents.map((agent, idx) => {
                    const isLast = agent.is_last;
                    const isNext = agent.is_next;
                    const order = idx + 1;

                    return (
                        <Tooltip
                            key={agent.id}
                            title={
                                isLast ? "⬅️ Última asignada"
                                    : isNext ? "⏭️ Siguiente en recibir orden"
                                        : `Turno #${order}`
                            }
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 6,
                                    border: isNext
                                        ? `2px solid ${shopColor ?? "#1976d2"}`
                                        : isLast
                                            ? "2px dashed #aaa"
                                            : "2px solid transparent",
                                    bgcolor: isNext
                                        ? `${shopColor ?? "#1976d2"}18`
                                        : isLast
                                            ? "action.hover"
                                            : "background.default",
                                    transition: "all 0.2s",
                                    cursor: "default",
                                }}
                            >
                                {isNext && (
                                    <ArrowForwardRounded
                                        sx={{ fontSize: 12, color: shopColor ?? "primary.main" }}
                                    />
                                )}
                                {isLast && (
                                    <CheckCircleRounded
                                        sx={{ fontSize: 12, color: "text.disabled" }}
                                    />
                                )}
                                <Avatar
                                    sx={{
                                        width: 22,
                                        height: 22,
                                        fontSize: "0.6rem",
                                        bgcolor: isNext
                                            ? shopColor ?? "primary.main"
                                            : "grey.400",
                                        fontWeight: "bold",
                                    }}
                                >
                                    {getInitials(agent.name)}
                                </Avatar>
                                <Typography
                                    variant="caption"
                                    fontWeight={isNext ? "bold" : "normal"}
                                    sx={{ color: isNext ? "text.primary" : "text.secondary" }}
                                >
                                    {agent.name.split(" ")[0]}
                                </Typography>
                                {agent.can_handle_no_stock && (
                                    <Chip
                                        label="SS"
                                        size="small"
                                        color="error"
                                        sx={{ height: 14, fontSize: "0.55rem", px: 0.2 }}
                                    />
                                )}
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>
        </Box>
    );
};

/* ─────────────────────────── Shop Card ─────────────────────────────── */

const SHOP_COLORS = [
    "#2196f3", "#9c27b0", "#f44336", "#4caf50",
    "#ff9800", "#00bcd4", "#e91e63", "#3f51b5",
];

interface ShopCardProps {
    shop: ShopRoundRobin;
    colorIdx: number;
    onReset: (shopId: number) => void;
    onMovePointer: (shop: ShopRoundRobin) => void;
    resetting: number | null;
}

const ShopCard: React.FC<ShopCardProps> = ({
    shop, colorIdx, onReset, onMovePointer, resetting
}) => {
    const color = SHOP_COLORS[colorIdx % SHOP_COLORS.length];
    const isResetting = resetting === shop.id;

    return (
        <Paper
            elevation={2}
            sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: `1px solid ${color}30`,
                transition: "box-shadow 0.2s",
                "&:hover": { boxShadow: `0 4px 20px ${color}25` },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    px: 2, py: 1.5,
                    background: `linear-gradient(135deg, ${color}22, ${color}08)`,
                    borderBottom: `1px solid ${color}25`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <StoreRounded sx={{ color, fontSize: 20 }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                        {shop.name}
                    </Typography>
                    <Chip
                        size="small"
                        label={shop.is_open ? "Abierta" : "Cerrada"}
                        color={shop.is_open ? "success" : "default"}
                        variant="filled"
                        icon={shop.is_open ? <CheckCircleRounded /> : <LockClockRounded />}
                        sx={{ height: 20, fontSize: "0.65rem" }}
                    />
                </Box>
                <Box display="flex" gap={0.5}>
                    <Tooltip title="Mover puntero manualmente">
                        <IconButton
                            size="small"
                            onClick={() => onMovePointer(shop)}
                            disabled={shop.roster_normal.length === 0}
                            sx={{ color }}
                        >
                            <PersonSearchRounded fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Resetear puntero (empieza desde el inicio)">
                        <IconButton
                            size="small"
                            onClick={() => onReset(shop.id)}
                            disabled={isResetting}
                            sx={{ color: "error.main" }}
                        >
                            {isResetting
                                ? <CircularProgress size={14} color="error" />
                                : <RestartAltRounded fontSize="small" />
                            }
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {isResetting && <LinearProgress color="error" />}

            {/* Body */}
            <Box sx={{ p: 2 }}>
                {/* Cola Normal */}
                <AgentQueue
                    label="Roster Normal (hoy)"
                    labelColor="primary"
                    icon={<GroupsRounded sx={{ fontSize: 14, color: "primary.main" }} />}
                    agents={shop.roster_normal}
                    emptyText="Sin vendedoras activas hoy"
                    shopColor={color}
                />

                <Divider sx={{ my: 1.5 }} />

                {/* Cola Sin Stock */}
                <AgentQueue
                    label="Roster Sin Stock (hoy)"
                    labelColor="error"
                    icon={<WarningAmberRounded sx={{ fontSize: 14, color: "error.main" }} />}
                    agents={shop.roster_no_stock}
                    emptyText="Ninguna vendedora con permiso Sin Stock activa hoy"
                    shopColor="#f44336"
                />

                <Divider sx={{ my: 1.5 }} />

                {/* Roster Por Defecto */}
                <AgentQueue
                    label="Roster Por Defecto (auto-start)"
                    labelColor="secondary"
                    icon={<AccessTimeRounded sx={{ fontSize: 14, color: "secondary.main" }} />}
                    agents={shop.roster_default}
                    emptyText="Sin vendedoras configuradas para auto-start"
                    shopColor="#9c27b0"
                />
            </Box>
        </Paper>
    );
};

/* ─────────────────────────── Main Page ─────────────────────────────── */

export const RoundRobinControl: React.FC = () => {
    const { loadingSession, isValid } = useValidateSession();
    const [data, setData] = useState<RoundRobinData | null>(null);
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState<number | null>(null);
    const [savingStrategy, setSavingStrategy] = useState(false);

    // Mover pointer dialog
    const [pointerDialog, setPointerDialog] = useState<ShopRoundRobin | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<number | "">("");
    const [movingPointer, setMovingPointer] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/settings/round-robin", "GET");
            if (status) {
                const json = await response.json();
                setData(json.data);
            } else {
                toast.error("No se pudo cargar la configuración de Round-Robin ❌");
            }
        } catch {
            toast.error("Error de conexión 🚨");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isValid) fetchData();
    }, [isValid, fetchData]);

    const handleStrategyChange = async (_: React.MouseEvent, newStrategy: string) => {
        if (!newStrategy || !data) return;
        setSavingStrategy(true);
        try {
            const { status }: IResponse = await request("/settings/strategy", "PUT", {
                strategy: newStrategy,
            } as any);
            if (status) {
                setData({ ...data, strategy: newStrategy as any });
                toast.success(`Estrategia cambiada a: ${newStrategy === "round_robin" ? "Round Robin" : "Load Balanced"} ✅`);
            } else {
                toast.error("No se pudo cambiar la estrategia ❌");
            }
        } catch {
            toast.error("Error de conexión 🚨");
        } finally {
            setSavingStrategy(false);
        }
    };

    const handleResetAll = async () => {
        if (!confirm("¿Resetear los punteros de TODAS las tiendas? La próxima orden irá a la primera vendedora de cada roster.")) return;
        try {
            const { status }: IResponse = await request("/settings/round-robin/reset", "POST", {} as any);
            if (status) {
                toast.success("Todos los punteros reseteados ✅");
                fetchData();
            } else {
                toast.error("No se pudo resetear ❌");
            }
        } catch {
            toast.error("Error de conexión 🚨");
        }
    };

    const handleResetShop = async (shopId: number) => {
        setResetting(shopId);
        try {
            const { status }: IResponse = await request("/settings/round-robin/reset", "POST", {
                shop_id: shopId,
            } as any);
            if (status) {
                toast.success("Puntero reseteado ✅");
                fetchData();
            } else {
                toast.error("No se pudo resetear ❌");
            }
        } catch {
            toast.error("Error de conexión 🚨");
        } finally {
            setResetting(null);
        }
    };

    const handleOpenPointerDialog = (shop: ShopRoundRobin) => {
        setPointerDialog(shop);
        setSelectedAgent("");
    };

    const handleMovePointer = async () => {
        if (!pointerDialog || !selectedAgent) return;
        setMovingPointer(true);
        try {
            const { status, response }: IResponse = await request("/settings/round-robin/pointer", "POST", {
                shop_id: pointerDialog.id,
                agent_id: selectedAgent,
            } as any);
            const json = await response.json();
            if (status) {
                toast.success(json.message ?? "Puntero actualizado ✅");
                setPointerDialog(null);
                fetchData();
            } else {
                toast.error(json.message ?? "No se pudo mover el puntero ❌");
            }
        } catch {
            toast.error("Error de conexión 🚨");
        } finally {
            setMovingPointer(false);
        }
    };

    if (loadingSession || !isValid) return <Loading />;

    return (
        <Layout>
            <RequireRole allowedRoles={["Admin", "Gerente"]}>
                <Box mb={3}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                        <DescripcionDeVista
                            title="Control de Round-Robin"
                            description="Gestiona el estado de asignación automática de órdenes por tienda"
                        />
                        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                            {/* Estrategia Global */}
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                    Estrategia Global
                                </Typography>
                                <ToggleButtonGroup
                                    value={data?.strategy ?? "round_robin"}
                                    exclusive
                                    onChange={handleStrategyChange}
                                    size="small"
                                    disabled={savingStrategy || loading}
                                >
                                    <ToggleButton value="round_robin" sx={{ gap: 0.5, px: 1.5 }}>
                                        <ShuffleRounded sx={{ fontSize: 16 }} />
                                        <Typography variant="caption" fontWeight="bold">Round Robin</Typography>
                                    </ToggleButton>
                                    <ToggleButton value="load_balanced" sx={{ gap: 0.5, px: 1.5 }}>
                                        <BalanceRounded sx={{ fontSize: 16 }} />
                                        <Typography variant="caption" fontWeight="bold">Load Balanced</Typography>
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Box>

                            {/* Acciones globales */}
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                    Acciones
                                </Typography>
                                <Box display="flex" gap={1}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<RefreshRounded />}
                                        onClick={fetchData}
                                        disabled={loading}
                                    >
                                        Actualizar
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<RestartAltRounded />}
                                        onClick={handleResetAll}
                                        disabled={loading}
                                    >
                                        Reset Todo
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Leyenda */}
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                    <Typography variant="caption">
                        <strong>Roster Normal</strong>: vendedoras activas hoy en el roster diario.{" "}
                        <strong>Roster Sin Stock</strong>: subconjunto con permiso "Sin Stock" (<Chip label="SS" size="small" color="error" sx={{ height: 14, fontSize: "0.6rem" }} />), comparte el mismo puntero que el normal.{" "}
                        <strong>Roster Por Defecto</strong>: vendedoras configuradas para activarse automáticamente al abrir jornada.{" "}
                        El ícono <ArrowForwardRounded sx={{ fontSize: 12 }} /> indica la <strong>siguiente</strong> en recibir una orden.
                    </Typography>
                </Alert>

                {/* Contenido */}
                {loading ? (
                    <Box display="flex" justifyContent="center" py={8}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                md: "repeat(2, 1fr)",
                                xl: "repeat(3, 1fr)",
                            },
                            gap: 2,
                        }}
                    >
                        {data?.shops.map((shop, idx) => (
                            <ShopCard
                                key={shop.id}
                                shop={shop}
                                colorIdx={idx}
                                onReset={handleResetShop}
                                onMovePointer={handleOpenPointerDialog}
                                resetting={resetting}
                            />
                        ))}
                        {data?.shops.length === 0 && (
                            <Box sx={{ gridColumn: "1/-1", textAlign: "center", py: 8, color: "text.disabled" }}>
                                <StoreRounded sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                                <Typography variant="body2">No hay tiendas configuradas</Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Dialog: Mover Puntero */}
                <Dialog
                    open={!!pointerDialog}
                    onClose={() => setPointerDialog(null)}
                    maxWidth="xs"
                    fullWidth
                >
                    <DialogTitle>
                        <Box display="flex" alignItems="center" gap={1}>
                            <PersonSearchRounded color="primary" />
                            Mover puntero — {pointerDialog?.name}
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Selecciona quién debe ser la <strong>siguiente</strong> en recibir una orden.
                        </Typography>
                        <TextField
                            select
                            fullWidth
                            label="Próxima vendedora"
                            value={selectedAgent}
                            onChange={(e) => setSelectedAgent(Number(e.target.value))}
                            sx={{ mt: 2 }}
                            size="small"
                        >
                            {(pointerDialog?.roster_normal ?? []).map((a) => (
                                <MenuItem key={a.id} value={a.id}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Avatar sx={{ width: 24, height: 24, fontSize: "0.65rem" }}>
                                            {getInitials(a.name)}
                                        </Avatar>
                                        {a.name}
                                        {a.can_handle_no_stock && (
                                            <Chip label="Sin Stock" size="small" color="error" sx={{ height: 16, fontSize: "0.6rem" }} />
                                        )}
                                        {a.is_next && (
                                            <Chip label="Actual próxima" size="small" color="primary" variant="outlined" sx={{ height: 16, fontSize: "0.6rem" }} />
                                        )}
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setPointerDialog(null)}>Cancelar</Button>
                        <Button
                            variant="contained"
                            onClick={handleMovePointer}
                            disabled={!selectedAgent || movingPointer}
                            startIcon={movingPointer ? <CircularProgress size={14} /> : <ArrowForwardRounded />}
                        >
                            Asignar como siguiente
                        </Button>
                    </DialogActions>
                </Dialog>
            </RequireRole>
        </Layout>
    );
};
