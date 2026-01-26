import { MoreHorizRounded, Check } from "@mui/icons-material";
import { IconButton, Menu, MenuList, Divider, Chip, MenuItem, ListItemIcon, ListItemText, Box, Tooltip } from "@mui/material";
import { purple, blue, green, red, yellow, grey } from "@mui/material/colors";
import { useState } from "react";
import { useUserStore } from "../../../store/user/UserStore";

export default function DenseMenu({
    data,
    changeStatus,
    icon = true,
    customComponent
}: {
    data: any,
    changeStatus: (status: string, statusId: number) => void,
    icon?: boolean,
    customComponent?: React.ReactNode
}) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    const user = useUserStore((state) => state.user);

    const statuses: { id: number, description: string, color: string, roles: string[] }[] = [
        { id: 15, description: 'Novedades', color: yellow[700], roles: ['Admin', 'Gerente', 'Repartidor', 'Agencia'] },
        { id: 16, description: 'Novedad Solucionada', color: green[300], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 3, description: 'Nuevo', color: purple[300], roles: ['Admin'] },
        { id: 12, description: 'Reprogramado', color: green[500], roles: ['Admin', 'Gerente'] },
        { id: 4, description: 'Asignado a vendedor', color: blue[500], roles: ['Admin', 'Gerente'] },
        { id: 5, description: 'Llamado 1', color: green[500], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 6, description: 'Llamado 2', color: red[500], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 7, description: 'Llamado 3', color: purple[300], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 22, description: 'Esperando Ubicacion', color: blue[500], roles: ['Admin', 'Vendedor', 'Gerente',] },
        { id: 21, description: 'Confirmado', color: green[500], roles: ['Admin', 'Vendedor', 'Gerente',] },
        { id: 8, description: 'Asignado a repartidor', color: green[500], roles: ['Admin', 'Gerente', 'Vendedor', 'Agencia'] },
        { id: 9, description: 'En ruta', color: red[500], roles: ['Admin', 'Gerente', 'Repartidor', 'Agencia'] },
        { id: 10, description: 'Programado para mas tarde', color: purple[300], roles: ['Admin', 'Gerente', 'Vendedor', 'Repartidor'] },
        { id: 11, description: 'Programado para otro dia', color: blue[500], roles: ['Admin', 'Gerente', 'Vendedor', 'Repartidor'] },
        { id: 13, description: 'Entregado', color: green[500], roles: ['Admin', 'Gerente', 'Repartidor', 'Agencia'] },
        { id: 14, description: 'Cancelado', color: red[500], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 17, description: 'Asignar a agencia', color: blue[400], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 20, description: 'Sin Stock', color: grey[700], roles: ['Admin', 'Gerente'] },
    ];

    // Statuses that Sellers can ALWAYS access without payment info
    const SELLER_PUBLIC_STATUSES = [
        'Llamado 1', 'Llamado 2', 'Llamado 3',
        'Programado para otro dia', 'Programado para mas tarde',
        'Cancelado', 'Novedad Solucionada', 'Esperando Ubicacion', 'Confirmado'
    ];

    const isSeller = user?.role?.description === 'Vendedor';
    const totalPaid = data.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
    const currentTotal = Number(data.current_total_price || 0);
    const changeAmount = totalPaid - currentTotal;

    // Valid only if:
    // 1. Payment is exact (change = 0)
    // 2. OR There is a surplus (change > 0) AND we know who covers it
    // 3. (If change < 0, there is a debt, so it stays invalid for logistics)
    const hasChangeInfo = (Math.abs(changeAmount) < 0.01) || (changeAmount > 0 && !!data.change_covered_by);
    const hasPayments = totalPaid > 0;

    return (
        <>
            {icon ? (
                <IconButton onClick={handleClick}>
                    <MoreHorizRounded />
                </IconButton>
            ) : (
                <Box component="button" onClick={handleClick} sx={{ border: 'none', background: 'none', p: 0 }}>
                    {customComponent}
                </Box>
            )}
            <Menu
                elevation={0}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                slotProps={{
                    paper: {
                        sx: {
                            width: 250,
                            padding: 0,
                            borderRadius: 4,
                            border: '1px solid rgba(150,150,150,0.5)'
                        }
                    }
                }}
            >
                <MenuList dense>
                    <Divider textAlign="left">
                        <Chip label="Status" size="small" />
                    </Divider>
                    {statuses.map((status) => {
                        const isAllowedByRole = user && status.roles.includes(user.role?.description ?? '');
                        if (!isAllowedByRole) return null;

                        // Constraint logic for Sellers
                        let isDisabled = false;
                        let tooltipTitle = "";

                        // 🔒 En Ruta Lock: Only forward to Delivered or Novedades
                        if (data.status?.description === 'En ruta') {
                            if (status.description !== 'Entregado' && status.description !== 'Novedades') {
                                isDisabled = true;
                                tooltipTitle = "Orden En Ruta solo puede pasar a Entregado o Novedades 🔒";
                            }
                        }

                        // 🔒 Agencia Novedades Lock
                        if (data.status?.description === 'Novedades' && user?.role?.description === 'Agencia') {
                            isDisabled = true;
                            tooltipTitle = "Agencia no puede gestionar Novedades 🚫";
                        }

                        // 🔒 Stock Lock: Block Entregado and En ruta if stock is insufficient
                        if (data.has_stock_warning && (status.description === 'Entregado' || status.description === 'En ruta')) {
                            isDisabled = true;
                            tooltipTitle = "No hay suficiente stock en el almacén para procesar esta orden 📦❌";
                        }

                        // 🔒 Vendedor Novedades Lock
                        if (data.status?.description === 'Novedades' && user?.role?.description === 'Vendedor') {
                            // Can resolve OR cancel
                            if (status.description !== 'Novedad Solucionada' && status.description !== 'Cancelado') {
                                isDisabled = true;
                                tooltipTitle = "Solo puede marcar como Novedad Solucionada o Cancelado ⚠️";
                            }
                        }

                        // 🔒 Vendedor Novedad Solucionada Lock
                        if (data.status?.description === 'Novedad Solucionada' && user?.role?.description === 'Vendedor') {
                            if (status.description !== 'Programado para mas tarde' && status.description !== 'Programado para otro dia') {
                                isDisabled = true;
                                tooltipTitle = "Desde Solucionada solo puede reprogramar (Otro día / Más tarde) 📅";
                            }
                        }

                        if (!isDisabled && isSeller && !SELLER_PUBLIC_STATUSES.includes(status.description)) {
                            if (!hasPayments || !hasChangeInfo) {
                                isDisabled = true;
                                tooltipTitle = "Debe registrar pagos y vuelto antes de cambiar a este estado";
                            }
                        }

                        const menuItem = (
                            <MenuItem
                                key={status.id}
                                disabled={isDisabled}
                                onClick={() => {
                                    if (!isDisabled) {
                                        changeStatus(status.description, status.id);
                                        handleClose();
                                    }
                                }}
                            >
                                {status.description === data.status?.description ? (
                                    <>
                                        <ListItemIcon>
                                            <Check sx={{ color: status.color }} />
                                        </ListItemIcon>
                                        {status.description}
                                    </>
                                ) : (
                                    <ListItemText inset>
                                        {status.description}
                                    </ListItemText>
                                )}
                            </MenuItem>
                        );

                        return isDisabled ? (
                            <Tooltip key={status.id} title={tooltipTitle} placement="left" arrow>
                                <span>{menuItem}</span>
                            </Tooltip>
                        ) : menuItem;
                    })}
                </MenuList>
            </Menu>
        </>
    );
}