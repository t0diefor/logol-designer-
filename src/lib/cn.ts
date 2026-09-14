import clsx, { type ClassValue } from 'clsx'

/**
 * Conditional className helper.
 *
 * Deliberately not `tailwind-merge`: PanelForge components expose explicit
 * variant props instead of encouraging callers to override utilities, so
 * there are no conflicting classes to merge. Adding the dependency would
 * mostly serve to make overriding easy, which is not the goal.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
