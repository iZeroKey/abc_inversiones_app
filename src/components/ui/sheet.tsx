"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { XIcon } from "lucide-react";
import type React from "react";
import { useEffect, useId, useRef } from "react";

const sheetHistoryStateKey = "__abcSheetEntry";
export type SheetHistoryMode = "auto" | "always" | "never";

type SheetHistoryState = {
  depth: number;
  ignoreNextPop: boolean;
  closingFromPopIds: Set<number>;
  backStack: { close: () => void; id: number }[];
  nextId: number;
};

const sheetHistoryMap = new Map<string, SheetHistoryState>();

function getSheetState(componentId: string) {
  let state = sheetHistoryMap.get(componentId);
  if (!state) {
    state = {
      depth: 0,
      ignoreNextPop: false,
      closingFromPopIds: new Set(),
      backStack: [],
      nextId: 0,
    };
    sheetHistoryMap.set(componentId, state);
  }
  return state;
}

export type SheetProps<Payload = unknown> =
  SheetPrimitive.Root.Props<Payload> & {
    historyMode?: SheetHistoryMode;
  };

export function Sheet<Payload = unknown>(
  props: SheetProps<Payload>,
): React.ReactElement {
  const { historyMode = "auto", onOpenChange, open, ...rootProps } = props;
  const sheetHistoryEnabled = useSheetHistoryEnabled(historyMode);
  useSheetBackNavigation(sheetHistoryEnabled ? open : false, onOpenChange);

  return (
    <SheetPrimitive.Root
      onOpenChange={onOpenChange}
      open={open}
      {...rootProps}
    />
  );
}

export const SheetPortal: typeof SheetPrimitive.Portal = SheetPrimitive.Portal;

function useSheetHistoryEnabled(historyMode: SheetHistoryMode) {
  const isMobile = useIsMobile();

  if (historyMode === "always") return true;
  if (historyMode === "never") return false;
  return isMobile;
}

function useSheetBackNavigation<Payload>(
  open: boolean | undefined,
  onOpenChange: SheetPrimitive.Root.Props<Payload>["onOpenChange"],
) {
  const hasOpenChange = Boolean(onOpenChange);
  const onOpenChangeRef = useRef(onOpenChange);
  const unregisterRef = useRef<(() => void) | null>(null);
  const pendingUnregisterRef = useRef<number | null>(null);
  const componentId = useId();

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const popStateHandler = () => handleSheetPopState(componentId);
    window.addEventListener("popstate", popStateHandler);
    return () => window.removeEventListener("popstate", popStateHandler);
  }, [componentId]);

  useEffect(() => {
    if (!open || !hasOpenChange || typeof window === "undefined") return;

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

    const unregister = registerSheetBackHandler(componentId, () => {
      onOpenChangeRef.current?.(false, createSheetBackEventDetails());
    });
    unregisterRef.current = unregister;

    return scheduleUnregister;
  }, [hasOpenChange, open, componentId]);
}

function registerSheetBackHandler(componentId: string, close: () => void) {
  const state = getSheetState(componentId);
  const id = state.nextId + 1;
  state.nextId = id;
  state.backStack.push({ close, id });
  pushSheetHistoryEntry(componentId, id);
  return () => unregisterSheetBackHandler(componentId, id);
}

function handleSheetPopState(componentId: string) {
  const state = getSheetState(componentId);
  if (state.ignoreNextPop) {
    state.ignoreNextPop = false;
    return;
  }
  if (state.depth > 0) {
    state.depth -= 1;
  }
  const topSheet = state.backStack.at(-1);
  if (!topSheet) return;
  state.closingFromPopIds.add(topSheet.id);
  topSheet.close();
}

function pushSheetHistoryEntry(componentId: string, id: number) {
  const state = getSheetState(componentId);
  const currentState = getCurrentHistoryState();
  window.history.pushState(
    { ...currentState, [sheetHistoryStateKey]: id },
    "",
    window.location.href,
  );
  state.depth += 1;
}

function unregisterSheetBackHandler(componentId: string, id: number) {
  const state = getSheetState(componentId);
  const stackIndex = state.backStack.findIndex((entry) => entry.id === id);
  if (stackIndex === -1) return;
  const wasTopSheet = stackIndex === state.backStack.length - 1;
  state.backStack.splice(stackIndex, 1);
  if (state.closingFromPopIds.delete(id)) return;
  if (!wasTopSheet || state.depth <= 0) return;
  if (getCurrentSheetHistoryId() !== id) return;
  state.ignoreNextPop = true;
  state.depth -= 1;
  window.history.back();
}

function getCurrentHistoryState(): Record<string, unknown> {
  const state = window.history.state;
  return state && typeof state === "object" ? state : {};
}

function getCurrentSheetHistoryId() {
  const id = getCurrentHistoryState()[sheetHistoryStateKey];
  return typeof id === "number" ? id : null;
}

function createSheetBackEventDetails(): SheetPrimitive.Root.ChangeEventDetails {
  return {
    allowPropagation: () => {},
    cancel: () => {},
    event: new Event("popstate"),
    isCanceled: false,
    isPropagationAllowed: false,
    preventUnmountOnClose: () => {},
    reason: "none",
    trigger: undefined,
  } as SheetPrimitive.Root.ChangeEventDetails;
}

