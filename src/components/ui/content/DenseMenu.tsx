import { MoreHorizRounded, Check } from "@mui/icons-material";
import { IconButton, Menu, MenuList, Divider, Chip, MenuItem, ListItemIcon, ListItemText, Box, Tooltip, CircularProgress } from "@mui/material";
import { purple, blue, green, red, yellow, grey } from "@mui/material/colors";
import { useState, useEffect } from "react";
import { useUserStore } from "../../../store/user/UserStore";
import { request } from "../../../common/request";

export default function DenseMenu({
    data,
    changeStatus,
    icon = true,
    customComponent
}: {
    data: any,
    changeStatus: (status: string) => void,  // ← Solo texto, sin ID
    icon?: boolean,
    customComponent?: React.ReactNode
}) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClose = () => {
        setAnchorEl(null);
    };
    const user = useUserStore((state) => state.user);

    // Estado para los status obtenidos de la API
    const [statuses, setStatuses] = useState<{ id: number, description: string, color: string, roles: string[] }[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchStatuses = async () => {
        if (statuses.length > 0) return;
        setLoading(true);
        try {
            const { status, response } = await request('/statuses', 'GET');
            if (status === 200) {
                const data = await response.json();
                // Mapear los status de la API al formato que necesitamos
                const mappedStatuses = data.map((s: any) => ({
                    id: s.id,
                    description: s.description,
                    color: getColorForStatus(s.description),
                    roles: getRolesForStatus(s.description)
                }));
                setStatuses(mappedStatuses);
            }
        } catch (error) {
            console.error('Error fetching statuses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
        fetchStatuses();
    };

    // Función para asignar colores según el status
    const getColorForStatus = (statusName: string) => {
        const colorMap: { [key: string]: string } = {
            'Novedades': yellow[700],
            'Novedad Solucionada': green[300],
            'Nuevo': purple[300],
            'Reprogramado': green[500],
            'Asignado a vendedor': blue[500],
            'Llamado 1': green[500],
            'Llamado 2': red[500],
            'Llamado 3': purple[300],
            'Esperando Ubicacion': blue[500],
            'Confirmado': green[500],
            'Asignado a repartidor': green[500],
            'En ruta': red[500],
            'Programado para mas tarde': purple[300],
            'Programado para otro dia': blue[500],
            'Entregado': green[500],
            'Cancelado': red[500],
            'Asignar a agencia': blue[400],
            'Sin Stock': grey[700],
        };
        return colorMap[statusName] || blue[500];
    };

    // Función para asignar roles según el status
    const getRolesForStatus = (statusName: string): string[] => {
        const roleMap: { [key: string]: string[] } = {
            'Novedades': ['Admin', 'Gerente', 'Repartidor', 'Agencia'],
            'Novedad Solucionada': ['Admin', 'Gerente', 'Vendedor'],
            'Nuevo': ['Admin'],
            'Reprogramado': ['Admin', 'Gerente'],
            'Asignado a vendedor': ['Admin', 'Gerente'],
            'Llamado 1': ['Admin', 'Gerente', 'Vendedor'],
            'Llamado 2': ['Admin', 'Gerente', 'Vendedor'],
            'Llamado 3': ['Admin', 'Gerente', 'Vendedor'],
            'Esperando Ubicacion': ['Admin', 'Vendedor', 'Gerente'],
            'Confirmado': ['Admin', 'Vendedor', 'Gerente'],
            'Asignado a repartidor': ['Admin', 'Gerente', 'Vendedor', 'Agencia'],
            'En ruta': ['Admin', 'Gerente', 'Repartidor', 'Agencia'],
            'Programado para mas tarde': ['Admin', 'Gerente', 'Vendedor', 'Repartidor'],
            'Programado para otro dia': ['Admin', 'Gerente', 'Vendedor', 'Repartidor'],
            'Entregado': ['Admin', 'Gerente', 'Repartidor', 'Agencia'],
            'Cancelado': ['Admin', 'Gerente', 'Vendedor'],
            'Asignar a agencia': ['Admin', 'Gerente', 'Vendedor'],
            'Sin Stock': ['Admin', 'Gerente'],
        };
        return roleMap[statusName] || ['Admin'];
    };

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

    // Estado para reglas de flujo dinámicas
    const [transitions, setTransitions] = useState<Record<string, string[]> | null>(null);

    // Cargar reglas del backend al montar
    useEffect(() => {
        if (!user?.role?.description || ['Admin', 'Gerente', 'Master'].includes(user.role.description)) return;

        const roleKey = `flow_rules_v3_${user.role.description}`;
        const cached = sessionStorage.getItem(roleKey);

        if (cached) {
            try {
                setTransitions(JSON.parse(cached));
            } catch (e) {
                console.error("Error parsing flow rules", e);
            }
        } else {
            request('/config/flow', 'GET').then(async ({ status, response }) => {
                if (status === 200) {
                    try {
                        const data = await response.json();
                        if (data && data.transitions) {
                            sessionStorage.setItem(roleKey, JSON.stringify(data.transitions));
                            setTransitions(data.transitions);
                        }
                    } catch (e) { }
                }
            }).catch(() => { });
        }
    }, [user?.role?.description]);

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
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        statuses.map((status) => {
                            const isAllowedByRole = user && status.roles.includes(user.role?.description ?? '');
                            if (!isAllowedByRole) return null;

                            // Validaciones EXTRA (Condiciones de negocio: Stock, Pagos, etc)
                            let isDisabled = false;
                            let tooltipTitle = "";

                            // 🛡️ REGLA MAESTRA DE FLUJO (Dynamic Flow)
                            if (transitions) {
                                const currentStatus = data.status?.description;
                                // Si no hay transiciones definidas para el status actual, bloqueamos todo
                                // (a menos que sea el mismo status, para mostrar check)
                                const allowedNext = transitions[currentStatus] || [];

                                // Permitimos ver el status actual (para el check) y los permitidos
                                if (status.description !== currentStatus && !allowedNext.includes(status.description)) {
                                    isDisabled = true;
                                    tooltipTitle = `No puedes pasar de '${currentStatus}' a '${status.description}' según el flujo establecido.`;
                                }
                            }

                            // 🔒 Stock Lock: Block Entregado and En ruta if stock is insufficient
                            if (data.has_stock_warning && (status.description === 'Entregado' || status.description === 'En ruta')) {
                                isDisabled = true;
                                tooltipTitle = "No hay suficiente stock en el almacén para procesar esta orden 📦❌";
                            }

                            // 🔒 Agencia Novedades Lock (Legacy override if needed)
                            if (data.status?.description === 'Novedades' && user?.role?.description === 'Agencia') {
                                // Dejamos pasar si está en la lista de transiciones, pero si quieres bloquear adicionalmente:
                                // isDisabled = true; 
                            }

                            if (!isDisabled && isSeller && !SELLER_PUBLIC_STATUSES.includes(status.description)) {
                                // Skip payment validation for return/exchange orders
                                if (!data.is_return && !data.is_exchange) {
                                    if (!hasPayments || !hasChangeInfo) {
                                        isDisabled = true;
                                        tooltipTitle = "Debe registrar pagos y vuelto antes de cambiar a este estado";
                                    }
                                }
                            }

                            // OCULTAR OPCIONES NO DISPONIBLES (Petición usuario)
                            // Si está deshabilitado y NO es el status actual, no lo mostramos.
                            if (isDisabled && status.description !== data.status?.description) {
                                return null;
                            }

                            const menuItem = (
                                <MenuItem
                                    key={status.id}
                                    disabled={isDisabled}
                                    sx={isDisabled ? { opacity: 0.5, color: 'text.disabled' } : {}}
                                    onClick={() => {
                                        if (!isDisabled) {
                                            changeStatus(status.description);
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
                        })
                    )}
                </MenuList>
            </Menu>
        </>
    );
}