import type { SVGProps } from 'react'

/**
 * Inline icon set.
 *
 * Hand-rolled rather than pulled from an icon package: the app needs about
 * twenty icons, and inlining them avoids a dependency, a bundle of several
 * hundred unused glyphs, and an extra network request. All paths are drawn on
 * a 24x24 grid with a 1.75 stroke so they sit consistently next to 14-16px text.
 */

const PATHS = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.5 5.7 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.7-3.5-9s1-6.5 3.5-9Z',
  pen: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z',
  layout: 'M4 4h16v16H4zM4 10h16M10 10v10',
  image: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4L16 11l4 4',
  download: 'M12 4v11M8 11l4 4 4-4M5 19h14',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V20a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 18.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 16l.9 2.3L21 19l-2.1.8L18 22l-.9-2.2L15 19l2.1-.7z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 13l4 4L19 7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2',
  copy: 'M9 9h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zM5 15V5a2 2 0 0 1 2-2h8',
  menu: 'M4 7h16M4 12h16M4 17h16',
  alert: 'M12 9v5M12 17.5v.5M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z',
  cloud: 'M7 18a4 4 0 0 1-.4-8A6 6 0 0 1 18 9.5a3.5 3.5 0 0 1-.5 8.5z',
  palette:
    'M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3 3h-1.5a1.5 1.5 0 0 0-1 2.6c.4.4.5 1 .2 1.5-.3.6-1 .9-1.7.9ZM7.5 12.5h.01M10 8.5h.01M14.5 8h.01',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  chevronUp: 'M5 15l7-7 7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 19v2H6',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z',
  undo: 'M4 9h11a5 5 0 0 1 0 10h-5M4 9l4-4M4 9l4 4',
  map: 'M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5zM9 4v13M15 6.5v13',
  share: 'M7 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM22 6a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM22 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM7 11l10-4M7 13l10 4',
} as const

export type IconName = keyof typeof PATHS

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  /**
   * Accessible label. Omit it for icons that sit next to visible text -- a
   * duplicate label is noise for screen reader users, so those are hidden
   * from the accessibility tree instead.
   */
  title?: string
}

export function Icon({ name, size = 18, title, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  )
}
