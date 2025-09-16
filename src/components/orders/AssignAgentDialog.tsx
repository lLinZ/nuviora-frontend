import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    CircularProgress
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { IResponse } from "../../interfaces/response-type";
import { request } from "../../common/request";

interface AssignAgentDialogProps {
    open: boolean;
    onClose: () => void;
    orderId: string;
    onAssigned: (agent: any) => void;
}

export const AssignAgentDialog: React.FC<AssignAgentDialogProps> = ({
    open,
    onClose,
    orderId,
    onAssigned
}) => {
    const [agents, setAgents] = useState<any[]>([]);
    const [selected, setSelected] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            const fetchAgents = async () => {
                setLoading(true);
                const { status, response }: IResponse = await request("/users/agents", "GET");
                if (status) {
                    const data = await response.json();
                    console.log({ data });
                    setAgents(data.data ?? []);
                }
                setLoading(false);
            };
            fetchAgents();
        }
    }, [open]);

    const handleAssign = async () => {
        if (!selected) return;
        setLoading(true);
        const body = new URLSearchParams();
        body.append("agent_id", selected);
        const { status, response }: IResponse = await request(
            `/orders/${orderId}/assign-agent`,
            "PUT",
            body
        );
        if (status) {
            const data = await response.json();
            onAssigned(data.agent); // le pasamos el nuevo vendedor al padre
            onClose();
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Asignar vendedor</DialogTitle>
            <DialogContent>
                {loading ? (
                    <CircularProgress />
                ) : (
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel id="select-agent-label">Vendedor</InputLabel>
                        <Select
                            labelId="select-agent-label"
                            value={selected}
                            onChange={(e) => setSelected(e.target.value)}
                            label="Vendedor"
                        >
                            {agents.map((agent) => (
                                <MenuItem key={agent.id} value={agent.id}>
                                    {agent.names} {agent.surnames} {`(${agent.email})`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleAssign} disabled={!selected || loading}>
                    Asignar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
