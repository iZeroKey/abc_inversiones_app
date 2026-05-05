import { useAuth } from "@/contexts/auth-context"
import {
  FileTextIcon,
  HomeIcon,
  UserIcon,
  UsersIcon,
  FolderOpenIcon,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import React from "react"
import { AppLayout as UIAppLayout, type NavItem } from "@/components/ui/app-layout"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

type NotificationsCountResponse = {
  success: boolean
  data?: {
    isRead?: boolean
  }[]
  meta?: {
    total?: number
    unreadCount?: number
  }
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, session, logout, fetchWithAuth } = useAuth()
  const navigate = useNavigate()
  const [notificationsCount, setNotificationsCount] = React.useState(0)

  const role = user?.role || "client"
  const isAdmin = role === "admin" || user?.isOwner

  const refreshNotificationsCount = React.useCallback(async () => {
    if (!session?.access_token || !API_BASE_URL) {
      setNotificationsCount(0)
      return
    }

    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/v1/notifications?isRead=false&page=1&limit=1`,
      )
      const payload =
        (await response.json().catch(() => null)) as NotificationsCountResponse | null

      if (!response.ok || !payload?.success) {
        setNotificationsCount(0)
        return
      }

      setNotificationsCount(
        payload.meta?.unreadCount ??
          payload.meta?.total ??
          payload.data?.filter((notification) => !notification.isRead).length ??
          0,
      )
    } catch {
      setNotificationsCount(0)
    }
  }, [fetchWithAuth, session?.access_token])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshNotificationsCount()
    }, 0)

    window.addEventListener("abc:notifications-updated", refreshNotificationsCount)
    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener("abc:notifications-updated", refreshNotificationsCount)
    }
  }, [refreshNotificationsCount])

  const navItems = React.useMemo<NavItem[]>(() => {
    if (isAdmin) {
      return [
        { title: "Inicio", href: "/home", icon: HomeIcon, activeColorClass: "text-blue-500", activeBgClass: "bg-blue-500/15" },
        { title: "Préstamos", href: "/loans", icon: FileTextIcon, activeColorClass: "text-emerald-500", activeBgClass: "bg-emerald-500/15" },
        { title: "Usuarios", href: "/users", icon: UsersIcon, activeColorClass: "text-purple-500", activeBgClass: "bg-purple-500/15" },
        { title: "Solicitudes", href: "/requests", icon: FolderOpenIcon, activeColorClass: "text-amber-500", activeBgClass: "bg-amber-500/15" },
        { title: "Perfil", href: "/profile", icon: UserIcon, activeColorClass: "text-slate-500", activeBgClass: "bg-slate-500/15" },
      ]
    }
    if (role === "investor") {
      return [
        { title: "Inicio", href: "/home", icon: HomeIcon, activeColorClass: "text-amber-500", activeBgClass: "bg-amber-500/15" },
        { title: "Inversiones", href: "/investments", icon: FileTextIcon, activeColorClass: "text-emerald-500", activeBgClass: "bg-emerald-500/15" },
        { title: "Perfil", href: "/profile", icon: UserIcon, activeColorClass: "text-slate-500", activeBgClass: "bg-slate-500/15" },
      ]
    }
    return [
      { title: "Inicio", href: "/home", icon: HomeIcon, activeColorClass: "text-blue-500", activeBgClass: "bg-blue-500/15" },
      { title: "Préstamos", href: "/loans", icon: FileTextIcon, activeColorClass: "text-emerald-500", activeBgClass: "bg-emerald-500/15" },
      { title: "Perfil", href: "/profile", icon: UserIcon, activeColorClass: "text-slate-500", activeBgClass: "bg-slate-500/15" },
    ]
  }, [isAdmin, role])

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  const getTitle = () => {
    if (isAdmin) return "Administración"
    if (role === "investor") return "Panel Inversionista"
    return "Mi Panel"
  }

  return (
    <UIAppLayout
      navigationItems={navItems}
      user={user}
      onLogout={handleLogout}
      notificationsCount={notificationsCount}
      headerTitle={getTitle()}
    >
      {children}
    </UIAppLayout>
  )
}
