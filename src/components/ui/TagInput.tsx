import { useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'
import { Input } from './Input'

export interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  max?: number
  id?: string
  describedBy?: string
}

/**
 * Free-form tag entry.
 *
 * Tags are lowercased and de-duplicated on commit, matching the `tagSchema`
 * rule in the data model, so filtering by tag is case-insensitive without
 * every filter having to remember to normalise.
 *
 * Backspace on an empty field removes the last tag -- the behaviour people
 * expect from every other tag input, and cheap to support.
 */
export function TagInput({
  value,
  onChange,
  placeholder = 'Add a tag and press Enter',
  max = 30,
  id,
  describedBy,
}: TagInputProps) {
  const [draft, setDraft] = useState('')

  function commit() {
    const tag = draft.trim().toLowerCase()
    setDraft('')
    if (!tag) return
    if (value.includes(tag)) return
    if (value.length >= max) return
    onChange([...value, tag])
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit()
      return
    }
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-pill border border-line bg-bg-inset',
                  'py-0.5 pl-2.5 pr-1 text-xs text-ink-muted',
                )}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((item) => item !== tag))}
                  aria-label={`Remove tag ${tag}`}
                  className="rounded-pill p-0.5 text-ink-faint hover:text-danger"
                >
                  <Icon name="close" size={12} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <Input
        id={id}
        aria-describedby={describedBy}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={value.length >= max ? `Limit of ${max} tags reached` : placeholder}
        disabled={value.length >= max}
      />
    </div>
  )
}
