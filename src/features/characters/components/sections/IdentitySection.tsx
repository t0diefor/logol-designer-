import { Field } from '@/components/ui/Field'
import { PaletteEditor } from '@/components/ui/PaletteEditor'
import { TagInput } from '@/components/ui/TagInput'
import type { Character } from '@/types/character'
import { FieldGrid, SectionIntro, TextField } from './section-kit'

export function IdentitySection({
  character,
  onChange,
}: {
  character: Character
  onChange: (changes: Partial<Character>) => void
}) {
  return (
    <>
      <SectionIntro>
        Who this person is at a glance. The role and pronouns appear on every card and are used when
        the script names a speaker.
      </SectionIntro>

      <FieldGrid>
        <TextField
          label="Name"
          value={character.name}
          onChange={(name) => onChange({ name })}
          placeholder="Mira Halloway"
        />
        <TextField
          label="Role"
          hint="How they function in the story, not their job."
          value={character.role}
          onChange={(role) => onChange({ role })}
          placeholder="Protagonist"
        />
        <TextField
          label="Pronouns"
          value={character.pronouns}
          onChange={(pronouns) => onChange({ pronouns })}
          placeholder="she/her"
        />
        <TextField
          label="Age range"
          hint="A range is usually more useful to an artist than an exact number."
          value={character.ageRange}
          onChange={(ageRange) => onChange({ ageRange })}
          placeholder="Late twenties"
        />
      </FieldGrid>

      <div className="mt-7 grid gap-7 sm:grid-cols-2">
        <Field
          label="Tags"
          hint="Used to filter the cast. Lowercased automatically so filtering is case-insensitive."
        >
          {({ id, describedBy }) => (
            <TagInput
              id={id}
              describedBy={describedBy}
              value={character.tags}
              onChange={(tags) => onChange({ tags })}
            />
          )}
        </Field>

        <Field
          label="Colour palette"
          hint="Fixes the character's colours so they survive a change of colourist."
        >
          {() => (
            <PaletteEditor
              value={character.palette}
              onChange={(palette) => onChange({ palette })}
            />
          )}
        </Field>
      </div>
    </>
  )
}
