import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { useIsMobile } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { CheckIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { CircleStencil, FixedCropper, ImageRestriction, Priority, type CropperState, type FixedCropperRef } from "react-advanced-cropper"
import "react-advanced-cropper/dist/style.css"

interface ImageCropperModalProps {
  image: string | null
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedImage: Blob) => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 3

const HIDDEN_HANDLERS = {
  east: false,
  eastNorth: false,
  eastSouth: false,
  north: false,
  south: false,
  west: false,
  westNorth: false,
  westSouth: false,
}

const HIDDEN_LINES = {
  east: false,
  north: false,
  south: false,
  west: false,
}

const getAvatarStencilSize = ({ boundary }: Pick<CropperState, "boundary">) => {
  const boundarySize = Math.min(boundary.width, boundary.height)
  const size = Math.max(72, Math.min(Math.max(boundarySize * 0.72, 180), boundarySize - 24))

  return {
    width: size,
    height: size,
  }
}

const getDefaultAvatarVisibleArea = ({ boundary, imageSize }: Pick<CropperState, "boundary" | "imageSize">) => {
  const stencilSize = getAvatarStencilSize({ boundary })
  const boundaryRatio = boundary.width / boundary.height
  const stencilWidthRatio = stencilSize.width / boundary.width
  const stencilHeightRatio = stencilSize.height / boundary.height

  const width = Math.min(
    imageSize.width / stencilWidthRatio,
    (imageSize.height / stencilHeightRatio) * boundaryRatio,
  )
  const height = width / boundaryRatio

  return {
    left: imageSize.width / 2 - width / 2,
    top: imageSize.height / 2 - height / 2,
    width,
    height,
  }
}

const canvasToJpegBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  })

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

