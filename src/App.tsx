import { ThemeProvider } from '@emotion/react';
import { CssBaseline, Theme } from '@mui/material';
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getThemeLight, getThemeDark } from './common/theme';
import { Login } from './pages/auth/Login';
import { TestRegister } from './pages/auth/TestRegister';

import { RecoverPassword } from './pages/auth/RecoverPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { useUserStore } from './store/user/UserStore';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/auth/Profile';
import { Orders } from './pages/Orders';
import { Currency } from './pages/currency/Currency';
import { Users } from './pages/users/Users';
import { DeliverersPage } from './pages/deliverers/Deliverers';
import { CancellationsReview } from './pages/orders/cancellations/CancellationsReview';
// import { Roster } from './pages/roster/Roster';
// import { InventoryPage } from './pages/inventory/Inventory';
import { InventoryOverview } from './pages/inventory/InventoryOverview';
import { Warehouses } from './pages/inventory/Warehouses';
import { WarehouseInventory } from './pages/inventory/WarehouseInventory';
import { InventoryMovements } from './pages/inventory/InventoryMovements';
import { StockTransfer } from './pages/inventory/StockTransfer';
import { StockAdjustment } from './pages/inventory/StockAdjustment';
import { DelivererStock } from './pages/deliverers/DelivererStock';
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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/test-register" element={<TestRegister />} />
          <Route path="/recover-password" element={<RecoverPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/cancelled" element={<CancellationsReview />} />
          <Route path="/deliverers" element={<DeliverersPage />} />
          <Route path="/currency" element={<Currency />} />
          <Route path="/users" element={<Users />} />
          {/* <Route path="/roster" element={<Roster />} /> */}

          {/* Unified Inventory Dashboard */}
          <Route path="/inventory" element={<InventoryDashboard />} />
          <Route path="/inventory/warehouses" element={<InventoryDashboard />} />
          <Route path="/inventory/warehouses/:id" element={<WarehouseInventory />} />
          <Route path="/inventory/movements" element={<InventoryDashboard />} />
          <Route path="/inventory/transfer" element={<InventoryDashboard />} />
          <Route path="/inventory/adjust" element={<InventoryDashboard />} />
          <Route path="/deliverers/stock" element={<InventoryDashboard />} />

          <Route path="/earnings" element={<EarningsAdmin />} />
          <Route path="/me/earnings" element={<MyEarningsPage />} />
          <Route path="/shops" element={<Shops />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/business-metrics" element={<BusinessMetrics />} />
          <Route path="/cities" element={<Cities />} />
          <Route path="/admin/company-accounts" element={<CompanyAccounts />} />
          <Route path="/admin/banks" element={<Banks />} />
          <Route path="/admin/pending-vueltos" element={<PendingVueltos />} />

          {/* VISTA LITE DE VENTAS */}
          <Route path="/ordenes" element={<SalesLite />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}


export default App
