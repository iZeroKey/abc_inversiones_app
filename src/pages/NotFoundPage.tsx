import { HomeIcon, SearchXIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-10">
      <Empty className="rounded-lg border bg-card shadow-xs/5">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>Página no encontrada</EmptyTitle>
          <EmptyDescription>
            La dirección no existe o ya no está disponible en la aplicación.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/home" replace />}>
            <HomeIcon data-icon="inline-start" />
            Ir al inicio
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