export function SheetTrigger(
  props: SheetPrimitive.Trigger.Props,
): React.ReactElement {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export function SheetClose(
  props: SheetPrimitive.Close.Props,
): React.ReactElement {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

export function SheetBackdrop({
  className,
  ...props
}: SheetPrimitive.Backdrop.Props): React.ReactElement {
  return (
    <SheetPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/32 backdrop-blur-sm transition-all duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      data-slot="sheet-backdrop"
      {...props}
    />
  );
}

export function SheetViewport({
  className,
  side,
  variant = "default",
  ...props
}: SheetPrimitive.Viewport.Props & {
  side?: "right" | "left" | "top" | "bottom";
  variant?: "default" | "inset";
}): React.ReactElement {
  return (
    <SheetPrimitive.Viewport
      className={cn(
        "fixed inset-0 z-50 grid",
        side === "bottom" &&
          "grid grid-rows-[1fr_auto] pt-12 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]",
        side === "top" &&
          "grid grid-rows-[auto_1fr] pb-12 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]",
        side === "left" &&
          "flex justify-start pl-[env(safe-area-inset-left,0px)] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
        side === "right" &&
          "flex justify-end pr-[env(safe-area-inset-right,0px)] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
        variant === "inset" && "sm:p-4",
        className,
      )}
      data-slot="sheet-viewport"
      {...props}
    />
  );
}

export function SheetPopup({
  className,
  children,
  showCloseButton = true,
  side = "right",
  variant = "default",
  closeProps,
  portalProps,
  ...props
}: SheetPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  side?: "right" | "left" | "top" | "bottom";
  variant?: "default" | "inset";
  closeProps?: SheetPrimitive.Close.Props;
  portalProps?: SheetPrimitive.Portal.Props;
}): React.ReactElement {
  return (
    <SheetPortal {...portalProps}>
      <SheetBackdrop />
      <SheetViewport side={side} variant={variant}>
        <SheetPrimitive.Popup
          className={cn(
            "relative flex max-h-full min-h-0 w-full min-w-0 flex-col bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-xl transition-[opacity,transform,translate] duration-300 ease-in-out will-change-transform before:pointer-events-none before:absolute before:inset-0 before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:opacity-0 data-starting-style:opacity-0 max-sm:before:hidden dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
            side === "bottom" &&
              "row-start-2 border-t data-ending-style:translate-y-full data-starting-style:translate-y-full",
            side === "top" &&
              "border-b data-ending-style:-translate-y-full data-starting-style:-translate-y-full",
            side === "left" &&
              "w-[calc(100%-(--spacing(12)))] max-w-md border-e data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
            side === "right" &&
              "col-start-2 w-[calc(100%-(--spacing(12)))] max-w-md border-s data-ending-style:translate-x-full data-starting-style:translate-x-full",
            variant === "inset" &&
              "before:hidden sm:rounded-2xl sm:border sm:before:rounded-[calc(var(--radius-2xl)-1px)] sm:**:data-[slot=sheet-footer]:rounded-b-[calc(var(--radius-2xl)-1px)]",
            className,
          )}
          data-slot="sheet-popup"
          {...props}
        >
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close
              aria-label="Cerrar"
              className="absolute inset-e-2 top-2"
              render={<Button size="icon" variant="ghost" />}
              {...closeProps}
            >
              <XIcon />
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Popup>
      </SheetViewport>
    </SheetPortal>
  );
}

export function SheetHeader({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">): React.ReactElement {
  const defaultProps = {
    className: cn(
      "flex flex-col gap-2 p-6 in-[[data-slot=sheet-popup]:has([data-slot=sheet-panel])]:pb-3 max-sm:pb-4",
      className,
    ),
    "data-slot": "sheet-header",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });
}

export function SheetFooter({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"div"> & {
  variant?: "default" | "bare";
}): React.ReactElement {
  const defaultProps = {
    className: cn(
      "flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end",
      variant === "default" &&
        "border-t bg-muted/72 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(5))]",
      variant === "bare" &&
        "in-[[data-slot=sheet-popup]:has([data-slot=sheet-panel])]:pt-3 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(7))]",
      className,
    ),
    "data-slot": "sheet-footer",
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });
}

export function SheetTitle({
  className,
  ...props
}: SheetPrimitive.Title.Props): React.ReactElement {
  return (
    <SheetPrimitive.Title
      className={cn(
        "font-heading font-semibold text-xl leading-none",
        className,
      )}
      data-slot="sheet-title"
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props): React.ReactElement {
  return (
    <SheetPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

export function SheetPanel({
  className,
  scrollFade = true,
  render,
  ...props
}: useRender.ComponentProps<"div"> & {
  scrollFade?: boolean;
}): React.ReactElement {
  const defaultProps = {
    className: cn(
      "p-6 in-[[data-slot=sheet-popup]:has([data-slot=sheet-header])]:pt-1 in-[[data-slot=sheet-popup]:has([data-slot=sheet-footer]:not(.border-t))]:pb-1",
      className,
    ),
    "data-slot": "sheet-panel",
  };

  return (
    <ScrollArea scrollFade={scrollFade}>
      {useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
      })}
    </ScrollArea>
  );
}

export {
  SheetPopup as SheetContent, SheetBackdrop as SheetOverlay, SheetPrimitive
};
