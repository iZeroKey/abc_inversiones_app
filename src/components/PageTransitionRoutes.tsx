import {
  Routes,
  useLocation,
  useNavigationType,
  type RoutesProps,
} from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"

import { pageVariants } from "@/lib/motion-variants"

export function PageTransitionRoutes({ children }: RoutesProps) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const direction = navigationType === "POP" ? "back" : "forward"

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        custom={direction}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="route-transition"
      >
        <Routes location={location}>{children}</Routes>
      </motion.div>
    </AnimatePresence>
  )
}
