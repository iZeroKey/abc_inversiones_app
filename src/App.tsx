import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import "./App.css"
import { PageTransitionRoutes } from "./components/PageTransitionRoutes"
import ProtectedRoute from "./components/ProtectedRoute"
import { AppLayout } from "./components/layout/AppLayout"
import {
  AnchoredToastProvider,
  ToastProvider,
} from "./components/ui/toast"
import { TooltipProvider } from "./components/ui/tooltip"
import { AuthProvider } from "./contexts/auth-context"
import HomePage from "./pages/HomePage"
import LoginPage from "./pages/LoginPage"
import NotificationsPage from "./pages/NotificationsPage"
import ProfilePage from "./pages/ProfilePage"

const pageTitles: Record<string, string> = {
  "/": "ABC Inversiones",
  "/login": "Iniciar sesión",
  "/home": "Inicio",
  "/profile": "Perfil",
  "/notifications": "Notificaciones",
}

function AppDocumentTitle() {
  const location = useLocation()

  useEffect(() => {
    const exactTitle = pageTitles[location.pathname]
    const title = exactTitle ?? "ABC Inversiones"

    document.title = title === "ABC Inversiones" ? title : `${title} • ABC Inversiones`
  }, [location.pathname])

  return null
}

function ProtectedAppRoutes() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <PageTransitionRoutes>
          <Route path="home" element={<HomePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </PageTransitionRoutes>
      </AppLayout>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <TooltipProvider>
      <ToastProvider>
        <AnchoredToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppDocumentTitle />
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={<ProtectedAppRoutes />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </AnchoredToastProvider>
      </ToastProvider>
    </TooltipProvider>
  )
}
export default App
