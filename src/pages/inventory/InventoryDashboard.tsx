import React, { useState, useEffect } from 'react';
import {
    Box,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Warehouse as WarehouseIcon,
    Inventory as InventoryIcon,
    LocalShipping as DelivererIcon,
    SwapHoriz as OperationIcon,
    History as HistoryIcon
} from '@mui/icons-material';
import { Layout } from '../../components/ui/Layout';
import { DescripcionDeVista } from '../../components/ui/content/DescripcionDeVista';
import { useValidateSession } from '../../hooks/useValidateSession';
import { Loading } from '../../components/ui/content/Loading';
import { useLocation, useNavigate } from 'react-router-dom';

// Tab Contents (We'll reuse existing logic or import transformed components)
import { Warehouses } from './Warehouses';
import { InventoryOverview as GlobalInventory } from './InventoryOverview';
import { DelivererStock } from '../deliverers/DelivererStock';
import { StockTransfer } from './StockTransfer';
import { StockAdjustment } from './StockAdjustment';
import { InventoryMovements } from './InventoryMovements';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`inventory-tabpanel-${index}`}
            aria-labelledby={`inventory-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export const InventoryDashboard: React.FC = () => {
    const { loadingSession, isValid, user } = useValidateSession();
    const location = useLocation();

    const roleDesc = user?.role?.description ?? "Repartidor";
    const isAdminOrAgencia = roleDesc === 'Admin' || roleDesc === 'Agencia';

    // Define tabs with their requirements
    const allTabs = [
        { label: 'Inventario Global', icon: <InventoryIcon />, component: <GlobalInventory isEmbedded />, roles: ['Admin', 'Agencia'], path: '/inventory' },
        { label: 'Almacenes', icon: <WarehouseIcon />, component: <Warehouses isEmbedded />, roles: ['Admin', 'Agencia'], path: '/warehouses' },
        { label: 'Stock Repartidores', icon: <DelivererIcon />, component: <DelivererStock isEmbedded />, roles: ['Admin', 'Agencia', 'Repartidor'], path: '/deliverers/stock' },
        {
            label: 'Operaciones', icon: <OperationIcon />, component: (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <StockTransfer isEmbedded />
                    <StockAdjustment isEmbedded />
                </Box>
            ), roles: ['Admin'], path: '/operations'
        },
        { label: 'Historial', icon: <HistoryIcon />, component: <InventoryMovements isEmbedded />, roles: ['Admin', 'Agencia'], path: '/movements' },
    ];

    const availableTabs = allTabs.filter(tab => tab.roles.includes(roleDesc));

    // Determine initial tab
    const getInitialTabIndex = () => {
        const path = location.pathname;
        const index = availableTabs.findIndex(tab => path.includes(tab.path));
        return index !== -1 ? index : 0;
    };

    const [value, setValue] = useState(getInitialTabIndex());

    // Sync tab with URL if needed (optional but good)
    useEffect(() => {
        setValue(getInitialTabIndex());
    }, [location.pathname]);

    const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    if (loadingSession || !isValid || !user.token) return <Loading />;

    return (
        <Layout>
            <DescripcionDeVista
                title="Centro de Control de Inventario"
                description={isAdminOrAgencia ? "Gestión centralizada de almacenes, stock global, repartidores y movimientos." : "Gestión de stock personal y entregas."}
            />

            <Box sx={{ width: '100%', mt: 2 }}>
                {availableTabs.length > 1 && (
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', borderRadius: '12px 12px 0 0' }}>
                        <Tabs
                            value={value}
                            onChange={handleChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            aria-label="inventory dashboard tabs"
                            sx={{
                                px: 2,
                                '& .MuiTab-root': {
                                    minHeight: 64,
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }
                            }}
                        >
                            {availableTabs.map((tab, index) => (
                                <Tab key={index} icon={tab.icon} iconPosition="start" label={tab.label} />
                            ))}
                        </Tabs>
                    </Box>
                )}

                {availableTabs.map((tab, index) => (
                    <TabPanel key={index} value={value} index={index}>
                        {tab.component}
                    </TabPanel>
                ))}
            </Box>
        </Layout>
    );
};

