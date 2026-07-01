import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScheduleTimeline } from "@/features/loans/components/ScheduleTimeline"
import { useIsMobile } from "@/hooks/use-media-query"
import type { Installment } from "@/types/loans"

export function ScheduleDrawer({
  open,
  onOpenChange,
  installments,
  drawerWidth,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  installments: Installment[]
  drawerWidth?: number
}) {
  const isMobile = useIsMobile()

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isMobile ? "bottom" : "right"} nested>
      <DrawerPopup
        showBar
        showCloseButton={!isMobile}
        className={isMobile ? "max-h-[92dvh] rounded-t-2xl border-t" : ""}
        style={!isMobile ? { width: drawerWidth ?? 620, maxWidth: "min(1080px, calc(100vw - 2rem))", minWidth: 560 } : undefined}
      >
        <DrawerHeader>
          <DrawerTitle>Cronograma completo</DrawerTitle>
          <DrawerDescription>
            Todas las cuotas del préstamo
          </DrawerDescription>
        </DrawerHeader>
        <DrawerPanel>
          <ScheduleTimeline installments={installments} />
        </DrawerPanel>
        <DrawerFooter variant="bare">
          <DrawerClose render={<Button variant="outline" />}>
            Cerrar
          </DrawerClose>
        </DrawerFooter>
      </DrawerPopup>
    </Drawer>
  )
}
