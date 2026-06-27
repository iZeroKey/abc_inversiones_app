export const homePath = "/home"

const routeBackTargets = [
  { prefix: "/requests", target: "/users" },
]

export type AppNavigationState = {
  appBackTarget?: string
  cameFromHome?: boolean
}

export function getRouteDepth(pathname: string) {
  return pathname.split("/").filter(Boolean).length
}

export function getRouteKey(location: { pathname: string }) {
  return location.pathname
}

export function getAppBackTarget(state: unknown) {
  if (!state || typeof state !== "object") return null
  const backTarget = (state as AppNavigationState).appBackTarget
  return typeof backTarget === "string" ? backTarget : null
}

export function getCameFromHome(state: unknown) {
  return Boolean(state && typeof state === "object" && (state as AppNavigationState).cameFromHome === true)
}

export function getBackTargetPath(pathname: string, state?: unknown) {
  const routeBackTarget = getRouteBackTargetPath(pathname)
  if (routeBackTarget && routeBackTarget !== pathname) return routeBackTarget

  const stateBackTarget = getAppBackTarget(state)
  if (stateBackTarget && stateBackTarget !== pathname) return stateBackTarget

  return homePath
}

export function getPopBackTargetPath(pathname: string, state?: unknown) {
  const routeBackTarget = getRouteBackTargetPath(pathname)
  if (routeBackTarget && routeBackTarget !== pathname) return routeBackTarget

  const stateBackTarget = getAppBackTarget(state)
  if (stateBackTarget && stateBackTarget !== pathname) return stateBackTarget

  return null
}

export function shouldReplaceSectionNavigation(
  currentPath: string,
  targetPath: string,
  isMobile: boolean,
) {
  if (currentPath === targetPath) return false
  if (!isMobile) return false
  if (targetPath === homePath) return true
  if (currentPath === homePath) return false
  return true
}

export function getSectionNavigationState(
  currentPath: string,
  targetPath: string,
  isMobile: boolean,
): AppNavigationState | undefined {
  if (!isMobile || targetPath === homePath) return undefined

  return {
    appBackTarget: getBackTargetPath(targetPath),
    cameFromHome: currentPath === homePath,
  }
}

function getRouteBackTargetPath(pathname: string) {
  return routeBackTargets.find((route) => pathname.startsWith(route.prefix))?.target ?? null
}
