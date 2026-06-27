"use client"

import { useEffect, useRef } from "react"

import { useIsMobile } from "@/hooks/use-media-query"

const drawerHistoryStateKey = "__abcDrawerEntry"
let nextDrawerHistoryId = 0
let drawerHistoryDepth = 0
let ignoreNextDrawerPop = false
let popStateListenerAttached = false
const closingFromPopIds = new Set<number>()
const drawerBackStack: { close: () => void; id: number }[] = []

export type DrawerHistoryMode = "auto" | "always" | "never"

function useDrawerHistoryEnabled(historyMode: DrawerHistoryMode) {
  const isMobile = useIsMobile()
  if (historyMode === "always") return true
  if (historyMode === "never") return false
  return isMobile
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

export function useDrawerHistory(
  open: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
  historyMode: DrawerHistoryMode = "auto",
) {
  const historyEnabled = useDrawerHistoryEnabled(historyMode)
  const hasOpenChange = Boolean(onOpenChange)
  const onOpenChangeRef = useRef(onOpenChange)
  const unregisterRef = useRef<(() => void) | null>(null)
  const pendingUnregisterRef = useRef<number | null>(null)

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  useEffect(() => {
    if (!historyEnabled || !open || !hasOpenChange || typeof window === "undefined") return

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
      const cb = onOpenChangeRef.current
      cb?.(false)
    })
    unregisterRef.current = unregister

    return scheduleUnregister
  }, [hasOpenChange, historyEnabled, open])
}
