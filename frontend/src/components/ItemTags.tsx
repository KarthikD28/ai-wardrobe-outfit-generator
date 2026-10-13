import { CATEGORY_LABELS, type Item, hasFit } from '../types'

export function ItemTags({ item }: { item: Item }) {
  return (
    <div className="tags">
      <span className="tag">
        <span className="swatch" style={{ background: item.color_hex }} />
        {item.color}
      </span>
      <span className="tag">{CATEGORY_LABELS[item.category]}</span>
      {hasFit(item.category) && <span className="tag">{item.fit}</span>}
      {item.pattern !== 'solid' && <span className="tag">{item.pattern}</span>}
    </div>
  )
}
