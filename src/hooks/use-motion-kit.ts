import { useMemo } from 'react'
import { getMotionKit, type MotionKit } from '@/lib/motion'
import { useTheme } from '@/theme/use-theme'

/**
 * The motion variants for the active theme, already resolved against the
 * user's reduced-motion preference. Components should always take their
 * variants from here rather than writing inline animation values.
 */
export function useMotionKit(): MotionKit {
  const { theme, reducedMotion } = useTheme()
  return useMemo(
    () => getMotionKit(theme.motion, reducedMotion),
    [theme.motion, reducedMotion],
  )
}
