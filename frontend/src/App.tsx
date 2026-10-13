import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import { Layout } from './components/Layout'
import { AddItemPage } from './pages/AddItemPage'
import { AuthPage } from './pages/AuthPage'
import { OutfitsPage } from './pages/OutfitsPage'
import { WardrobePage } from './pages/WardrobePage'

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <AuthPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<WardrobePage />} />
        <Route path="add" element={<AddItemPage />} />
        <Route path="outfits" element={<OutfitsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
