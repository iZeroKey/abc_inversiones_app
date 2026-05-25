import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { BellIcon, ChevronRightIcon, LogOutIcon } from "lucide-react"
import type { ElementType, MouseEvent, ReactNode } from "react"
import { useEffect, useRef } from "react"
import { Link, useLocation, useNavigate, useNavigationType } from "react-router-dom"

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
const homePath = "/home"

const routeBackTargets = [
  { prefix: "/investments/", target: "/investments" },
  { prefix: "/loans/", target: "/loans" },
  { prefix: "/requests", target: "/users" },
]

export type NavItem = {
  title: string
  href: string
  icon: ElementType
  badge?: string
  hideInBottomNav?: boolean
  activeColorClass?: string
  activeBgClass?: string
}

export type AppLayoutProps = {
  children: ReactNode
  navigationItems: NavItem[]
  user: {
    firstName?: string
    lastName?: string
    role?: string
    avatarUrl?: string | null
  } | null
  onLogout?: () => void
  onBack?: () => void
  notificationsCount?: number
  headerTitle?: string
}

export function AppLayout({
  children,
  navigationItems,
  user,
  onLogout,
  onBack,
  notificationsCount = 0,
  headerTitle = "ABC Inversiones"
}: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <AppLayoutContent
        navigationItems={navigationItems}
        user={user}
        onLogout={onLogout}
        onBack={onBack}
        notificationsCount={notificationsCount}
        headerTitle={headerTitle}
      >
        {children}
      </AppLayoutContent>
    </SidebarProvider>
  )
}

function AppLayoutContent({
  children,
  navigationItems,
  user,
  onLogout,
  onBack,
  notificationsCount,
  headerTitle,
}: AppLayoutProps) {
  const { isMobile } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const viewportRef = useRef<HTMLDivElement>(null)
  const previousLocationRef = useRef(location)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTop = 0
      }
    }, 140) // 140ms coincide con EXIT_DURATION_MS de PageTransitionRoutes

    return () => clearTimeout(timer)
  }, [location.pathname])

  useEffect(() => {
    const previousLocation = previousLocationRef.current
    const previousRoute = getRouteKey(previousLocation)
    const currentRoute = getRouteKey(location)

    if (navigationType === "POP" && previousRoute !== currentRoute) {
      const previousBackTarget = getAppBackTarget(previousLocation.state)

      if (previousBackTarget && location.pathname !== previousBackTarget) {
        navigate(previousBackTarget, { replace: true })
        return
      }
    }

    previousLocationRef.current = location
  }, [location, navigate, navigationType])

  return (
    <div
      className={cn(
        "flex h-svh w-full overflow-hidden pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]",
        isMobile ? "bg-muted/10" : "bg-background",
      )}
    >
      <AppSidebar 
        navigationItems={navigationItems} 
        user={user} 
        onLogout={onLogout}
        notificationsCount={notificationsCount}
        headerTitle={headerTitle}
      />
      <SidebarInset className="bg-transparent h-full overflow-hidden flex flex-col">
        <AppHeader
          onLogout={onLogout}
          onBack={onBack}
          notificationsCount={notificationsCount}
          headerTitle={headerTitle}
        />
        <main className="flex-1 min-w-0 relative flex flex-col min-h-0">
          <ScrollArea
            viewportRef={viewportRef}
            className="flex-1 min-h-0"
            scrollbarGutter
          >
            <div className={cn(isMobile ? "pb-28 px-4" : "")}>
              {children}
            </div>
          </ScrollArea>
        </main>
      </SidebarInset>
      <AppBottomNav navigationItems={navigationItems} />
    </div>
  )
}

