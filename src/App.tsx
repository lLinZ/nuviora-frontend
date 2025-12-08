import { ThemeProvider } from '@emotion/react';
import { CssBaseline, Theme } from '@mui/material';
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getThemeLight, getThemeDark } from './common/theme';
import { Login } from './pages/auth/Login';
import { useUserStore } from './store/user/UserStore';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/auth/Profile';
import { Orders } from './pages/Orders';
import { Currency } from './pages/currency/Currency';
import { Users } from './pages/users/Users';
import { DeliverersPage } from './pages/deliverers/Deliverers';
import { CancellationsReview } from './pages/orders/cancellations/CancellationsReview';
import { Roster } from './pages/roster/Roster';
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

function App() {
  const theme = useGetTheme()
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/cancelled" element={<CancellationsReview />} />
          <Route path="/deliverers" element={<DeliverersPage />} />
          <Route path="/currency" element={<Currency />} />
          <Route path="/users" element={<Users />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/inventory" element={<InventoryOverview />} />
          <Route path="/inventory/warehouses" element={<Warehouses />} />
          <Route path="/inventory/warehouses/:id" element={<WarehouseInventory />} />
          <Route path="/inventory/movements" element={<InventoryMovements />} />
          <Route path="/inventory/transfer" element={<StockTransfer />} />
          <Route path="/inventory/adjust" element={<StockAdjustment />} />
          <Route path="/earnings" element={<EarningsAdmin />} />
          {/* <Route path="/deliverer/my-stock" element={<DelivererStock />} /> */}
          {/* <Route path="/deliverer/stock" element={<DelivererStock />} /> */}
          <Route path="/me/earnings" element={<MyEarningsPage />} />
          <Route path="/deliverers/stock" element={<DelivererStock />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
