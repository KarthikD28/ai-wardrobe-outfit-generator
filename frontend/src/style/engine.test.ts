import { describe, expect, it } from 'vitest'
import type { Color } from '../types'
import {
  COLOR_MATRIX,
  type StyleItem,
  canAdd,
  colorsWork,
  explainOutfit,
  generateOutfit,
  isValidOutfit,
  layeringWorks,
  outfitKey,
} from './engine'

let nextId = 1
const item = (category: StyleItem['category'], overrides: Partial<StyleItem> = {}): StyleItem => ({
  id: nextId++,
  category,
  fit: 'regular',
  pattern: 'solid',
  color: 'black',
  ...overrides,
})

/** Deterministic pseudo-random source so generation tests are repeatable. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

describe('colour rule', () => {
  it('has a symmetric matrix', () => {
    for (const [a, partners] of Object.entries(COLOR_MATRIX) as [Color, Color[]][]) {
      for (const b of partners) expect(COLOR_MATRIX[b], `${b} -> ${a}`).toContain(a)
    }
  })

  it('lets neutrals and matching colours go with anything', () => {
    expect(colorsWork('black', 'orange')).toBe(true)
    expect(colorsWork('purple', 'navy')).toBe(true)
    expect(colorsWork('red', 'red')).toBe(true)
  })

  it('rejects clashing colours', () => {
    expect(colorsWork('red', 'purple')).toBe(false)
    expect(colorsWork('orange', 'pink')).toBe(false)
    expect(colorsWork('blue', 'orange')).toBe(true)
  })
})

describe('fit rule', () => {
  it('rejects an oversized top with an oversized bottom', () => {
    const top = item('top', { fit: 'oversized' })
    expect(canAdd([top], item('bottom', { fit: 'oversized' }))).toBe(false)
    expect(canAdd([top], item('bottom', { fit: 'slim' }))).toBe(true)
    expect(canAdd([top], item('bottom', { fit: 'regular' }))).toBe(true)
  })

  it('does not apply to outerwear', () => {
    const top = item('top', { fit: 'oversized' })
    expect(canAdd([top], item('outerwear', { fit: 'oversized' }))).toBe(true)
  })
})

describe('layering rule', () => {
  it('rejects an oversized piece under a tighter layer', () => {
    const tee = item('top', { fit: 'oversized' })
    expect(canAdd([tee], item('layer', { fit: 'regular' }))).toBe(false)
    expect(canAdd([tee], item('layer', { fit: 'oversized' }))).toBe(true)
    expect(canAdd([item('top', { fit: 'slim' })], item('layer', { fit: 'regular' }))).toBe(true)
  })

  it('checks each layer against the one beneath it', () => {
    const tee = item('top')
    const hoodie = item('layer', { fit: 'oversized' })
    expect(layeringWorks([item('outerwear', { fit: 'regular' }), hoodie, tee])).toBe(false)
    expect(layeringWorks([item('outerwear', { fit: 'oversized' }), hoodie, tee])).toBe(true)
  })
})

describe('focal point rule', () => {
  it('allows only one statement piece', () => {
    const graphic = item('top', { pattern: 'graphic' })
    expect(canAdd([graphic], item('bottom', { pattern: 'patterned' }))).toBe(false)
    expect(canAdd([graphic], item('bottom'))).toBe(true)
  })
})

describe('generateOutfit', () => {
  it('explains what is missing from an incomplete wardrobe', () => {
    const result = generateOutfit([item('top'), item('shoes')])
    expect(result).toEqual({ ok: false, message: 'Add a bottom (or a dress) to build an outfit.' })
  })

  it('reports when no top and bottom pass the rules', () => {
    const result = generateOutfit([
      item('top', { color: 'red' }),
      item('bottom', { color: 'purple' }),
    ])
    expect(result.ok).toBe(false)
  })

  it('never uses a mid layer as the base of an outfit', () => {
    const result = generateOutfit([item('layer'), item('bottom')])
    expect(result).toEqual({ ok: false, message: 'Add a top (or a dress) to build an outfit.' })
  })

  it('layers a mid layer over the top rather than treating it as a second top', () => {
    const tee = item('top', { color: 'white' })
    const zip = item('layer')
    const khakis = item('bottom')
    const keys = new Set<string>()
    const random = seeded(3)
    for (let i = 0; i < 50; i++) {
      const result = generateOutfit([khakis, tee, zip], { random })
      if (!result.ok) throw new Error(result.message)
      expect(result.items).toContain(tee)
      expect(result.items).toContain(khakis)
      keys.add(outfitKey(result.items))
    }
    expect(keys).toEqual(new Set([outfitKey([tee, khakis]), outfitKey([tee, khakis, zip])]))
  })

  it('builds an outfit from a dress alone', () => {
    const dress = item('dress', { color: 'green' })
    const result = generateOutfit([dress, item('shoes', { color: 'purple' })])
    expect(result).toEqual({ ok: true, items: [dress] })
  })

  it('only ever produces outfits that pass every rule', () => {
    const wardrobe = [
      item('top', { color: 'red', pattern: 'graphic', fit: 'oversized' }),
      item('top', { color: 'white' }),
      item('top', { color: 'purple', pattern: 'patterned' }),
      item('bottom', { color: 'navy', fit: 'slim' }),
      item('bottom', { color: 'green', fit: 'oversized' }),
      item('bottom', { color: 'beige', pattern: 'patterned' }),
      item('dress', { color: 'yellow' }),
      item('layer', { color: 'gray' }),
      item('layer', { color: 'blue', fit: 'oversized' }),
      item('outerwear', { color: 'brown' }),
      item('outerwear', { color: 'pink', pattern: 'patterned' }),
      item('shoes', { color: 'white' }),
      item('shoes', { color: 'orange' }),
      item('accessory', { color: 'blue' }),
      item('accessory', { color: 'red', pattern: 'patterned' }),
      item('accessory', { color: 'black' }),
    ]
    const random = seeded(7)
    const keys = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const result = generateOutfit(wardrobe, { random })
      if (!result.ok) throw new Error(result.message)
      expect(isValidOutfit(result.items)).toBe(true)
      const count = (c: StyleItem['category']) => result.items.filter((x) => x.category === c)
      expect(count('dress').length + count('top').length).toBe(1)
      expect(count('top').length).toBe(count('bottom').length)
      expect(count('shoes').length).toBeLessThanOrEqual(1)
      expect(count('layer').length).toBeLessThanOrEqual(1)
      expect(count('outerwear').length).toBeLessThanOrEqual(1)
      expect(count('accessory').length).toBeLessThanOrEqual(2)
      keys.add(outfitKey(result.items))
    }
    expect(keys.size).toBeGreaterThan(10)
  })

  it('avoids outfits it has already shown', () => {
    const top = item('top')
    const wardrobe = [top, item('bottom', { color: 'navy' }), item('bottom', { color: 'gray' })]
    const first = generateOutfit(wardrobe, { random: seeded(1) })
    if (!first.ok) throw new Error(first.message)
    const seen = new Set([outfitKey(first.items)])
    for (let seed = 0; seed < 20; seed++) {
      const next = generateOutfit(wardrobe, { seen, random: seeded(seed) })
      if (!next.ok) throw new Error(next.message)
      expect(outfitKey(next.items)).not.toBe(outfitKey(first.items))
    }
  })
})

describe('explainOutfit', () => {
  it('describes the layers from the inside out', () => {
    const reasons = explainOutfit([
      item('outerwear', { name: 'Rain jacket' }),
      item('bottom'),
      item('layer', { name: 'Quarter zip' }),
      item('top', { name: 'White tee' }),
    ])
    expect(reasons).toContain('Layering: White tee, under Quarter zip, under Rain jacket.')
  })

  it('gives a reason for each rule', () => {
    const reasons = explainOutfit([
      item('top', { color: 'red', fit: 'oversized', pattern: 'graphic' }),
      item('bottom', { color: 'black', fit: 'slim' }),
    ])
    expect(reasons).toEqual([
      'Colour: red stands out against neutral pieces.',
      'Fit: the oversized top is balanced by a slim bottom.',
      'Focal point: the graphic top is the only statement piece.',
    ])
  })
})
