import type React from "react"
import { useRef, useState } from "react"

import { useIsMobile } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPrimitive,
  SheetTitle,
} from "@/components/ui/sheet"

type HorizontalSide = "left" | "right"

type ResponsiveSheetContentProps = React.ComponentProps<typeof SheetContent> & {
  contentKey?: React.Key
  defaultDesktopWidth?: number
  maxDesktopWidth?: number
  minDesktopWidth?: number
  mobileSide?: "bottom" | "top"
  resizable?: boolean
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export function ResponsiveSheetContent({
  children,
  className,
  contentKey,
  defaultDesktopWidth = 720,
  maxDesktopWidth = 1120,
  minDesktopWidth = 420,
  mobileSide = "bottom",
  resizable = true,
  side = "right",
  style,
  ...props
}: ResponsiveSheetContentProps): React.ReactElement {
  const isMobile = useIsMobile()
  const resolvedSide = isMobile ? mobileSide : side
  const horizontalSide: HorizontalSide = resolvedSide === "left" ? "left" : "right"
  const [desktopWidth, setDesktopWidth] = useState(() =>
    clamp(defaultDesktopWidth, minDesktopWidth, maxDesktopWidth),
  )
  const dragRef = useRef<{ startWidth: number; startX: number } | null>(null)
  const resizeEnabled = resizable && !isMobile && (resolvedSide === "left" || resolvedSide === "right")
  const resolvedDesktopWidth = clamp(desktopWidth, minDesktopWidth, maxDesktopWidth)

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragRef.current
    if (!dragState) return

    const delta =
      horizontalSide === "right"
        ? dragState.startX - event.clientX
        : event.clientX - dragState.startX
    setDesktopWidth(clamp(dragState.startWidth + delta, minDesktopWidth, maxDesktopWidth))
  }

  const stopResize = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeEnabled) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      startWidth: resolvedDesktopWidth,
      startX: event.clientX,
    }
  }

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
    <SheetContent
      side={resolvedSide}
      className={cn(
        "max-w-none",
        resolvedSide === "bottom" && "max-h-[92dvh] rounded-t-2xl border-t",
        resolvedSide === "top" && "max-h-[92dvh] rounded-b-2xl border-b",
        className,
      )}
      style={
        resizeEnabled
          ? {
              ...style,
              width: resolvedDesktopWidth,
              maxWidth: `min(${maxDesktopWidth}px, calc(100vw - 2rem))`,
            }
          : style
      }
      {...props}
    >
      {resizeEnabled ? (
        <div
          aria-label="Redimensionar panel"
          aria-orientation="vertical"
          className={cn(
            "absolute inset-y-0 hidden w-3 cursor-col-resize items-center justify-center outline-none md:flex",
            horizontalSide === "right" ? "left-0" : "right-0",
          )}
          onKeyDown={handleResizeKeyDown}
          onPointerDown={startResize}
          onPointerCancel={stopResize}
          onPointerMove={handleResizeMove}
          onPointerUp={stopResize}
          role="separator"
          tabIndex={0}
        >
          <span className="h-12 w-1 rounded-full bg-border transition-colors hover:bg-muted-foreground/50" />
        </div>
      ) : null}
      <div
        key={contentKey}
        className={cn(
          "flex min-h-0 flex-1 flex-col duration-200 animate-in fade-in",
          resolvedSide === "bottom" ? "slide-in-from-bottom-2" : "slide-in-from-right-2",
        )}
      >
        {children}
      </div>
    </SheetContent>
  )
}

export {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPrimitive,
  SheetTitle,
}
