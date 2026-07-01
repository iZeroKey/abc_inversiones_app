import { useEffect, useRef, useState } from "react"
import {
    Routes,
    useLocation,
    useNavigationType,
    type RoutesProps,
} from "react-router-dom"

import { cn } from "@/lib/utils"

const EXIT_DURATION_MS = 140

export function PageTransitionRoutes({ children }: RoutesProps) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [transition, setTransition] = useState({
    direction: "forward" as "forward" | "back",
    displayLocation: location,
    stage: "enter" as "enter" | "exit",
  })
  const latestTransitionKey = useRef(location.key)

  useEffect(() => {
    if (location.key === latestTransitionKey.current) return

    const currentRoute = transition.displayLocation.pathname
    const nextRoute = location.pathname

    if (currentRoute === nextRoute) {
      const sameRouteTimeoutId = window.setTimeout(() => {
        latestTransitionKey.current = location.key
        setTransition((current) => ({
          ...current,
          displayLocation: location,
          stage: "enter",
        }))
      }, 0)

      return () => window.clearTimeout(sameRouteTimeoutId)
    }

    const direction = navigationType === "POP" ? "back" : "forward"

    const exitTimeoutId = window.setTimeout(() => {
      setTransition((current) => ({
        ...current,
        direction,
        stage: "exit",
      }))
    }, 0)

    const enterTimeoutId = window.setTimeout(() => {
      latestTransitionKey.current = location.key
      setTransition({
        direction,
        displayLocation: location,
        stage: "enter",
      })
    }, EXIT_DURATION_MS)

    return () => {
      window.clearTimeout(exitTimeoutId)
      window.clearTimeout(enterTimeoutId)
    }
  }, [location, navigationType, transition.displayLocation.pathname])

  return (
    <div
      key={transition.displayLocation.pathname}
      className={cn(
        "route-transition",
        `route-transition--${transition.stage}`,
        `route-transition--${transition.direction}`,
      )}
    >
      <Routes location={transition.displayLocation}>{children}</Routes>
    </div>
  )
}
