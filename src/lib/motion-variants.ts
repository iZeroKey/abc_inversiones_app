import { type Transition, type Variants } from "framer-motion";

export const spring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
};

export const smoothEase: Transition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

export const fastEase: Transition = {
  duration: 0.15,
  ease: "easeOut",
};

export const pageVariants: Variants = {
  initial: (custom: unknown) => {
    const direction = custom as "forward" | "back"
    return {
      opacity: 0,
      filter: "blur(6px)",
      x: direction === "back" ? -18 : 18,
      scale: 0.995,
    }
  },
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    x: 0,
    scale: 1,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (custom: unknown) => {
    const direction = custom as "forward" | "back"
    return {
      opacity: 0,
      filter: "blur(4px)",
      x: direction === "back" ? 12 : -12,
      scale: 0.995,
      transition: { duration: 0.14, ease: [0.55, 0, 1, 0.45] },
    }
  },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const staggerContainer: Variants = {
  initial: { transition: { staggerChildren: 0.05, delayChildren: 0 } },
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0 } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: smoothEase },
  exit: { opacity: 0, y: -8, transition: fastEase },
};

export const badgeChange: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.28, 0.9, 1.1, 0.96, 1],
    transition: { duration: 0.7, ease: [0.25, 1.3, 0.4, 1] },
  },
};

export const rowEnter: Variants = {
  initial: { opacity: 0, y: -6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: "spring", stiffness: 400, damping: 20 },
} as const;

export const hoverLift = {
  whileHover: { y: -2 },
  whileTap: { y: 0 },
  transition: { type: "spring", stiffness: 400, damping: 20 },
} as const;
