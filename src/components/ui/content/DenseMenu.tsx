import { MoreHorizRounded, Check } from "@mui/icons-material";
import { IconButton, Menu, MenuList, Divider, Chip, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { purple, blue, green, red, grey, yellow } from "@mui/material/colors";
import { useState } from "react";
import { useUserStore } from "../../../store/user/UserStore";

export default function DenseMenu({
    data,
    changeStatus,
}: {
    data: any,
    changeStatus: (status: string, statusId: number) => void
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
        { id: 1, description: 'Nuevo', color: purple[300], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 2, description: 'Asignado a vendedor', color: blue[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 3, description: 'Llamado 1', color: green[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 4, description: 'Llamado 2', color: red[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 5, description: 'Llamado 3', color: purple[300], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 6, description: 'Confirmado', color: blue[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 7, description: 'Asignado a repartidor', color: green[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 8, description: 'En ruta', color: red[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 9, description: 'Programado para mas tarde', color: purple[300], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 10, description: 'Programado para otro dia', color: blue[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 11, description: 'Reprogramado', color: green[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 12, description: 'Cambio de ubicacion', color: red[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 13, description: 'Rechazado', color: red[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 14, description: 'Entregado', color: green[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
        { id: 14, description: 'Cancelado', color: red[500], roles: ['Admin', 'Vendedor', 'Repartidor'] },
    ];
    return (
        <>
            <IconButton onClick={handleClick}>
                <MoreHorizRounded />
            </IconButton>
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
                    {statuses.map((status) => (
                        user && status.roles.includes(user.role?.description ?? '') && (
                            <MenuItem
                                key={status.id}
                                onClick={() => {
                                    changeStatus(status.description, status.id);
                                    handleClose();
                                }}
                            >
                                {status.description === data.status ? (
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
                            </MenuItem>)
                    ))}
                </MenuList>
            </Menu>
        </>
    );
}