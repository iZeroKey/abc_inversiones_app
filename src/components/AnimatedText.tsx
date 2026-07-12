import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

export function AnimatedText({ 
  children, 
  value,
  className 
}: { 
  children: React.ReactNode
  value?: string | number | null
  className?: string 
}) {
  const key = value !== undefined ? String(value) : typeof children === "string" || typeof children === "number" ? String(children) : undefined

  return (
    <span className={cn("relative inline-grid", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={key}
          initial={{ opacity: 0, y: -4, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 4, filter: "blur(2px)" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="col-start-1 row-start-1 min-w-0 w-full whitespace-nowrap"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
