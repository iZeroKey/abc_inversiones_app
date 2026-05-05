import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { CheckIcon, XIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react"
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
  const cropperContainerRef = useRef<HTMLDivElement>(null)
  const cropperRef = useRef<FixedCropperRef>(null)
  const baseVisibleAreaWidthRef = useRef<number | null>(null)
  const zoomRef = useRef(MIN_ZOOM)
  const [zoom, setZoom] = useState(MIN_ZOOM)

  const setDisplayZoom = useCallback((nextZoom: number) => {
    zoomRef.current = nextZoom
    setZoom(nextZoom)
  }, [])

  const getCropperZoom = useCallback((cropper: FixedCropperRef | null) => {
    const visibleArea = cropper?.getState()?.visibleArea

    if (!visibleArea) {
      return null
    }

    if (!baseVisibleAreaWidthRef.current) {
      baseVisibleAreaWidthRef.current = visibleArea.width
    }

    return baseVisibleAreaWidthRef.current / visibleArea.width
  }, [])

  const initializeZoom = useCallback((cropper: FixedCropperRef | null) => {
    const visibleArea = cropper?.getState()?.visibleArea

    if (!visibleArea) {
      return
    }

    baseVisibleAreaWidthRef.current = visibleArea.width
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
    const currentZoom = getCropperZoom(cropper)

    if (!currentZoom) {
      return
    }

    setDisplayZoom(clampZoom(currentZoom))
  }, [getCropperZoom, setDisplayZoom])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    baseVisibleAreaWidthRef.current = null

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

  useEffect(() => {
    const cropperContainer = cropperContainerRef.current

    if (!isOpen || !cropperContainer) {
      return
    }

    const handleWheelZoom = (event: WheelEvent) => {
      event.preventDefault()

      const direction = event.deltaY < 0 ? 1 : -1
      const step = event.ctrlKey ? 0.08 : 0.16

      updateZoom(zoomRef.current + direction * step, false)
    }

    cropperContainer.addEventListener("wheel", handleWheelZoom, { passive: false })

    return () => {
      cropperContainer.removeEventListener("wheel", handleWheelZoom)
    }
  }, [isOpen, updateZoom])

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="h-auto max-h-[calc(100dvh-2rem)] max-w-[95vw] gap-0 overflow-hidden p-0 sm:max-w-[500px] [@media(max-height:620px)]:sm:h-[min(470px,calc(100dvh-2rem))] [@media(max-height:620px)]:sm:max-w-[min(900px,calc(100vw-2rem))]">
        <DialogHeader className="flex-shrink-0 border-b bg-background px-6 py-4 [@media(max-height:620px)]:sm:px-5 [@media(max-height:620px)]:sm:py-3">
          <DialogTitle className="text-xl [@media(max-height:620px)]:sm:text-lg">Ajustar Foto de Perfil</DialogTitle>
          <DialogDescription className="[@media(max-height:620px)]:sm:text-xs">
            Encuadra tu rostro perfectamente para el avatar
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col [@media(max-height:620px)]:sm:flex-row min-h-0 overflow-hidden">
          <div
            ref={cropperContainerRef}
            className="relative min-h-[320px] w-full border-b border-border/50 bg-[#0a0a0a] shadow-inner aspect-square [@media(max-height:620px)]:sm:h-full [@media(max-height:620px)]:sm:min-h-0 [@media(max-height:620px)]:sm:flex-[1_1_auto] [@media(max-height:620px)]:sm:border-b-0 [@media(max-height:620px)]:sm:border-r"
          >
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
                    touch: false,
                    wheel: false,
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

          <div className="flex w-full flex-shrink-0 flex-col justify-center bg-background p-6 [@media(max-height:620px)]:sm:w-[300px] [@media(max-height:620px)]:sm:p-5">
            <div className="flex flex-col gap-8 [@media(max-height:620px)]:sm:gap-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Zoom</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-bold text-primary shadow-inner">x{zoom.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => updateZoom(Math.max(MIN_ZOOM, zoom - 0.2))}
                  >
                    <ZoomOutIcon className="size-5" />
                  </button>
                  <Slider
                    value={zoom}
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.01}
                    className="flex-1"
                    onValueChange={(val) => updateZoom(Array.isArray(val) ? val[0] : (val as unknown as number), false)}
                  />
                  <button 
                    type="button"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => updateZoom(Math.min(MAX_ZOOM, zoom + 0.2))}
                  >
                    <ZoomInIcon className="size-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t pt-4 [@media(max-height:620px)]:sm:pt-4">
                <Button className="w-full shadow-md shadow-primary/10" onClick={handleCrop}>
                  <CheckIcon data-icon="inline-start" />
                  Guardar foto
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={onClose}>
                  <XIcon data-icon="inline-start" />
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
