import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Theme } from '@mui/material';
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getThemeLight, getThemeDark } from './common/theme';
import { Login } from './pages/auth/Login';
import { TestRegister } from './pages/auth/TestRegister';

import { RecoverPassword } from './pages/auth/RecoverPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { useUserStore } from './store/user/UserStore';
import { RequireRole } from './components/auth/RequireRole';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/auth/Profile';
import { Orders } from './pages/Orders';
import { Currency } from './pages/currency/Currency';
import { Users } from './pages/users/Users';
import { DeliverersPage } from './pages/deliverers/Deliverers';
import { CancellationsReview } from './pages/orders/cancellations/CancellationsReview';
// import { Roster } from './pages/roster/Roster';
import { WarehouseInventory } from './pages/inventory/WarehouseInventory';
import { EarningsAdmin } from './pages/money/EarningsAdmin';
import { MyEarningsPage } from './pages/money/EarningsMyPage';
import { Shops } from './pages/shops/Shops';
import { Metrics } from './pages/Metrics';
import { BusinessMetrics } from './pages/BusinessMetrics';
import { Cities } from './pages/Cities';
import { CompanyAccounts } from './pages/admin/CompanyAccounts';
import { Banks } from './pages/admin/Banks';
import { PendingVueltos } from './pages/admin/PendingVueltos';
import { SalesLite } from './pages/lite/SalesLite';

const useGetTheme = () => {
  const user = useUserStore((state) => state.user);
  const [theme, setTheme] = useState<Theme>(getThemeLight('#0073ff'))

  useEffect(() => {
    const color = user?.color || '#0073ff';
    if (user?.theme === 'dark') {
      setTheme(getThemeDark(color));
    } else {
      setTheme(getThemeLight(color));
    }
  }, [user?.theme, user?.color])
  return theme
}

import { InventoryDashboard } from './pages/inventory/InventoryDashboard';

function App() {
  const theme = useGetTheme()
  const isLite = useUserStore((s) => s.user.is_lite_view);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/test-register" element={<TestRegister />} />
          <Route path="/recover-password" element={<RecoverPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/dashboard" element={
            <RequireRole>
              {isLite ? <SalesLite /> : <Dashboard />}
            </RequireRole>
          } />

          <Route path="/profile" element={<RequireRole><Profile /></RequireRole>} />

          <Route path="/orders" element={
            <RequireRole>
              {isLite ? <SalesLite /> : <Orders />}
            </RequireRole>
          } />

          <Route path="/orders/cancelled" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><CancellationsReview /></RequireRole>} />
          <Route path="/deliverers" element={<RequireRole allowedRoles={['Admin']}><DeliverersPage /></RequireRole>} />
          <Route path="/currency" element={<RequireRole allowedRoles={['Admin']}><Currency /></RequireRole>} />
          <Route path="/users" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><Users /></RequireRole>} />

          {/* Unified Inventory Dashboard */}
          <Route path="/inventory" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/inventory/warehouses" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/inventory/warehouses/:id" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><WarehouseInventory /></RequireRole>} />
          <Route path="/inventory/movements" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/inventory/transfer" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/inventory/adjust" element={<RequireRole allowedRoles={['Admin', 'Agencia']}><InventoryDashboard /></RequireRole>} />
          <Route path="/deliverers/stock" element={<RequireRole allowedRoles={['Repartidor']}><InventoryDashboard /></RequireRole>} />

          <Route path="/earnings" element={<RequireRole allowedRoles={['Admin']}><EarningsAdmin /></RequireRole>} />
          <Route path="/me/earnings" element={<RequireRole allowedRoles={['Vendedor', 'Repartidor', 'Gerente']}><MyEarningsPage /></RequireRole>} />
          <Route path="/shops" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><Shops /></RequireRole>} />
          <Route path="/metrics" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><Metrics /></RequireRole>} />
          <Route path="/business-metrics" element={<RequireRole allowedRoles={['Admin']}><BusinessMetrics /></RequireRole>} />
          <Route path="/cities" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><Cities /></RequireRole>} />
          <Route path="/admin/company-accounts" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><CompanyAccounts /></RequireRole>} />
          <Route path="/admin/banks" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><Banks /></RequireRole>} />
          <Route path="/admin/pending-vueltos" element={<RequireRole allowedRoles={['Admin', 'Gerente']}><PendingVueltos /></RequireRole>} />

          {/* VISTA LITE DE VENTAS */}
          <Route path="/ordenes" element={
            <RequireRole>
              {isLite ? <SalesLite /> : <Dashboard />}
            </RequireRole>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
