import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { fitBalloonRect, layOutBalloon } from '../render/balloon-text'
import { cn } from '@/lib/cn'
import type { Asset } from '@/types/asset'
import type { Character } from '@/types/character'
import type { Balloon, Page, Panel } from '@/types/comic'

export interface PanelInspectorProps {
  page: Page
  panel: Panel
  assets: Asset[]
  cast: Character[]
  onPanelChange: (changes: Partial<Panel>) => void
  onBalloonAdd: (kind: Balloon['kind']) => void
  onBalloonChange: (balloonId: string, changes: Partial<Balloon>) => void
  onBalloonDelete: (balloonId: string) => void
  onPlacementAdd: (assetId: string) => void
  onPlacementChange: (placementId: string, changes: { opacity?: number; flipX?: boolean }) => void
  onPlacementDelete: (placementId: string) => void
  onReorder: (direction: 'forward' | 'backward' | 'front' | 'back') => void
  onDuplicate: () => void
  onDelete: () => void
}

const BALLOON_KINDS: { value: Balloon['kind']; label: string }[] = [
  { value: 'speech', label: 'Speech' },
  { value: 'thought', label: 'Thought' },
  { value: 'caption', label: 'Caption' },
  { value: 'sfx', label: 'SFX' },
  { value: 'whisper', label: 'Whisper' },
  { value: 'shout', label: 'Shout' },
]

