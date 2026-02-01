import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    CircularProgress,
    ListItemButton,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, { FC, useEffect, useState } from "react";
import { ButtonCustom } from "../custom";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { toast } from "react-toastify";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { SquareOutlined } from "@mui/icons-material";

interface AssignAgentDialogProps {
    open: boolean;
    onClose: () => void;
    orderId: number;
    onAssigned?: (agent: any) => void;
}

export const AssignAgentDialog: FC<AssignAgentDialogProps> = ({
    open,
    onClose,
    orderId,
    onAssigned,
}) => {
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const { updateOrderInColumns } = useOrdersStore();

    useEffect(() => {
        if (open) {
            fetchAgents();
        }
    }, [open]);

    const fetchAgents = async () => {
        setLoading(true);
        console.log("Fetching agents...");
        try {
            const { status, response }: IResponse = await request("/users/agents", "GET");
            if (status === 200) {
                const data = await response.json();
                console.log("Agents loaded:", data.data?.length);
                setAgents(data.data ?? []);
            } else {
                console.error("Failed to fetch agents", response);
                toast.error("No se pudieron obtener los vendedores ❌");
            }
        } catch (e) {
            console.error("Error al obtener agentes", e);
            toast.error("Error en el servidor al cargar vendedores 🚨");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (agentId: number) => {
        setAssigning(true);
        try {
            const body = new URLSearchParams();
            body.append("agent_id", String(agentId));

            const { status, response }: IResponse = await request(
                `/orders/${orderId}/assign-agent`,
                "PUT",
                body
            );

            if (status) {
                const data = await response.json();

                // 🔹 Asegúrate de que se actualice TODO (status + agent)
                updateOrderInColumns(data.order);

                if (onAssigned) onAssigned(data.order.agent);

                toast.success(
                    `Orden #${data.order.name} asignada a ${data.order.agent.names} 👩‍💼`
                );
                onClose();
            } else {
                toast.error("No se pudo asignar el vendedor ❌");
            }
        } catch (e) {
            console.error("Error al asignar vendedor", e);
            toast.error("Error en el servidor al asignar 🚨");
        } finally {
            setAssigning(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
                Asignar vendedor
                <IconButton onClick={onClose}>
                    <CloseRoundedIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <List>
                        {agents.length > 0 ? (
                            agents.map((agent) => (
                                <ListItem key={agent.id} disablePadding>
                                    <ListItemButton
                                        onClick={() => handleAssign(agent.id)}
                                        disabled={assigning}
                                    >
                                        <ListItemAvatar>
                                            <Avatar>{agent.names.charAt(0)}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={`${agent.names} ${agent.surnames}`}
                                            secondary={agent.email}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))
                        ) : (
                            <Box sx={{ p: 2, textAlign: "center" }}>
                                No hay vendedores disponibles
                            </Box>
                        )}
                    </List>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <ButtonCustom variant="outlined" onClick={onClose} disabled={assigning}>
                    Cerrar
                </ButtonCustom>
            </DialogActions>
        </Dialog>
    );
};
