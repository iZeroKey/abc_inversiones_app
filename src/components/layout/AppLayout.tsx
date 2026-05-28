import { AppLayout as UIAppLayout, type NavItem } from "@/components/ui/app-layout"
import { useAuth } from "@/contexts/auth-context"
import { useUnreadNotificationsCountQuery } from "@/pages/notifications-queries"
import {
  ClipboardListIcon,
  FileTextIcon,
  HomeIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"
import React from "react"
import { useNavigate } from "react-router-dom"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { data: notificationsCount = 0 } = useUnreadNotificationsCountQuery()

  const role = user?.role || "client"
  const isAdmin = role === "admin" || user?.isOwner

  const navItems = React.useMemo<NavItem[]>(() => {
    if (isAdmin) {
      return [
        { title: "Inicio", href: "/home", icon: HomeIcon, activeColorClass: "text-blue-500", activeBgClass: "bg-blue-500/15" },
        { title: "Préstamos", href: "/loans", icon: FileTextIcon, activeColorClass: "text-emerald-500", activeBgClass: "bg-emerald-500/15" },
        { title: "Usuarios", href: "/users", icon: UsersIcon, activeColorClass: "text-purple-500", activeBgClass: "bg-purple-500/15" },
        { title: "Auditoría", href: "/audit", icon: ClipboardListIcon, activeColorClass: "text-amber-500", activeBgClass: "bg-amber-500/15" },
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
