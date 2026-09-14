import type { Transition, Variants } from 'motion/react'
import type { MotionStyle, ThemeMotion } from '@/theme/theme-types'

/**
 * Motion guidelines, expressed as code.
 *
 * Rules this file encodes:
 *  1. Motion communicates origin and hierarchy. It never decorates.
 *  2. Entrances move a short distance (<= 12px). Long travel reads as lag.
 *  3. Exits are faster than entrances -- leaving should feel immediate.
 *  4. Each theme has a personality, but the *shape* of every animation is the
 *     same, so switching theme never changes what the interface means.
 *  5. Reduced motion collapses everything to an opacity change of ~0 duration.
 *     Nothing is removed outright, so animation callbacks still fire.
 */

/** Distance, in px, that entering elements travel. Kept deliberately small. */
const TRAVEL: Record<MotionStyle, number> = {
  ritual: 10,
  snappy: 6,
  bouncy: 12,
  mechanical: 0,
  soothing: 8,
  floating: 12,
}

/** Entry scale for styles that use one. 1 means "no scaling". */
const ENTRY_SCALE: Record<MotionStyle, number> = {
  ritual: 1,
  snappy: 0.985,
  bouncy: 0.94,
  mechanical: 1,
  soothing: 1,
  floating: 0.97,
}

const MS = (value: number) => value / 1000

/** Builds the base transition for a theme, honouring the reduced-motion flag. */
export function buildTransition(motion: ThemeMotion, reduced: boolean): Transition {
  if (reduced) return { duration: 0.001 }

  if (motion.style === 'bouncy') {
    // A real spring, so the overshoot is physical rather than a faked curve.
    return { type: 'spring', stiffness: 420, damping: 26, mass: 0.8 }
  }

  if (motion.style === 'floating') {
    return { type: 'spring', stiffness: 180, damping: 24, mass: 1 }
  }

  return {
    duration: MS(motion.base),
    ease: motion.style === 'mechanical' ? 'linear' : [0.22, 0.8, 0.28, 1],
  }
}

export interface MotionKit {
  /** Fade only. For content that should not appear to move. */
  fade: Variants
  /** Fade plus a short rise. The default entrance for cards and panels. */
  rise: Variants
  /** Fade plus scale. For popovers and modals, which grow from their trigger. */
  pop: Variants
  /** Parent that staggers its children. Pair with `item`. */
  stagger: Variants
  /** Child of `stagger`. */
  item: Variants
  /** Route-level transition. */
  page: Variants
  /** Shared transition, for one-off `animate` props. */
  transition: Transition
}

/**
 * Returns the full variant set for a theme.
 *
 * Call this once per render tree (see `useMotionKit`) rather than per
 * component, so every element on screen shares one timing source.
 */
export function getMotionKit(motion: ThemeMotion, reduced: boolean): MotionKit {
  const transition = buildTransition(motion, reduced)
  const travel = reduced ? 0 : TRAVEL[motion.style]
  const scale = reduced ? 1 : ENTRY_SCALE[motion.style]

  // Exits are deliberately quicker than entrances.
  const exitTransition: Transition = reduced
    ? { duration: 0.001 }
    : { duration: MS(motion.fast), ease: 'easeIn' }

  const staggerStep = reduced ? 0 : MS(motion.fast) / 3

  return {
    transition,

    fade: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition },
      exit: { opacity: 0, transition: exitTransition },
    },

    rise: {
      hidden: { opacity: 0, y: travel },
      visible: { opacity: 1, y: 0, transition },
      exit: { opacity: 0, y: reduced ? 0 : travel / 2, transition: exitTransition },
    },

    pop: {
      hidden: { opacity: 0, scale, y: travel / 2 },
      visible: { opacity: 1, scale: 1, y: 0, transition },
      exit: { opacity: 0, scale, transition: exitTransition },
    },

    stagger: {
      hidden: {},
      visible: {
        transition: { staggerChildren: staggerStep, delayChildren: staggerStep },
      },
      exit: {},
    },

    item: {
      hidden: { opacity: 0, y: travel },
      visible: { opacity: 1, y: 0, transition },
      exit: { opacity: 0, transition: exitTransition },
    },

    page: {
      hidden: { opacity: 0, y: reduced ? 0 : 6 },
      visible: { opacity: 1, y: 0, transition },
      exit: { opacity: 0, transition: exitTransition },
    },
  }
}
