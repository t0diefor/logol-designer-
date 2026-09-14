import { Field } from '@/components/ui/Field'
import { TagInput } from '@/components/ui/TagInput'
import type { Character } from '@/types/character'
import { FieldGrid, SectionIntro, TextField } from './section-kit'

export function StorySection({
  character,
  onChange,
}: {
  character: Character
  onChange: (changes: Partial<Character>) => void
}) {
  return (
    <>
      <SectionIntro>
        What the character wants, what stops them, and how they sound. This is the half of the sheet
        that keeps them recognisable in the script rather than in the art.
      </SectionIntro>

      <Field
        label="Personality traits"
        hint="Three to six adjectives is usually plenty. Press Enter after each."
        className="mb-7 max-w-xl"
      >
        {({ id, describedBy }) => (
          <TagInput
            id={id}
            describedBy={describedBy}
            value={character.personality}
            onChange={(personality) => onChange({ personality })}
            placeholder="stubborn, watchful, dryly funny"
            max={20}
          />
        )}
      </Field>

      <FieldGrid>
        <TextField
          label="Goals"
          hint="A want they cannot state plainly gives scenes something to be about."
          value={character.goals}
          onChange={(goals) => onChange({ goals })}
          multiline
          rows={4}
        />
        <TextField
          label="Weaknesses"
          hint="A weakness that creates plot beats one that only creates sympathy."
          value={character.weaknesses}
          onChange={(weaknesses) => onChange({ weaknesses })}
          multiline
          rows={4}
        />
        <TextField
          label="Powers and abilities"
          hint="Include the cost. An ability without a limit stops generating drama."
          value={character.powers}
          onChange={(powers) => onChange({ powers })}
          multiline
          rows={4}
        />
        <TextField
          label="Dialogue style"
          hint="Sentence length, verbal tics, what they say when deflecting."
          value={character.dialogueStyle}
          onChange={(dialogueStyle) => onChange({ dialogueStyle })}
          multiline
          rows={4}
        />
        <TextField
          label="Backstory"
          hint="Only what affects the present. History the reader never feels is just notes."
          value={character.backstory}
          onChange={(backstory) => onChange({ backstory })}
          multiline
          rows={8}
          wide
        />
      </FieldGrid>
    </>
  )
}
