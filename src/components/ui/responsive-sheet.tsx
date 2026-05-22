import type React from "react"
import { useEffect, useRef, useState } from "react"

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
import { useIsMobile } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

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
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ startWidth: number; startX: number } | null>(null)
  const resizeEnabled = resizable && !isMobile && (resolvedSide === "left" || resolvedSide === "right")
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
      <div
        key={contentKey}
        className={cn(
          "flex min-h-0 flex-1 flex-col duration-200 animate-in fade-in",
          resolvedSide === "bottom" ? "slide-in-from-bottom-2" : "slide-in-from-right-2",
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
  SheetTitle
}