export function ImageCropperModal({ image, isOpen, onClose, onCropComplete }: ImageCropperModalProps) {
  const isMobile = useIsMobile()
  const cropperRef = useRef<FixedCropperRef>(null)
  const zoomRef = useRef(MIN_ZOOM)
  const [zoom, setZoom] = useState(MIN_ZOOM)

  const setDisplayZoom = useCallback((nextZoom: number) => {
    zoomRef.current = nextZoom
    setZoom(nextZoom)
  }, [])

  const getCropperZoom = useCallback((cropper: FixedCropperRef | null) => {
    const state = cropper?.getState()
    if (!state) return null

    const { boundary, imageSize, visibleArea } = state
    if (!boundary || !imageSize || !visibleArea) {
      return null
    }

    const defaultVisibleArea = getDefaultAvatarVisibleArea({ boundary, imageSize })
    if (!defaultVisibleArea || defaultVisibleArea.width === 0) {
      return null
    }

    return defaultVisibleArea.width / visibleArea.width
  }, [])

  const initializeZoom = useCallback((cropper: FixedCropperRef | null) => {
    const state = cropper?.getState()
    if (!state?.visibleArea) {
      return
    }
    setDisplayZoom(MIN_ZOOM)
  }, [setDisplayZoom])

  const queueInitializeZoom = useCallback((cropper: FixedCropperRef | null) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        initializeZoom(cropper)
      })
    })
  }, [initializeZoom])

  const syncZoom = useCallback((cropper: FixedCropperRef | null) => {
    if (!cropper) {
      return
    }
    const currentZoom = getCropperZoom(cropper)

    if (!currentZoom) {
      return
    }

    // Limit zoom factors and snap back programmatically with a tiny tolerance
    if (currentZoom > MAX_ZOOM + 0.001) {
      cropper.zoomImage(MAX_ZOOM / currentZoom, {
        normalize: true,
        transitions: false,
      })
      setDisplayZoom(MAX_ZOOM)
    } else if (currentZoom < MIN_ZOOM - 0.001) {
      cropper.zoomImage(MIN_ZOOM / currentZoom, {
        normalize: true,
        transitions: false,
      })
      setDisplayZoom(MIN_ZOOM)
    } else {
      setDisplayZoom(currentZoom)
    }
  }, [getCropperZoom, setDisplayZoom])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      setDisplayZoom(MIN_ZOOM)
      cropperRef.current?.refresh()
      queueInitializeZoom(cropperRef.current)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [isOpen, queueInitializeZoom, setDisplayZoom])

  const updateZoom = useCallback((nextZoom: number, transitions = true) => {
    const clampedZoom = clampZoom(nextZoom)
    const cropper = cropperRef.current
    const state = cropper?.getState()

    if (!cropper || !state) {
      setDisplayZoom(clampedZoom)
      return
    }

    const currentZoom = getCropperZoom(cropper) ?? zoomRef.current

    cropper.zoomImage(clampedZoom / currentZoom, {
      normalize: true,
      transitions,
    })
    setDisplayZoom(clampedZoom)
  }, [getCropperZoom, setDisplayZoom])

  const handleCrop = async () => {
    const canvas = cropperRef.current?.getCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
      maxWidth: 1024,
      maxHeight: 1024,
    })

    if (!canvas) {
      return
    }

    const croppedImage = await canvasToJpegBlob(canvas)

    if (croppedImage) {
      onCropComplete(croppedImage)
      onClose()
    }
  }

  return (
    <Drawer nested={true} open={isOpen} onOpenChange={(open) => {
      if (!open) onClose()
    }} position={isMobile ? "bottom" : "right"}>
      <DrawerPopup
        showCloseButton={!isMobile}
        className={cn(
          isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : "",
          "gap-0 overflow-hidden p-0",
        )}
        style={!isMobile ? { width: 460 } : undefined}
      >
        <DrawerHeader className="shrink-0 border-b bg-background px-6 py-4">
          <DrawerTitle className="text-xl">Ajustar Foto de Perfil</DrawerTitle>
          <DrawerDescription>
            Encuadra tu rostro perfectamente para el avatar
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 min-h-0 bg-background">
          <div className="flex flex-col min-h-0">
            <div className="relative w-full flex items-center justify-center bg-[#0a0a0a] border-b border-border/50 shrink-0">
              <div className="w-full aspect-square max-h-[min(460px,calc(100dvh-240px))] max-w-[min(460px,calc(100dvh-240px))] shrink-0">
                {image && (
                  <FixedCropper
                    key={isOpen ? image : "closed"}
                    ref={cropperRef}
                    src={image}
                    stencilComponent={CircleStencil}
                    stencilSize={getAvatarStencilSize}
                    defaultVisibleArea={getDefaultAvatarVisibleArea}
                    imageRestriction={ImageRestriction.stencil}
                    priority={Priority.visibleArea}
                    className="size-full bg-[#0a0a0a]"
                    backgroundWrapperProps={{
                      scaleImage: {
                        touch: true,
                        wheel: true,
                      },
                    }}
                    stencilProps={{
                      handlers: HIDDEN_HANDLERS,
                      lines: HIDDEN_LINES,
                      movable: false,
                      resizable: false,
                      overlayClassName: "[color:rgba(0,0,0,0.72)]",
                      previewClassName: "border-[3px] border-white/95 shadow-[0_0_0_1px_rgba(17,24,39,0.35)]",
                    }}
                    onReady={queueInitializeZoom}
                    onUpdate={syncZoom}
                  />
                )}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col justify-center bg-background p-6">
              <div className="flex flex-col gap-6">
                
                {/* Simplified Zoom Control */}
                <div className="flex flex-col gap-4">
                  {/* Header: Zoom Title & Value */}
                  <div className="flex items-center justify-between text-sm font-medium text-foreground px-1">
                    <span>Zoom</span>
                    <span className="text-muted-foreground font-semibold">
                      {zoom.toFixed(2)}x
                    </span>
                  </div>

                  {/* Controls Row */}
                  <div className="flex items-center gap-3">
                    {/* Zoom Out Button */}
                    <button
                      type="button"
                      disabled={zoom <= MIN_ZOOM + 0.005}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                      onClick={() => updateZoom(Math.max(MIN_ZOOM, zoom - 0.2))}
                      title="Alejar"
                    >
                      <ZoomOutIcon className="size-4" />
                    </button>

                    {/* Slider Container with ticks */}
                    <div className="flex grow flex-col gap-2">
                      <Slider
                        value={zoom}
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step={0.01}
                        className="cursor-pointer py-1"
                        onValueChange={(val) => updateZoom(Array.isArray(val) ? val[0] : (val as unknown as number), false)}
                      />
                      {/* Zoom Ticks */}
                      <div className="flex justify-between px-0.5 text-[10px] font-medium text-muted-foreground/70 select-none">
                        <span className="cursor-pointer transition-colors hover:text-foreground" onClick={() => updateZoom(1.0)}>1.0x</span>
                        <span className="cursor-pointer transition-colors hover:text-foreground" onClick={() => updateZoom(2.0)}>2.0x</span>
                        <span className="cursor-pointer transition-colors hover:text-foreground" onClick={() => updateZoom(3.0)}>3.0x</span>
                      </div>
                    </div>

                    {/* Zoom In Button */}
                    <button
                      type="button"
                      disabled={zoom >= MAX_ZOOM - 0.005}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                      onClick={() => updateZoom(Math.min(MAX_ZOOM, zoom + 0.2))}
                      title="Acercar"
                    >
                      <ZoomInIcon className="size-4" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </ScrollArea>
        <DrawerFooter variant="bare">
          <DrawerClose render={<Button variant="secondary" className="w-full sm:flex-1" />}>
            Cancelar
          </DrawerClose>
          <Button className="w-full sm:flex-1" onClick={handleCrop}>
            <CheckIcon data-icon="inline-start" />
            Guardar foto
          </Button>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}
