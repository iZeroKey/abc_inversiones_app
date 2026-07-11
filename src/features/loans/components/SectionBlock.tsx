import { cn } from "@/lib/utils"
import { motion, type Variants } from "framer-motion"
import type { ReactNode } from "react"

export const defaultSectionVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
}

export function SectionBlock({
  children,
  className,
  animate = false,
  variants,
}: {
  children: ReactNode
  className?: string
  animate?: boolean
  variants?: Variants
}) {
  if (!animate) {
    return (
      <div className={cn("bg-muted/30 rounded-xl p-4", className)}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      variants={variants ?? defaultSectionVariants}
      className={cn("bg-muted/30 rounded-xl p-4", className)}
    >
      {children}
    </motion.div>
  )
}
