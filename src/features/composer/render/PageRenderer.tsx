import { Fragment } from 'react'
import { balloonDashArray, balloonHasOutline, balloonPath, thoughtTailBubbles } from './balloon-shapes'
import { layOutBalloon } from './balloon-text'
import type { Balloon, Page, Panel, Placement } from '@/types/comic'

/**
 * The page renderer: one component, two outputs.
 *
 * This is the whole architecture of the composer in one file. The editor
 * renders this, and phase 7's export serialises *this same tree* to a string
 * and rasterises it. There is no second drawing path, so what is on screen is
 * what comes out -- the failure mode of screenshot-based exporters, where the
 * export quietly disagrees with the editor, cannot happen here.
 *
 * Three constraints that follow, and are not negotiable:
 *
 * 1. **No `foreignObject`.** Safari rasterises it inconsistently and some
 *    renderers drop it entirely. All text is `<text>`/`<tspan>`, which is why
 *    `lib/text-layout.ts` exists to wrap lines by hand.
 *
 * 2. **No CSS custom properties for anything that must survive export.** A
 *    serialised SVG is detached from the document, so `var(--pf-ink)` resolves
 *    to nothing. Document colours are literals carried in the page data;
 *    editor-only chrome (selection, guides) may use variables because it is
 *    never exported.
 *
 * 3. **Images arrive as resolved URLs**, passed in by the caller. The editor
 *    passes object URLs; the exporter passes data URLs, because a canvas is
 *    tainted by anything cross-origin and a blob: URL inside a serialised SVG
 *    does not resolve at all.
 */

/** Ink and paper for the document itself. Deliberately literal, not tokens. */
const INK = '#111111'
const PAPER = '#FFFFFF'
const BALLOON_FILL = '#FFFFFF'


export interface PageRendererProps {
  page: Page
  /** Resolved image URLs by asset id. Missing ids render as a marked gap. */
  imageUrls?: Map<string, string>
  /** Draws margin and gutter guides. Editor only — never true when exporting. */
  showGuides?: boolean
  /** Panel currently selected, for the editor's highlight. */
  selectedPanelId?: string | null
  /** Rendered after the page content, for editor chrome such as handles. */
  overlay?: React.ReactNode
}

