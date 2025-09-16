import { MoreHorizRounded, Check } from "@mui/icons-material";
import { IconButton, Menu, MenuList, Divider, Chip, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { purple, blue, green, red, grey, yellow } from "@mui/material/colors";
import { useState } from "react";

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

    const statuses: { id: number, description: string, color: string }[] = [
        { id: 2, description: 'Nuevo', color: purple[300] },
        { id: 3, description: 'Asignado a vendedora', color: blue[500] },
        { id: 4, description: 'Llamado 1', color: green[500] },
        { id: 5, description: 'Llamado 2', color: red[500] },
        { id: 6, description: 'Llamado 3', color: purple[300] },
        { id: 7, description: 'Confirmado', color: blue[500] },
        { id: 8, description: 'Asignado a repartidor', color: green[500] },
        { id: 9, description: 'En ruta', color: red[500] },
        { id: 10, description: 'Programado para mas tarde', color: purple[300] },
        { id: 11, description: 'Programado para otro dia', color: blue[500] },
        { id: 12, description: 'Reprogramado', color: green[500] },
        { id: 13, description: 'Cambio de ubicacion', color: red[500] },
        { id: 14, description: 'Rechazado', color: red[500] },
        { id: 15, description: 'Entregado', color: red[500] },
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
                        </MenuItem>
                    ))}
                </MenuList>
            </Menu>
        </>
    );
}