import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ItemFields, type ItemFieldValues } from '../components/ItemFields'
import { ItemTags } from '../components/ItemTags'
import { CATEGORIES, CATEGORY_LABELS, COLORS, type Category, type Color, type Item } from '../types'

export function WardrobePage() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [editing, setEditing] = useState<Item | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .listItems()
      .then(setItems)
      .catch((err: Error) => setError(err.message))
  }, [])

  if (error && !items) return <p className="page error">{error}</p>
  if (!items) return <p className="page muted">Loading…</p>

  if (items.length === 0) {
    return (
      <div className="page empty">
        <h1>My Wardrobe</h1>
        <p className="muted">Your wardrobe is empty. Add your first item to get started.</p>
        <Link className="button primary" to="/add">
          Add an item
        </Link>
      </div>
    )
  }

  const counts = new Map<Category, number>()
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
  const visible = filter === 'all' ? items : items.filter((item) => item.category === filter)

  async function remove(item: Item) {
    try {
      await api.deleteItem(item.id)
      setItems((current) => current?.filter((i) => i.id !== item.id) ?? null)
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the item')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>My Wardrobe</h1>
        <span className="muted">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="chips">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          All
        </button>
        {CATEGORIES.filter((category) => counts.has(category)).map((category) => (
          <button
            key={category}
            className={filter === category ? 'active' : ''}
            onClick={() => setFilter(category)}
          >
            {CATEGORY_LABELS[category]} · {counts.get(category)}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="grid">
        {visible.map((item) => (
          <button key={item.id} className="card item" onClick={() => setEditing(item)}>
            <div className="cutout">
              <img src={item.image_url} alt={item.name || item.category} loading="lazy" />
            </div>
            <div className="item-body">
              <span className="item-name">{item.name || CATEGORY_LABELS[item.category]}</span>
              <ItemTags item={item} />
            </div>
          </button>
        ))}
      </div>

      {editing && (
        <EditDialog
          item={editing}
          onClose={() => setEditing(null)}
          onDelete={() => remove(editing)}
          onSaved={(updated) => {
            setItems((current) => current?.map((i) => (i.id === updated.id ? updated : i)) ?? null)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

interface EditDialogProps {
  item: Item
  onClose: () => void
  onDelete: () => void
  onSaved: (item: Item) => void
}

function EditDialog({ item, onClose, onDelete, onSaved }: EditDialogProps) {
  const [fields, setFields] = useState<ItemFieldValues>({
    name: item.name,
    category: item.category,
    fit: item.fit,
    pattern: item.pattern,
  })
  const [color, setColor] = useState<Color>(item.color)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      onSaved(await api.updateItem(item.id, { ...fields, color }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes')
    }
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <form className="card dialog" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="cutout">
          <img src={item.image_url} alt={item.name || item.category} />
        </div>
        <ItemFields value={fields} onChange={setFields} />
        <label className="field">
          <span className="field-label">Colour</span>
          <select value={color} onChange={(e) => setColor(e.target.value as Color)}>
            {COLORS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row spread">
          {confirmingDelete ? (
            <button type="button" className="danger" onClick={onDelete}>
              Confirm delete
            </button>
          ) : (
            <button type="button" className="link danger" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          )}
          <div className="row">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary">Save</button>
          </div>
        </div>
      </form>
    </div>
  )
}
