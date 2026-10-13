import {
  CATEGORIES,
  CATEGORY_EXAMPLES,
  CATEGORY_LABELS,
  type Category,
  FITS,
  type Fit,
  PATTERNS,
  type Pattern,
  hasFit,
} from '../types'
import { Segmented } from './Segmented'

export interface ItemFieldValues {
  name: string
  category: Category
  fit: Fit
  pattern: Pattern
}

interface Props {
  value: ItemFieldValues
  onChange: (value: ItemFieldValues) => void
}

/** The tagging inputs shared by the add and edit forms. */
export function ItemFields({ value, onChange }: Props) {
  const set = <K extends keyof ItemFieldValues>(key: K, next: ItemFieldValues[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <>
      <label className="field">
        <span className="field-label">Type</span>
        <select
          value={value.category}
          onChange={(e) => set('category', e.target.value as Category)}
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]} ({CATEGORY_EXAMPLES[category]})
            </option>
          ))}
        </select>
      </label>
      {hasFit(value.category) && (
        <Segmented label="Fit" options={FITS} value={value.fit} onChange={(v) => set('fit', v)} />
      )}
      <Segmented
        label="Pattern"
        options={PATTERNS}
        value={value.pattern}
        onChange={(v) => set('pattern', v)}
      />
      <label className="field">
        <span className="field-label">Name (optional)</span>
        <input
          value={value.name}
          maxLength={80}
          placeholder="e.g. Grey hoodie"
          onChange={(e) => set('name', e.target.value)}
        />
      </label>
    </>
  )
}
