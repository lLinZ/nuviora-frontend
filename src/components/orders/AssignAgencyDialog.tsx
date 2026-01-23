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
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";

interface AssignAgencyDialogProps {
    open: boolean;
    onClose: () => void;
    orderId: number;
    onAssigned?: (agency: any) => void;
}

export const AssignAgencyDialog: FC<AssignAgencyDialogProps> = ({
    open,
    onClose,
    orderId,
    onAssigned,
}) => {
    const [agencies, setAgencies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const { updateOrder } = useOrdersStore();

    useEffect(() => {
        if (open) {
            fetchAgencies();
        }
    }, [open]);

    const fetchAgencies = async () => {
        setLoading(true);
        try {
            const { status, response }: IResponse = await request("/users/role/Agencia", "GET");
            if (status) {
                const data = await response.json();
                setAgencies(data.data ?? []);
            } else {
                toast.error("No se pudieron obtener las agencias ❌");
            }
        } catch (e) {
            console.error("Error al obtener agencias", e);
            toast.error("Error en el servidor al cargar agencias 🚨");
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (agencyId: number) => {
        setAssigning(true);
        try {
            const body = new URLSearchParams();
            body.append("agency_id", String(agencyId));

            const { status, response }: IResponse = await request(
                `/orders/${orderId}/assign-agency`,
                "PUT",
                body
            );

            if (status) {
                const data = await response.json();
                updateOrder(data.order);

                if (onAssigned) onAssigned(data.order.agency);

                toast.success(
                    `Orden #${data.order.name} asignada a la agencia ${data.order.agency.names} 🏢`
                );
                onClose();
            } else {
                toast.error("No se pudo asignar la agencia ❌");
            }
        } catch (e) {
            console.error("Error al asignar agencia", e);
            toast.error("Error en el servidor al asignar 🚨");
        } finally {
            setAssigning(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
                Asignar a Agencia
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
                        {agencies.length > 0 ? (
                            agencies.map((agency) => (
                                <ListItem key={agency.id} disablePadding>
                                    <ListItemButton
                                        onClick={() => handleAssign(agency.id)}
                                        disabled={assigning}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                <BusinessRoundedIcon />
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={agency.names}
                                            secondary={agency.email}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))
                        ) : (
                            <Box sx={{ p: 2, textAlign: "center" }}>
                                No hay agencias disponibles
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
