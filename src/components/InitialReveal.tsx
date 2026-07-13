import { motion } from "framer-motion"
import { useState, type ReactNode } from "react"
import { Skeleton } from "./ui/skeleton"

export function InitialReveal({ children }: { children: ReactNode }) {
  const [isAnimationDone, setIsAnimationDone] = useState(false)

  return (
    <div className="relative w-full bg-background min-h-dvh flex flex-col overflow-hidden">
      {/* Capa de la app real que entra con un fade suave y sutil zoom out */}
      <motion.div
        initial={{ opacity: 0, scale: 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="relative z-10 flex-1 flex flex-col w-full"
      >
        {children}
      </motion.div>

      {/* Capa de carga inicial (Skeletons y Logo) que se desvanece y desaparece (pointer-events-none) */}
      {!isAnimationDone && (
        <motion.div
          className="absolute inset-0 z-50 flex h-dvh items-center justify-center p-6 bg-background pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
          onAnimationComplete={() => setIsAnimationDone(true)}
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-5">
            {/* Logo animado con un ligero pálpito */}
            <motion.img
              src="/favicon.svg"
              className="size-12 rounded-md origin-center"
              initial={{ scale: 1 }}
              animate={{ scale: 1.2 }}
              transition={{
                duration: 0.6,
                ease: "easeOut",
                delay: 0.1,
              }}
            />
            <div className="w-full space-y-3">
              <Skeleton className="mx-auto h-4 w-44" />
              <Skeleton className="mx-auto h-4 w-64 max-w-full" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
