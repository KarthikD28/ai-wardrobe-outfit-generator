import { useEffect, useState } from 'react'
import { api } from '../api'
import { explainOutfit, generateOutfit, outfitKey } from '../style/engine'
import { CATEGORIES, CATEGORY_LABELS, type Item, type Outfit } from '../types'

const byCategory = (a: Item, b: Item) =>
  CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)

export function OutfitsPage() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api.listItems(), api.listOutfits()])
      .then(([loadedItems, loadedOutfits]) => {
        setItems(loadedItems)
        setOutfits(loadedOutfits)
      })
      .catch((err: Error) => setMessage(err.message))
  }, [])

  async function generate() {
    if (!items) return
    setMessage('')
    const seen = new Set(outfits.map((outfit) => outfitKey(outfit.items)))
    const result = generateOutfit(items, { seen })
    if (!result.ok) return setMessage(result.message)
    if (seen.has(outfitKey(result.items))) {
      return setMessage('You have seen every outfit your wardrobe can make. Add more items for new ones.')
    }
    setBusy(true)
    try {
      const outfit = await api.saveOutfit(result.items.map((item) => item.id))
      setOutfits((current) => [outfit, ...current])
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save the outfit')
    } finally {
      setBusy(false)
    }
  }

  async function remove(outfit: Outfit) {
    try {
      await api.deleteOutfit(outfit.id)
      setOutfits((current) => current.filter((o) => o.id !== outfit.id))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not remove the outfit')
    }
  }

  return (
    <div className="page narrow">
      <h1>Outfit Generator</h1>
      <button className="primary generate" onClick={generate} disabled={!items || busy}>
        Generate Outfit
      </button>
      {message && <p className="notice">{message}</p>}

      <div className="feed">
        {outfits.map((outfit) => (
          <article key={outfit.id} className="card outfit">
            <div className="outfit-items">
              {[...outfit.items].sort(byCategory).map((item) => (
                <figure key={item.id}>
                  <div className="cutout">
                    <img src={item.image_url} alt={item.name || item.category} loading="lazy" />
                  </div>
                  <figcaption>{item.name || CATEGORY_LABELS[item.category]}</figcaption>
                </figure>
              ))}
            </div>
            <ul className="reasons">
              {explainOutfit(outfit.items).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            <button className="link" onClick={() => remove(outfit)}>
              Remove
            </button>
          </article>
        ))}
        {items && outfits.length === 0 && !message && (
          <p className="muted">Your generated outfits will appear here.</p>
        )}
      </div>
    </div>
  )
}