function PlacementShape({
  placement,
  imageUrls,
}: {
  placement: Placement
  imageUrls?: Map<string, string>
}) {
  const { rect, rotation, flipX, opacity } = placement
  const url = placement.refId ? imageUrls?.get(placement.refId) : undefined

  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const transform = [
    rotation ? `rotate(${rotation} ${cx} ${cy})` : '',
    flipX ? `translate(${cx * 2} 0) scale(-1 1)` : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (!url) {
    // A marked gap, not a silent blank: an export with a missing image should
    // be obvious in the proof rather than discovered by a printer.
    return (
      <g transform={transform || undefined} opacity={opacity}>
        <rect {...rect} fill="#E8E8E8" stroke="#BBBBBB" strokeWidth={1} />
        <path
          d={`M${rect.x} ${rect.y} L${rect.x + rect.width} ${rect.y + rect.height} M${rect.x + rect.width} ${rect.y} L${rect.x} ${rect.y + rect.height}`}
          stroke="#BBBBBB"
          strokeWidth={1}
          fill="none"
        />
      </g>
    )
  }

  return (
    <image
      href={url}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      preserveAspectRatio="xMidYMid slice"
      opacity={opacity}
      transform={transform || undefined}
    />
  )
}

function BalloonShape({ balloon }: { balloon: Balloon }) {
  const isSfx = balloon.kind === 'sfx'

  // Shared with the inspector, which has to report the same fit the page
  // draws. See render/balloon-text.ts.
  const { lines, lineHeight, textX, textAnchor, firstBaseline, font, weight } =
    layOutBalloon(balloon)

  const outline = balloonHasOutline(balloon.kind) ? balloonPath(balloon) : ''

  return (
    <g>
      {outline ? (
        <path
          d={outline}
          fill={BALLOON_FILL}
          stroke={INK}
          strokeWidth={balloon.kind === 'caption' ? 1.5 : 2}
          strokeDasharray={balloonDashArray(balloon.kind)}
          strokeLinejoin="round"
        />
      ) : null}

      {balloon.kind === 'thought'
        ? thoughtTailBubbles(balloon).map((bubble, index) => (
            <circle
              key={index}
              cx={bubble.cx}
              cy={bubble.cy}
              r={bubble.r}
              fill={BALLOON_FILL}
              stroke={INK}
              strokeWidth={2}
            />
          ))
        : null}

      {lines.length > 0 ? (
        <text
          x={textX}
          y={firstBaseline}
          textAnchor={textAnchor}
          fontFamily={font}
          fontSize={balloon.fontSize}
          fontWeight={weight}
          fill={INK}
          // SFX reads as drawn sound, so it gets a stroke to lift it off art.
          stroke={isSfx ? PAPER : undefined}
          strokeWidth={isSfx ? balloon.fontSize * 0.18 : undefined}
          paintOrder={isSfx ? 'stroke' : undefined}
          style={{ whiteSpace: 'pre' }}
        >
          {lines.map((line, index) => (
            <tspan key={index} x={textX} dy={index === 0 ? 0 : lineHeight}>
              {/* A space keeps an empty tspan from collapsing the line. */}
              {line === '' ? ' ' : line}
            </tspan>
          ))}
        </text>
      ) : null}
    </g>
  )
}

function PanelShape({
  panel,
  page,
  imageUrls,
  selected,
}: {
  panel: Panel
  page: Page
  imageUrls?: Map<string, string>
  selected: boolean
}) {
  const clipId = `pf-clip-${panel.id}`
  const { rect } = panel

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect {...rect} rx={panel.radius} />
        </clipPath>
      </defs>

      <rect {...rect} rx={panel.radius} fill={panel.fill ?? page.background ?? PAPER} />

      {/* Everything inside the panel is clipped to it, which is what makes a
          panel a window rather than a frame drawn on top of loose art. */}
      <g clipPath={`url(#${clipId})`}>
        {[...panel.placements]
          .sort((a, b) => a.z - b.z)
          .map((placement) => (
            <PlacementShape key={placement.id} placement={placement} imageUrls={imageUrls} />
          ))}

        {[...panel.balloons]
          .sort((a, b) => a.z - b.z)
          .map((balloon) => (
            <BalloonShape key={balloon.id} balloon={balloon} />
          ))}
      </g>

      {panel.borderWidth > 0 ? (
        <rect
          {...rect}
          rx={panel.radius}
          fill="none"
          stroke={INK}
          strokeWidth={panel.borderWidth}
        />
      ) : null}

      {/* Editor chrome. Never drawn when exporting, because showGuides is off
          and selectedPanelId is undefined. */}
      {selected ? (
        <rect
          {...rect}
          rx={panel.radius}
          fill="none"
          stroke="var(--pf-primary)"
          strokeWidth={2}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      ) : null}
    </g>
  )
}

/**
 * Renders a page as SVG content.
 *
 * Returns the inner content only -- no `<svg>` wrapper -- so the editor can
 * mount it inside an interactive, pannable surface while the exporter mounts
 * it inside a bare sized `<svg>` with no chrome at all.
 */
export function PageContent({
  page,
  imageUrls,
  showGuides = false,
  selectedPanelId = null,
  overlay,
}: PageRendererProps) {
  const { width, height } = page.size

  return (
    <>
      <rect width={width} height={height} fill={page.background ?? PAPER} />

      {showGuides ? (
        <rect
          x={page.margin}
          y={page.margin}
          width={width - page.margin * 2}
          height={height - page.margin * 2}
          fill="none"
          stroke="var(--pf-primary)"
          strokeOpacity={0.35}
          strokeWidth={1}
          strokeDasharray="4 4"
          pointerEvents="none"
        />
      ) : null}

      {[...page.panels]
        .sort((a, b) => a.z - b.z)
        .map((panel) => (
          <Fragment key={panel.id}>
            <PanelShape
              panel={panel}
              page={page}
              imageUrls={imageUrls}
              selected={panel.id === selectedPanelId}
            />
          </Fragment>
        ))}

      {overlay}
    </>
  )
}

/** A complete, standalone `<svg>` for one page. Used by thumbnails and export. */
export function PageSvg({ page, imageUrls, className }: PageRendererProps & { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${page.size.width} ${page.size.height}`}
      width={page.size.width}
      height={page.size.height}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={`Page ${page.index}`}
    >
      <PageContent page={page} imageUrls={imageUrls} />
    </svg>
  )
}
