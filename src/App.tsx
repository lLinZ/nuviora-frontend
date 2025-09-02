import { ThemeProvider } from '@emotion/react';
import { CssBaseline, Theme } from '@mui/material';
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { themeLight, themeDark } from './common/theme';
import { Login } from './pages/auth/Login';
import { useUserStore } from './store/user/UserStore';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/auth/Profile';
import { Orders } from './pages/Orders';
import { Currency } from './pages/currency/Currency';
const useGetTheme = () => {
  const user = useUserStore((state) => state.user);
  const [theme, setTheme] = useState<Theme>(themeLight)
  useEffect(() => {
    if (user?.theme === 'dark') {
      setTheme(themeDark);
    } else {
      setTheme(themeLight);
    }
  }, [user?.theme])
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
          <Route path="/currency" element={<Currency />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
