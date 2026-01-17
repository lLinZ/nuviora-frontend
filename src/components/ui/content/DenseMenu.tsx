import { MoreHorizRounded, Check } from "@mui/icons-material";
import { IconButton, Menu, MenuList, Divider, Chip, MenuItem, ListItemIcon, ListItemText, Box } from "@mui/material";
import { purple, blue, green, red, grey, yellow } from "@mui/material/colors";
import { Fragment, useState } from "react";
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
        { id: 16, description: 'Novedades', color: yellow[700], roles: ['Admin', 'Gerente', 'Repartidor', 'Agencia'] },
        { id: 17, description: 'Novedad Solucionada', color: green[300], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 1, description: 'Nuevo', color: purple[300], roles: ['Admin'] },
        { id: 11, description: 'Reprogramado para hoy', color: green[500], roles: ['Admin', 'Gerente'] },
        { id: 2, description: 'Asignado a vendedor', color: blue[500], roles: ['Admin', 'Gerente'] },
        { id: 3, description: 'Llamado 1', color: green[500], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 4, description: 'Llamado 2', color: red[500], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 5, description: 'Llamado 3', color: purple[300], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 6, description: 'Esperando ubicacion', color: blue[500], roles: ['Admin', 'Vendedor', 'Gerente',] },
        { id: 7, description: 'Asignado a repartidor', color: green[500], roles: ['Admin', 'Gerente', 'Vendedor'] },
        { id: 8, description: 'En ruta', color: red[500], roles: ['Admin', 'Gerente', 'Repartidor', 'Agencia'] },
        { id: 9, description: 'Programado para mas tarde', color: purple[300], roles: ['Admin', 'Gerente', 'Vendedor', 'Repartidor'] },
        { id: 10, description: 'Programado para otro dia', color: blue[500], roles: ['Admin', 'Gerente', 'Vendedor', 'Repartidor'] },
        { id: 12, description: 'Cambio de ubicacion', color: red[500], roles: ['Admin', 'Gerente', 'Repartidor'] },
        { id: 13, description: 'Rechazado', color: red[500], roles: ['Admin', 'Gerente', 'Repartidor'] },
        { id: 14, description: 'Entregado', color: green[500], roles: ['Admin', 'Gerente', 'Repartidor', 'Agencia'] },
        { id: 15, description: 'Cancelado', color: red[500], roles: ['Admin', 'Gerente', 'Vendedor'] },
    ];
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