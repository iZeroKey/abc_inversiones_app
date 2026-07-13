import { lazy, Suspense, useEffect, type ReactNode } from "react"
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import "./App.css"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { PageTransitionRoutes } from "./components/PageTransitionRoutes"
import ProtectedRoute from "./components/ProtectedRoute"
import { AppLayout } from "./components/layout/AppLayout"
import { Skeleton } from "./components/ui/skeleton"
import {
  AnchoredToastProvider,
  ToastProvider,
} from "./components/ui/toast"
import { TooltipProvider } from "./components/ui/tooltip"
import { AuthProvider } from "./contexts/auth-context"
import { RealtimeProvider } from "./contexts/realtime-context"
import { InitialReveal } from "./components/InitialReveal"
import { AppQueryProvider } from "./lib/query-client"

const AuditPage = lazy(() => import("./pages/AuditPage"))
const HomePage = lazy(() => import("./pages/HomePage"))
const LoansPage = lazy(() => import("./pages/LoansPage"))
const LoginPage = lazy(() => import("./pages/LoginPage"))
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"))
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const UsersPage = lazy(() => import("./pages/UsersPage"))

const pageTitles: Record<string, string> = {
  "/": "ABC Inversiones",
  "/login": "Iniciar sesión",
  "/home": "Inicio",
  "/loans": "Préstamos",
  "/investments": "Inversiones",
  "/users": "Usuarios",
  "/requests": "Solicitudes",
  "/audit": "Auditoría",
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
          <Route path="home" element={<RouteChunk><HomePage /></RouteChunk>} />
          <Route path="loans" element={<RouteChunk><LoansPage /></RouteChunk>} />
          <Route path="investments" element={<RouteChunk><LoansPage /></RouteChunk>} />
          <Route path="users" element={<RouteChunk><UsersPage /></RouteChunk>} />
          <Route path="requests" element={<RouteChunk><UsersPage initialTab="requests" /></RouteChunk>} />
          <Route path="audit" element={<RouteChunk><AuditPage /></RouteChunk>} />
          <Route path="profile" element={<RouteChunk><ProfilePage /></RouteChunk>} />
          <Route path="notifications" element={<RouteChunk><NotificationsPage /></RouteChunk>} />
          <Route path="*" element={<RouteChunk><NotFoundPage /></RouteChunk>} />
        </PageTransitionRoutes>
      </AppLayout>
    </ProtectedRoute>
  )
}

function RouteChunk({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}

function RouteFallback() {
  return (
    <div className="min-h-[calc(100svh-4rem)] w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-8 w-56 max-w-[70vw]" />
            <Skeleton className="h-4 w-80 max-w-[82vw]" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-md" />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-3">
            <Skeleton className="h-11 rounded-md" />
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-md" />
            ))}
          </div>
          <Skeleton className="hidden min-h-96 rounded-md lg:block" />
        </div>
      </div>
    </div>
  )
}

function AppFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <img
          src="/favicon.svg"
          alt=""
          aria-hidden="true"
          className="size-12 rounded-md"
        />
        <div className="w-full space-y-3">
          <Skeleton className="mx-auto h-4 w-44" />
          <Skeleton className="mx-auto h-4 w-64 max-w-full" />
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <ToastProvider>
          <AnchoredToastProvider>
            <AppQueryProvider>
              <AuthProvider>
                <RealtimeProvider>
                  <HashRouter>
                  <AppDocumentTitle />
                  <Suspense fallback={<AppFallback />}>
                    <InitialReveal>
                      <Routes>
                        <Route path="/" element={<Navigate to="/home" replace />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/*" element={<ProtectedAppRoutes />} />
                      </Routes>
                    </InitialReveal>
                  </Suspense>
                </HashRouter>
              </RealtimeProvider>
            </AuthProvider>
          </AppQueryProvider>
        </AnchoredToastProvider>
      </ToastProvider>
    </TooltipProvider>
    </ErrorBoundary>
  )
}
export default App
