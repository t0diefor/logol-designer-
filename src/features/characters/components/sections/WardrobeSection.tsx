import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { PaletteEditor } from '@/components/ui/PaletteEditor'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { newId } from '@/lib/id'
import type { Character, Outfit } from '@/types/character'
import { ListHeader, TextField } from './section-kit'

export function WardrobeSection({
  character,
  onChange,
}: {
  character: Character
  onChange: (changes: Partial<Character>) => void
}) {
  const { outfits } = character

  function addOutfit() {
    const outfit: Outfit = {
      id: newId(),
      name: outfits.length === 0 ? 'Everyday' : `Outfit ${outfits.length + 1}`,
      description: '',
      accessories: '',
      palette: { name: '', colors: [] },
      references: [],
      // The first outfit becomes the default automatically -- a wardrobe with
      // no default is the state the consistency checklist warns about.
      isDefault: outfits.length === 0,
    }
    onChange({ outfits: [...outfits, outfit] })
  }

  function updateOutfit(id: string, changes: Partial<Outfit>) {
    onChange({
      outfits: outfits.map((outfit) => (outfit.id === id ? { ...outfit, ...changes } : outfit)),
    })
  }

  function removeOutfit(id: string) {
    const remaining = outfits.filter((outfit) => outfit.id !== id)
    // If the default was removed, promote the first survivor rather than
    // leaving the character with no default at all.
    if (remaining.length > 0 && !remaining.some((outfit) => outfit.isDefault)) {
      remaining[0] = { ...remaining[0]!, isDefault: true }
    }
    onChange({ outfits: remaining })
  }

  function setDefault(id: string) {
    onChange({
      outfits: outfits.map((outfit) => ({ ...outfit, isDefault: outfit.id === id })),
    })
  }

  return (
    <>
      <ListHeader
        title="Wardrobe"
        description="Named outfits so a character can be drawn consistently across scenes. The default is what a panel uses when no outfit is specified."
        action={
          <Button icon="plus" onClick={addOutfit} disabled={outfits.length >= 30}>
            Add outfit
          </Button>
        }
      />

      {outfits.length === 0 ? (
        <EmptyState
          icon="user"
          title="No outfits yet"
          description="Without a default outfit, every panel improvises a costume. One entry called 'Everyday' is usually enough to start."
          action={
            <Button variant="primary" icon="plus" onClick={addOutfit}>
              Add the first outfit
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {outfits.map((outfit) => (
            <li
              key={outfit.id}
              className={cn(
                'rounded-lg border p-4 border-[length:var(--pf-border-width)]',
                outfit.isDefault ? 'border-primary bg-surface' : 'border-line bg-surface',
              )}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                    <input
                      type="radio"
                      name="pf-default-outfit"
                      checked={outfit.isDefault}
                      onChange={() => setDefault(outfit.id)}
                      className="accent-[var(--pf-primary)]"
                    />
                    Default outfit
                  </label>
                </div>
                <IconButton
                  icon="trash"
                  label={`Delete outfit ${outfit.name}`}
                  size="sm"
                  variant="danger"
                  onClick={() => removeOutfit(outfit.id)}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Outfit name"
                  value={outfit.name}
                  onChange={(name) => updateOutfit(outfit.id, { name })}
                  placeholder="Everyday"
                />
                <TextField
                  label="Accessories"
                  hint="Items that travel with the character regardless of outfit."
                  value={outfit.accessories}
                  onChange={(accessories) => updateOutfit(outfit.id, { accessories })}
                  placeholder="Brass lantern, leather satchel"
                />
                <TextField
                  label="Description"
                  value={outfit.description}
                  onChange={(description) => updateOutfit(outfit.id, { description })}
                  placeholder="Heavy canvas coat over a patched jumper; boots worn through at the heel"
                  multiline
                  rows={3}
                  wide
                />
                <Field label="Outfit palette" className="sm:col-span-2">
                  {() => (
                    <PaletteEditor
                      value={outfit.palette}
                      onChange={(palette) => updateOutfit(outfit.id, { palette })}
                      max={6}
                    />
                  )}
                </Field>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