function AppSidebar({ 
  navigationItems, 
  user,
  onLogout,
  notificationsCount,
  headerTitle
}: Pick<AppLayoutProps, "navigationItems" | "user" | "onLogout" | "notificationsCount" | "headerTitle">) {
  const { isMobile } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const hasUnreadNotifications = Boolean(notificationsCount && notificationsCount > 0)
  const notificationBadge = notificationsCount && notificationsCount > 99 ? "99+" : notificationsCount
  const handleSectionNavigation = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    if (location.pathname === href) {
      event.preventDefault()
      return
    }

    if (
      href === homePath &&
      getAppBackTarget(location.state) === homePath &&
      getCameFromHome(location.state)
    ) {
      event.preventDefault()
      navigate(-1)
    }
  }

  if (isMobile) return null

  const roleMap: Record<string, string> = {
    client: "Cliente",
    investor: "Inversionista",
    admin: "Administrador",
    owner: "Dueño"
  }
  const displayRole = user?.role ? (roleMap[user.role.toLowerCase()] || user.role) : ""
  const avatarSrc = resolveAvatarUrl(user?.avatarUrl)

  return (
    <Sidebar side="left" collapsible="icon" variant="sidebar" className="z-50">
      <SidebarHeader className="py-3">
        <div className="flex items-center gap-2 px-2">
          <img
            src="/favicon.svg"
            alt=""
            aria-hidden="true"
            className="size-8 rounded-md"
          />
          <span className="font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            {headerTitle || "ABC Inversiones"}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Menu principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/")
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive} tooltip={item.title} render={
                      <Link 
                        to={item.href} 
                        replace={shouldReplaceSectionNavigation(location.pathname, item.href)}
                        state={getSectionNavigationState(location.pathname, item.href)}
                        onClick={(event) => handleSectionNavigation(event, item.href)}
                        className={cn(
                          "group/link flex items-center gap-2 w-full",
                          isActive && item.activeColorClass ? item.activeColorClass : ""
                        )}
                      >
                        <item.icon 
                          className={cn(
                            "size-4 shrink-0 transition-all duration-300 ease-out group-active/link:scale-90",
                            isActive && "scale-110",
                            !isActive && "group-hover/link:scale-110"
                          )} 
                        />
                        <span className="flex-1 truncate transition-all duration-300 ease-out">{item.title}</span>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-1 py-0 h-4 group-data-[collapsible=icon]:hidden transition-all duration-300 ease-out",
                              isActive && item.activeBgClass ? item.activeBgClass : ""
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRightIcon className="size-3 ml-auto opacity-50 transition-all duration-300 ease-out group-hover/link:translate-x-0.5 group-data-[collapsible=icon]:hidden" />
                      </Link>
                    } />
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary Menu for Notifications on Desktop */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Ajustes
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={location.pathname === "/notifications"}
                  tooltip="Notificaciones" 
                  className={cn(
                    "cursor-pointer",
                    location.pathname === "/notifications"
                      ? "text-primary"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                  render={
                    <Link
                      to="/notifications"
                      replace={shouldReplaceSectionNavigation(location.pathname, "/notifications")}
                      state={getSectionNavigationState(location.pathname, "/notifications")}
                      onClick={(event) => handleSectionNavigation(event, "/notifications")}
                      className="flex items-center gap-2 w-full"
                    >
                      <div className="relative">
                        <BellIcon className="size-4 shrink-0 transition-all duration-300 ease-out" />
                        {hasUnreadNotifications && (
                          <span className="absolute -top-1.5 -right-2 flex h-3 min-w-3 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-white">
                            {notificationBadge}
                          </span>
                        )}
                      </div>
                      <span className="flex-1 truncate transition-all duration-300 ease-out">Notificaciones</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="py-3 border-t">
        <div className="flex items-center justify-between px-2 w-full overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden">
            <Avatar className="shrink-0">
              <AvatarImage key={avatarSrc} src={avatarSrc} />
              <AvatarFallback>{user?.firstName?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 gap-0.5 group-data-[collapsible=icon]:hidden overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</span>
              <span className="text-xs text-muted-foreground capitalize truncate">{displayRole}</span>
            </div>
          </div>
          <button 
            onClick={onLogout} 
            className="group-data-[collapsible=icon]:hidden text-slate-400 hover:text-destructive transition-colors shrink-0 p-2 rounded-md hover:bg-muted cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOutIcon className="size-4" />
          </button>
        </div>
        {/* Render a smaller logout button when collapsed */}
        <div className="hidden group-data-[collapsible=icon]:flex w-full justify-center mt-2">
           <button 
            onClick={onLogout} 
            className="text-slate-400 hover:text-destructive transition-colors p-2 rounded-md hover:bg-muted cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOutIcon className="size-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function resolveAvatarUrl(url?: string | null) {
  if (!url) return undefined
  if (url.startsWith("storage://")) return undefined
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url
  if (url.startsWith("/") && API_BASE_URL) return `${API_BASE_URL}${url}`
  return url
}

function getRouteDepth(pathname: string) {
  return pathname.split("/").filter(Boolean).length
}

function shouldReplaceSectionNavigation(currentPath: string, targetPath: string) {
  if (currentPath === targetPath) return false
  if (targetPath === homePath) return true
  if (currentPath === homePath) return false
  return true
}

function getSectionNavigationState(currentPath: string, targetPath: string) {
  if (targetPath === homePath) return undefined

  const backTarget = getBackTargetPath(targetPath)
  return {
    appBackTarget: backTarget,
    cameFromHome: currentPath === homePath,
  }
}

function getAppBackTarget(state: unknown) {
  if (!state || typeof state !== "object") return null
  const backTarget = (state as { appBackTarget?: unknown }).appBackTarget
  return typeof backTarget === "string" ? backTarget : null
}

function getCameFromHome(state: unknown) {
  return Boolean(state && typeof state === "object" && (state as { cameFromHome?: unknown }).cameFromHome === true)
}

function getBackTargetPath(pathname: string, state?: unknown) {
  const stateBackTarget = getAppBackTarget(state)
  if (stateBackTarget && stateBackTarget !== pathname) return stateBackTarget

  return routeBackTargets.find((route) => pathname.startsWith(route.prefix))?.target ?? homePath
}

function getRouteKey(location: { hash: string; pathname: string; search: string }) {
  return `${location.pathname}${location.search}${location.hash}`
}

function AppHeader({
  onLogout,
  onBack,
  notificationsCount,
  headerTitle
}: Pick<AppLayoutProps, "onLogout" | "onBack" | "notificationsCount" | "headerTitle">) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const location = useLocation()
  const hasUnreadNotifications = Boolean(notificationsCount && notificationsCount > 0)
  const notificationBadge = notificationsCount && notificationsCount > 99 ? "99+" : notificationsCount

  if (!isMobile) return null

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(getBackTargetPath(location.pathname, location.state), { replace: true })
    }
  }

  const handleNotificationsClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    if (location.pathname === "/notifications") {
      event.preventDefault()
    }
  }

  return (
    <header className="flex h-[calc(3.5rem+env(safe-area-inset-top,0))] pt-[env(safe-area-inset-top,0px)] shrink-0 items-center justify-between border-b bg-[#1A233A] px-4 text-white sticky top-0 z-40 shadow-sm transition-colors">
      <div className="flex items-center gap-3">
        {(onBack || getRouteDepth(location.pathname) > 1) && (
          <button onClick={handleBack} className="text-white/80 hover:text-white transition-colors cursor-pointer mr-1">
            <ChevronRightIcon className="size-5 rotate-180" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="font-medium tracking-tight">{headerTitle}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          to="/notifications"
          replace={shouldReplaceSectionNavigation(location.pathname, "/notifications")}
          state={getSectionNavigationState(location.pathname, "/notifications")}
          onClick={handleNotificationsClick}
          className="relative text-white/80 hover:text-white transition-colors cursor-pointer block"
        >
          <BellIcon className="size-5" />
          {hasUnreadNotifications && (
            <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              {notificationBadge}
            </span>
          )}
        </Link>
        <button onClick={onLogout} className="text-white/80 hover:text-white transition-colors cursor-pointer">
          <LogOutIcon className="size-5" />
        </button>
      </div>
    </header>
  )
}

function AppBottomNav({ navigationItems }: Pick<AppLayoutProps, "navigationItems">) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isMobile } = useSidebar()

  if (!isMobile) return null

  const bottomItems = navigationItems.filter(item => !item.hideInBottomNav)
  const handleSectionNavigation = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    if (location.pathname === href) {
      event.preventDefault()
      return
    }

    if (
      href === homePath &&
      getAppBackTarget(location.state) === homePath &&
      getCameFromHome(location.state)
    ) {
      event.preventDefault()
      navigate(-1)
    }
  }

  return (
    <div className="fixed left-[calc(env(safe-area-inset-left,0)+1rem)] right-[calc(env(safe-area-inset-right,0)+1rem)] bottom-[calc(env(safe-area-inset-bottom,0)+1rem)] z-50">
      <div className="flex items-center justify-between rounded-4xl bg-background/95 px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md">
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== homePath && location.pathname.startsWith(item.href + "/"))
          const activeTextColor = item.activeColorClass || "text-primary"
          const activeBgColor = item.activeBgClass || "bg-primary/15"

          return (
            <Link
              key={item.href}
              to={item.href}
              replace={shouldReplaceSectionNavigation(location.pathname, item.href)}
              state={getSectionNavigationState(location.pathname, item.href)}
              onClick={(event) => handleSectionNavigation(event, item.href)}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-1 flex-1 min-w-0 outline-none transition-colors duration-300 ease-out",
                isActive ? activeTextColor : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transform-gpu transition-all duration-300 ease-out group-active:scale-95",
                  isActive
                    ? activeBgColor
                    : "bg-transparent group-hover:bg-foreground/10"
                )}
              >
                <item.icon 
                  className={cn(
                    "size-5 transform-gpu transition-all duration-300 ease-out group-active:scale-95"
                  )} 
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-opacity duration-300 ease-out truncate w-full text-center px-1", 
                isActive ? "opacity-100 font-bold" : "opacity-70 group-hover:opacity-100"
              )}>
                {item.title}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
