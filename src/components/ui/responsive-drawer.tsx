"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"

import {
  Drawer as DrawerBase,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerPrimitive,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// History integration (ported from sheet.tsx, adapted for Drawer)
// ---------------------------------------------------------------------------

const drawerHistoryStateKey = "__abcDrawerEntry"
let nextDrawerHistoryId = 0
let drawerHistoryDepth = 0
let ignoreNextDrawerPop = false
let popStateListenerAttached = false
const closingFromPopIds = new Set<number>()
const drawerBackStack: { close: () => void; id: number }[] = []

export type DrawerHistoryMode = "auto" | "always" | "never"

type DrawerRootProps = React.ComponentProps<typeof DrawerBase>

function useDrawerHistoryEnabled(historyMode: DrawerHistoryMode) {
  const isMobile = useIsMobile()

  if (historyMode === "always") return true
  if (historyMode === "never") return false
  return isMobile
}

function useDrawerBackNavigation(
  open: boolean | undefined,
  onOpenChange: DrawerPrimitive.Root.Props["onOpenChange"],
) {
  const hasOpenChange = Boolean(onOpenChange)
  const onOpenChangeRef = useRef(onOpenChange)
  const unregisterRef = useRef<(() => void) | null>(null)
  const pendingUnregisterRef = useRef<number | null>(null)

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  useEffect(() => {
    if (!open || !hasOpenChange || typeof window === "undefined") return

    const scheduleUnregister = () => {
      pendingUnregisterRef.current = window.setTimeout(() => {
        unregisterRef.current?.()
        unregisterRef.current = null
        pendingUnregisterRef.current = null
      }, 0)
    }

    if (pendingUnregisterRef.current !== null) {
      window.clearTimeout(pendingUnregisterRef.current)
      pendingUnregisterRef.current = null
      return scheduleUnregister
    }

    const unregister = registerDrawerBackHandler(() => {
      onOpenChangeRef.current?.(false, new Event("popstate"), "popstate")
    })
    unregisterRef.current = unregister

    return scheduleUnregister
  }, [hasOpenChange, open])
}

function registerDrawerBackHandler(close: () => void) {
  attachDrawerPopStateListener()

  const id = nextDrawerHistoryId + 1
  nextDrawerHistoryId = id
  drawerBackStack.push({ close, id })
  pushDrawerHistoryEntry(id)

  return () => unregisterDrawerBackHandler(id)
}

function attachDrawerPopStateListener() {
  if (popStateListenerAttached || typeof window === "undefined") return

  window.addEventListener("popstate", handleDrawerPopState)
  popStateListenerAttached = true
}

function handleDrawerPopState() {
  if (ignoreNextDrawerPop) {
    ignoreNextDrawerPop = false
    return
  }

  if (drawerHistoryDepth > 0) {
    drawerHistoryDepth -= 1
  }

  const topDrawer = drawerBackStack.at(-1)
  if (!topDrawer) return

  closingFromPopIds.add(topDrawer.id)
  topDrawer.close()
}

function pushDrawerHistoryEntry(id: number) {
  const currentState = getCurrentHistoryState()
  window.history.pushState(
    { ...currentState, [drawerHistoryStateKey]: id },
    "",
    window.location.href,
  )
  drawerHistoryDepth += 1
}

function unregisterDrawerBackHandler(id: number) {
  const stackIndex = drawerBackStack.findIndex((entry) => entry.id === id)
  if (stackIndex === -1) return

  const wasTopDrawer = stackIndex === drawerBackStack.length - 1
  drawerBackStack.splice(stackIndex, 1)

  if (closingFromPopIds.delete(id)) return
  if (!wasTopDrawer || drawerHistoryDepth <= 0) return
  if (getCurrentDrawerHistoryId() !== id) return

  ignoreNextDrawerPop = true
  drawerHistoryDepth -= 1
  window.history.back()
}

function getCurrentHistoryState(): Record<string, unknown> {
  const state = window.history.state
  return state && typeof state === "object" ? state : {}
}

function getCurrentDrawerHistoryId() {
  const id = getCurrentHistoryState()[drawerHistoryStateKey]
  return typeof id === "number" ? id : null
}

// ---------------------------------------------------------------------------
// ResponsiveDrawer — root wrapper with history integration
// ---------------------------------------------------------------------------

export function ResponsiveDrawer({
  historyMode = "auto",
  onOpenChange,
  open,
  ...props
}: DrawerRootProps & { historyMode?: DrawerHistoryMode }): React.ReactElement {
  const drawerHistoryEnabled = useDrawerHistoryEnabled(historyMode)
  useDrawerBackNavigation(drawerHistoryEnabled ? open : false, onOpenChange)

  return <DrawerBase onOpenChange={onOpenChange} open={open} {...props} />
}

// ---------------------------------------------------------------------------
// ResponsiveDrawerContent
// ---------------------------------------------------------------------------

type HorizontalSide = "left" | "right"

type ResponsiveDrawerContentProps = {
  children: React.ReactNode
  className?: string
  contentKey?: React.Key
  defaultDesktopWidth?: number
  maxDesktopWidth?: number
  minDesktopWidth?: number
  resizable?: boolean
  mobileSide?: "bottom" | "top"
  desktopSide?: "right" | "left"
  style?: React.CSSProperties
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export function ResponsiveDrawerContent({
  children,
  className,
  contentKey,
  defaultDesktopWidth = 720,
  maxDesktopWidth = 1120,
  minDesktopWidth = 420,
  resizable = true,
  mobileSide = "bottom",
  desktopSide = "right",
  style,
}: ResponsiveDrawerContentProps): React.ReactElement {
  const isMobile = useIsMobile()
  const resolvedSide = isMobile ? mobileSide : desktopSide
  const horizontalSide: HorizontalSide = resolvedSide === "left" ? "left" : "right"
  const [desktopWidth, setDesktopWidth] = useState(() =>
    clamp(defaultDesktopWidth, minDesktopWidth, maxDesktopWidth),
  )
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ startWidth: number; startX: number } | null>(null)
  const isDesktop = !isMobile && (resolvedSide === "left" || resolvedSide === "right")
  const resizeEnabled = resizable && isDesktop
  const resolvedDesktopWidth = clamp(desktopWidth, minDesktopWidth, maxDesktopWidth)

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeEnabled) return
    event.preventDefault()
    dragStartRef.current = {
      startWidth: resolvedDesktopWidth,
      startX: event.clientX,
    }
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStartRef.current
      if (!dragState) return

      const delta =
        horizontalSide === "right"
          ? dragState.startX - event.clientX
          : event.clientX - dragState.startX
      setDesktopWidth(clamp(dragState.startWidth + delta, minDesktopWidth, maxDesktopWidth))
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }

    document.addEventListener("pointermove", handlePointerMove)
    document.addEventListener("pointerup", handlePointerUp)
    document.addEventListener("pointercancel", handlePointerUp)

    return () => {
      document.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("pointerup", handlePointerUp)
      document.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [isDragging, horizontalSide, minDesktopWidth, maxDesktopWidth])

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!resizeEnabled) return

    const step = event.shiftKey ? 80 : 24
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      setDesktopWidth((current) =>
        clamp(current + (horizontalSide === "right" ? step : -step), minDesktopWidth, maxDesktopWidth),
      )
    }
    if (event.key === "ArrowRight") {
      event.preventDefault()
      setDesktopWidth((current) =>
        clamp(current + (horizontalSide === "right" ? -step : step), minDesktopWidth, maxDesktopWidth),
      )
    }
  }

  return (
    <DrawerPopup
      position={resolvedSide}
      showBar={isMobile}
      showCloseButton={isDesktop}
      className={cn(
        "max-w-none",
        resolvedSide === "bottom" && "max-h-[92dvh] rounded-t-2xl border-t",
        resolvedSide === "top" && "max-h-[92dvh] rounded-b-2xl border-b",
        className,
      )}
      style={
        isDesktop
          ? {
              ...style,
              width: resolvedDesktopWidth,
              maxWidth: `min(${maxDesktopWidth}px, calc(100vw - 2rem))`,
            }
          : style
      }
    >
      <div
        key={contentKey}
        className={cn(
          "flex min-h-0 flex-1 flex-col duration-200 animate-in fade-in",
          resolvedSide === "bottom" || resolvedSide === "top"
            ? "slide-in-from-bottom-2"
            : "slide-in-from-right-2",
        )}
      >
        {children}
      </div>
      {resizeEnabled ? (
        <div
          aria-label="Redimensionar panel"
          aria-orientation="vertical"
          className={cn(
            "group absolute inset-y-0 z-100 hidden w-6 cursor-col-resize items-center outline-none md:flex",
            horizontalSide === "right" ? "-left-3 justify-end pr-1.5" : "-right-3 justify-start pl-1.5",
          )}
          onKeyDown={handleResizeKeyDown}
          onPointerDown={startResize}
          role="separator"
          tabIndex={0}
        >
          <span className="h-16 w-1 rounded-full bg-muted-foreground/20 transition-colors group-hover:bg-muted-foreground/40" />
        </div>
      ) : null}
    </DrawerPopup>
  )
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export {
  DrawerBase as Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPrimitive,
  DrawerTitle,
}