/** Properties for the selected panel: art, text, order and notes. */
export function PanelInspector({
  page,
  panel,
  assets,
  cast,
  onPanelChange,
  onBalloonAdd,
  onBalloonChange,
  onBalloonDelete,
  onPlacementAdd,
  onPlacementChange,
  onPlacementDelete,
  onReorder,
  onDuplicate,
  onDelete,
}: PanelInspectorProps) {
  const panelNumber = page.panels.indexOf(panel) + 1

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel as="h2">Panel {panelNumber}</SectionLabel>
        <div className="flex gap-1">
          <IconButton icon="copy" label="Duplicate panel" size="sm" onClick={onDuplicate} />
          <IconButton icon="trash" label="Delete panel" size="sm" variant="danger" onClick={onDelete} />
        </div>
      </div>

      <div>
        <SectionLabel className="mb-2">Stacking</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" onClick={() => onReorder('front')}>Bring to front</Button>
          <Button size="sm" onClick={() => onReorder('back')}>Send to back</Button>
          <Button size="sm" variant="ghost" onClick={() => onReorder('forward')}>Forward</Button>
          <Button size="sm" variant="ghost" onClick={() => onReorder('backward')}>Backward</Button>
        </div>
      </div>

      <Field label="Description" hint="What happens in this panel, for the artist.">
        {({ id }) => (
          <Textarea
            id={id}
            rows={3}
            value={panel.description}
            onChange={(event) => onPanelChange({ description: event.target.value })}
            placeholder="Mira at the top of the ladder, lamp unlit, looking down."
          />
        )}
      </Field>

      <Field label="Shot" hint="Camera note: low angle, wide, over the shoulder.">
        {({ id }) => (
          <Input
            id={id}
            value={panel.shot}
            onChange={(event) => onPanelChange({ shot: event.target.value })}
            placeholder="Low angle, wide"
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Border">
          {({ id }) => (
            <Input
              id={id}
              type="number"
              min={0}
              max={12}
              value={panel.borderWidth}
              onChange={(event) => onPanelChange({ borderWidth: Number(event.target.value) })}
            />
          )}
        </Field>
        <Field label="Corner radius">
          {({ id }) => (
            <Input
              id={id}
              type="number"
              min={0}
              max={40}
              value={panel.radius}
              onChange={(event) => onPanelChange({ radius: Number(event.target.value) })}
            />
          )}
        </Field>
      </div>

      {/* ---- Art ---- */}
      <div>
        <SectionLabel className="mb-2">Art in this panel</SectionLabel>
        {panel.placements.length === 0 ? (
          <p className="mb-2 text-xs text-ink-faint">
            Nothing placed yet. Add an image from the asset library below.
          </p>
        ) : (
          <ul className="mb-3 flex flex-col gap-2">
            {panel.placements.map((placement) => {
              const asset = assets.find((candidate) => candidate.id === placement.refId)
              return (
                <li
                  key={placement.id}
                  className="rounded-md border border-line bg-bg-inset p-2.5 border-[length:var(--pf-border-width)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-ink">
                      {asset?.name ?? 'Missing asset'}
                    </span>
                    <IconButton
                      icon="trash"
                      label={`Remove ${asset?.name ?? 'image'} from panel`}
                      size="sm"
                      variant="danger"
                      onClick={() => onPlacementDelete(placement.id)}
                    />
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                    Opacity
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={placement.opacity}
                      onChange={(event) =>
                        onPlacementChange(placement.id, { opacity: Number(event.target.value) })
                      }
                      className="flex-1 accent-[var(--pf-primary)]"
                      aria-label={`Opacity of ${asset?.name ?? 'image'}`}
                    />
                    <span className="w-8 text-right tabular-nums">
                      {Math.round(placement.opacity * 100)}%
                    </span>
                  </label>
                  <label className="mt-1.5 flex items-center gap-2 text-xs text-ink-muted">
                    <input
                      type="checkbox"
                      checked={placement.flipX}
                      onChange={(event) =>
                        onPlacementChange(placement.id, { flipX: event.target.checked })
                      }
                      className="accent-[var(--pf-primary)]"
                    />
                    Flip horizontally
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        {assets.length > 0 ? (
          <Select
            aria-label="Add an image to this panel"
            value=""
            onChange={(event) => {
              if (event.target.value) onPlacementAdd(event.target.value)
            }}
          >
            <option value="">Add an image&hellip;</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-xs text-ink-faint">
            No assets in this project yet. Add some in the Assets area first.
          </p>
        )}
      </div>

      {/* ---- Text ---- */}
      <div>
        <SectionLabel className="mb-2">Text</SectionLabel>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {BALLOON_KINDS.map((kind) => (
            <Button key={kind.value} size="sm" icon="plus" onClick={() => onBalloonAdd(kind.value)}>
              {kind.label}
            </Button>
          ))}
        </div>

        {panel.balloons.length === 0 ? (
          <p className="text-xs text-ink-faint">
            No text yet. Add a speech balloon, a caption or a sound effect.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {[...panel.balloons]
              .sort((a, b) => a.z - b.z)
              .map((balloon, index) => (
                <li
                  key={balloon.id}
                  className={cn(
                    'rounded-md border border-line bg-bg-inset p-2.5',
                    'border-[length:var(--pf-border-width)]',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Select
                      value={balloon.kind}
                      onChange={(event) =>
                        onBalloonChange(balloon.id, { kind: event.target.value as Balloon['kind'] })
                      }
                      aria-label={`Text ${index + 1} kind`}
                      fullWidth={false}
                      className="h-8 text-xs"
                    >
                      {BALLOON_KINDS.map((kind) => (
                        <option key={kind.value} value={kind.value}>
                          {kind.label}
                        </option>
                      ))}
                    </Select>
                    <IconButton
                      icon="trash"
                      label={`Delete text ${index + 1}`}
                      size="sm"
                      variant="danger"
                      className="ml-auto"
                      onClick={() => onBalloonDelete(balloon.id)}
                    />
                  </div>

                  <Textarea
                    rows={2}
                    className="mt-2"
                    value={balloon.text}
                    onChange={(event) => onBalloonChange(balloon.id, { text: event.target.value })}
                    aria-label={`Text ${index + 1} content`}
                    placeholder={balloon.kind === 'sfx' ? 'TSSK' : 'What they say'}
                  />

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-ink-muted">
                      Size
                      <Input
                        type="number"
                        min={4}
                        max={96}
                        value={balloon.fontSize}
                        onChange={(event) =>
                          onBalloonChange(balloon.id, { fontSize: Number(event.target.value) })
                        }
                        aria-label={`Text ${index + 1} font size`}
                        fullWidth={false}
                        className="h-8 w-16 text-xs"
                      />
                    </label>

                    <Select
                      value={balloon.align}
                      onChange={(event) =>
                        onBalloonChange(balloon.id, {
                          align: event.target.value as Balloon['align'],
                        })
                      }
                      aria-label={`Text ${index + 1} alignment`}
                      fullWidth={false}
                      className="h-8 text-xs"
                    >
                      <option value="left">Left</option>
                      <option value="center">Centre</option>
                      <option value="right">Right</option>
                    </Select>

                    {balloon.kind !== 'caption' && balloon.kind !== 'sfx' && cast.length > 0 ? (
                      <Select
                        value={balloon.speakerId ?? ''}
                        onChange={(event) =>
                          onBalloonChange(balloon.id, { speakerId: event.target.value || null })
                        }
                        aria-label={`Text ${index + 1} speaker`}
                        fullWidth={false}
                        className="h-8 text-xs"
                      >
                        <option value="">No speaker</option>
                        {cast.map((character) => (
                          <option key={character.id} value={character.id}>
                            {character.name}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                  </div>

                  {/* The page clips text that does not fit rather than letting
                      it spill over the art. Clipping without saying so would
                      just look like lost dialogue, so it is reported here, and
                      the balloon is only ever resized on request. */}
                  {layOutBalloon(balloon).truncated ? (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span>This text is longer than the balloon, so the page cuts it off.</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onBalloonChange(balloon.id, { rect: fitBalloonRect(balloon) })
                        }
                      >
                        Grow the balloon to fit
                      </Button>
                    </p>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}
