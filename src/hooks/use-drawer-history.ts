"use client";

import React, { useEffect, useRef } from "react";

import { useIsMobile } from "@/hooks/use-media-query";

const drawerHistoryStateKey = "__abcDrawerEntry";
export type DrawerHistoryMode = "auto" | "always" | "never";

type DrawerHistoryState = {
  depth: number;
  ignoreNextPop: boolean;
  closingFromPopIds: Set<number>;
  backStack: { close: () => void; id: number }[];
  nextId: number;
};

const drawerHistoryMap = new Map<string, DrawerHistoryState>();

function getDrawerState(componentId: string) {
  let state = drawerHistoryMap.get(componentId);
  if (!state) {
    state = {
      depth: 0,
      ignoreNextPop: false,
      closingFromPopIds: new Set(),
      backStack: [],
      nextId: 0,
    };
    drawerHistoryMap.set(componentId, state);
  }
  return state;
}

function useDrawerHistoryEnabled(historyMode: DrawerHistoryMode) {
  const isMobile = useIsMobile();
  if (historyMode === "always") return true;
  if (historyMode === "never") return false;
  return isMobile;
}

function registerDrawerBackHandler(componentId: string, close: () => void) {
  const state = getDrawerState(componentId);
  const id = state.nextId + 1;
  state.nextId = id;
  state.backStack.push({ close, id });
  pushDrawerHistoryEntry(componentId, id);
  return () => unregisterDrawerBackHandler(componentId, id);
}

function handleDrawerPopState(componentId: string) {
  const state = getDrawerState(componentId);
  if (state.ignoreNextPop) {
    state.ignoreNextPop = false;
    return;
  }
  if (state.depth > 0) {
    state.depth -= 1;
  }
  const topDrawer = state.backStack.at(-1);
  if (!topDrawer) return;
  state.closingFromPopIds.add(topDrawer.id);
  topDrawer.close();
}

function pushDrawerHistoryEntry(componentId: string, id: number) {
  const state = getDrawerState(componentId);
  const currentState = getCurrentHistoryState();
  window.history.pushState(
    { ...currentState, [drawerHistoryStateKey]: id },
    "",
    window.location.href,
  );
  state.depth += 1;
}

function unregisterDrawerBackHandler(componentId: string, id: number) {
  const state = getDrawerState(componentId);
  const stackIndex = state.backStack.findIndex((entry) => entry.id === id);
  if (stackIndex === -1) return;
  const wasTopDrawer = stackIndex === state.backStack.length - 1;
  state.backStack.splice(stackIndex, 1);
  if (state.closingFromPopIds.delete(id)) return;
  if (!wasTopDrawer || state.depth <= 0) return;
  if (getCurrentDrawerHistoryId() !== id) return;
  state.ignoreNextPop = true;
  state.depth -= 1;
  window.history.back();
}

function getCurrentHistoryState(): Record<string, unknown> {
  const state = window.history.state;
  return state && typeof state === "object" ? state : {};
}

function getCurrentDrawerHistoryId() {
  const id = getCurrentHistoryState()[drawerHistoryStateKey];
  return typeof id === "number" ? id : null;
}

export function useDrawerHistory(
  open: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
  historyMode: DrawerHistoryMode = "auto",
) {
  const historyEnabled = useDrawerHistoryEnabled(historyMode);
  const hasOpenChange = Boolean(onOpenChange);
  const onOpenChangeRef = useRef(onOpenChange);
  const unregisterRef = useRef<(() => void) | null>(null);
  const pendingUnregisterRef = useRef<number | null>(null);
  const componentId = React.useId();

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!historyEnabled || typeof window === "undefined") return;

    const popStateHandler = () => handleDrawerPopState(componentId);
    window.addEventListener("popstate", popStateHandler);
    return () => window.removeEventListener("popstate", popStateHandler);
  }, [componentId, historyEnabled]);

  useEffect(() => {
    if (
      !historyEnabled ||
      !open ||
      !hasOpenChange ||
      typeof window === "undefined"
    )
      return;

    const scheduleUnregister = () => {
      pendingUnregisterRef.current = window.setTimeout(() => {
        unregisterRef.current?.();
        unregisterRef.current = null;
        pendingUnregisterRef.current = null;
      }, 0);
    };

    if (pendingUnregisterRef.current !== null) {
      window.clearTimeout(pendingUnregisterRef.current);
      pendingUnregisterRef.current = null;
      return scheduleUnregister;
    }

    const unregister = registerDrawerBackHandler(componentId, () => {
      const cb = onOpenChangeRef.current;
      cb?.(false);
    });
    unregisterRef.current = unregister;

    return scheduleUnregister;
  }, [hasOpenChange, historyEnabled, open, componentId]);
}
