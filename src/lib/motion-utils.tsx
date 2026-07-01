import { motion, useReducedMotion } from "framer-motion"
import { type ComponentProps, forwardRef } from "react"

export function useAppMotion() {
  const prefersReduced = useReducedMotion()
  return { prefersReduced: prefersReduced ?? false }
}

type MotionDivProps = ComponentProps<typeof motion.div>

type MotionSpanProps = ComponentProps<typeof motion.span>

type MotionButtonProps = ComponentProps<typeof motion.button>

export const MotionDiv = forwardRef<HTMLDivElement, MotionDivProps>(
  (props, ref) => <motion.div ref={ref} {...props} />,
)
MotionDiv.displayName = "MotionDiv"

export const MotionSpan = forwardRef<HTMLSpanElement, MotionSpanProps>(
  (props, ref) => <motion.span ref={ref} {...props} />,
)
MotionSpan.displayName = "MotionSpan"

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  (props, ref) => <motion.button ref={ref} {...props} />,
)
MotionButton.displayName = "MotionButton"
