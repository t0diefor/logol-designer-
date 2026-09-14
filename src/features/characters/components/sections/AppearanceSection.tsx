import type { Character } from '@/types/character'
import { FieldGrid, SectionIntro, TextField } from './section-kit'

/**
 * Appearance, broken into named fields rather than one prose blob.
 *
 * That costs more form UI, but it is what makes a sheet reusable: fields can
 * be diffed between versions, checked for completeness by the consistency
 * checklist, and assembled into a generation prompt without re-parsing English.
 */
export function AppearanceSection({
  character,
  onChange,
}: {
  character: Character
  onChange: (changes: Partial<Character>) => void
}) {
  const { appearance } = character

  const setAppearance = (field: keyof Character['appearance'], value: string) =>
    onChange({ appearance: { ...appearance, [field]: value } })

  return (
    <>
      <SectionIntro>
        Written once, referred to constantly. Each field is separate so the consistency checklist
        can tell you what an artist is still missing.
      </SectionIntro>

      <FieldGrid>
        <TextField
          label="Hair"
          hint="Silhouette first -- it is how a reader re-identifies someone at a glance."
          value={appearance.hair}
          onChange={(value) => setAppearance('hair', value)}
          placeholder="Shoulder-length, dark auburn, usually tied back"
          multiline
          rows={3}
        />
        <TextField
          label="Eyes"
          hint="Anchors close-up panels, where the face carries the beat."
          value={appearance.eyes}
          onChange={(value) => setAppearance('eyes', value)}
          placeholder="Deep brown, set close, narrow before she speaks"
          multiline
          rows={3}
        />
        <TextField
          label="Skin tone"
          value={appearance.skinTone}
          onChange={(value) => setAppearance('skinTone', value)}
          placeholder="Warm brown, weathered across the nose and forearms"
          multiline
          rows={3}
        />
        <TextField
          label="Body type"
          hint="Proportion and posture carry the character at wide shot."
          value={appearance.bodyType}
          onChange={(value) => setAppearance('bodyType', value)}
          placeholder="Lean and wiry; stands with weight on the back foot"
          multiline
          rows={3}
        />
        <TextField
          label="Height"
          value={appearance.height}
          onChange={(value) => setAppearance('height', value)}
          placeholder="Slightly below average"
        />
        <TextField
          label="Distinguishing marks"
          hint="Scars, tattoos, asymmetries -- the details most often forgotten between artists."
          value={appearance.distinguishingMarks}
          onChange={(value) => setAppearance('distinguishingMarks', value)}
          placeholder="Thin white scar splitting the right eyebrow"
          multiline
          rows={3}
        />
        <TextField
          label="General notes"
          hint="Anything the fields above do not cover: silhouette, the way they hold themselves."
          value={appearance.general}
          onChange={(value) => setAppearance('general', value)}
          multiline
          rows={4}
          wide
        />
      </FieldGrid>
    </>
  )
}
