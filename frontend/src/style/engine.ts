/**
 * The style engine: pure functions that decide which wardrobe pieces can be
 * worn together. It runs entirely on the device, with no network calls.
 *
 * Outfits are layered: a top (or dress) is the base, a mid layer such as a
 * sweater goes over it, and outerwear goes over both.
 *
 * Four rules:
 *  - Fit: an oversized top needs a slim or regular bottom.
 *  - Layering: nothing oversized goes underneath a tighter layer.
 *  - Colour: every pair of pieces must be compatible on the colour matrix.
 *  - Focal point: at most one graphic or patterned piece per outfit.
 */
import { CATEGORY_LABELS, type Category, type Color, type Item } from '../types'

export type StyleItem = Pick<Item, 'id' | 'category' | 'fit' | 'pattern' | 'color'> & {
  name?: string
}

const NEUTRALS: ReadonlySet<Color> = new Set(['black', 'white', 'gray', 'beige', 'brown', 'navy'])

/** Which non-neutral colours sit well next to each other. */
export const COLOR_MATRIX: Partial<Record<Color, readonly Color[]>> = {
  red: ['pink', 'green', 'blue'],
  orange: ['blue', 'yellow', 'green'],
  yellow: ['purple', 'blue', 'orange', 'green'],
  green: ['red', 'orange', 'yellow', 'blue', 'pink'],
  blue: ['orange', 'red', 'yellow', 'green', 'purple', 'pink'],
  purple: ['yellow', 'blue', 'pink'],
  pink: ['red', 'green', 'blue', 'purple'],
}

export const isNeutral = (color: Color) => NEUTRALS.has(color)

export function colorsWork(a: Color, b: Color): boolean {
  if (a === b || isNeutral(a) || isNeutral(b)) return true
  return COLOR_MATRIX[a]?.includes(b) ?? false
}

export function fitWorks(top: StyleItem, bottom: StyleItem): boolean {
  return !(top.fit === 'oversized' && bottom.fit === 'oversized')
}

/** Pieces worn on the upper body, from the innermost layer outwards. */
const STACK: readonly Category[] = ['top', 'dress', 'layer', 'outerwear']

export function layerStack<T extends StyleItem>(items: readonly T[]): T[] {
  return items
    .filter((item) => STACK.includes(item.category))
    .sort((a, b) => STACK.indexOf(a.category) - STACK.indexOf(b.category))
}

export function layeringWorks(items: readonly StyleItem[]): boolean {
  const stack = layerStack(items)
  return stack.every((outer, i) => {
    const inner = stack[i - 1]
    return !inner || inner.fit !== 'oversized' || outer.fit === 'oversized'
  })
}

const isStatement = (item: StyleItem) => item.pattern !== 'solid'

/** Can `candidate` join the pieces already chosen without breaking a rule? */
export function canAdd(chosen: readonly StyleItem[], candidate: StyleItem): boolean {
  if (isStatement(candidate) && chosen.some(isStatement)) return false
  if (!chosen.every((item) => colorsWork(item.color, candidate.color))) return false
  const top = candidate.category === 'top' ? candidate : chosen.find((i) => i.category === 'top')
  const bottom =
    candidate.category === 'bottom' ? candidate : chosen.find((i) => i.category === 'bottom')
  if (top && bottom && !fitWorks(top, bottom)) return false
  return layeringWorks([...chosen, candidate])
}

export function isValidOutfit(items: readonly StyleItem[]): boolean {
  return items.every((item, index) => canAdd(items.slice(0, index), item))
}

export const outfitKey = (items: readonly StyleItem[]) =>
  items
    .map((i) => i.id)
    .sort((a, b) => a - b)
    .join('-')

export type GenerateResult<T extends StyleItem> =
  | { ok: true; items: T[] }
  | { ok: false; message: string }

export interface GenerateOptions {
  /** Keys (see `outfitKey`) of outfits to avoid repeating when possible. */
  seen?: ReadonlySet<string>
  random?: () => number
}

const ATTEMPTS = 40
const MAX_ACCESSORIES = 2
const LAYER_CHANCE = 0.6
const OUTERWEAR_CHANCE = 0.5

function shuffled<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function generateOutfit<T extends StyleItem>(
  wardrobe: readonly T[],
  { seen = new Set(), random = Math.random }: GenerateOptions = {},
): GenerateResult<T> {
  const of = (category: Category) => wardrobe.filter((item) => item.category === category)
  const tops = of('top')
  const bottoms = of('bottom')
  const dresses = of('dress')

  if (dresses.length === 0 && (tops.length === 0 || bottoms.length === 0)) {
    const missing = [tops.length === 0 && 'a top', bottoms.length === 0 && 'a bottom']
      .filter(Boolean)
      .join(' and ')
    return { ok: false, message: `Add ${missing} (or a dress) to build an outfit.` }
  }

  const bases: T[][] = dresses.map((dress) => [dress])
  for (const top of tops) {
    for (const bottom of bottoms) {
      if (canAdd([top], bottom)) bases.push([top, bottom])
    }
  }
  if (bases.length === 0) {
    return {
      ok: false,
      message:
        'None of your tops and bottoms pass the style rules together. Try adding a neutral piece, like black or white.',
    }
  }

  const build = (): T[] => {
    const outfit = [...bases[Math.floor(random() * bases.length)]]
    const addFrom = (category: Category, limit: number) => {
      let added = 0
      for (const candidate of shuffled(of(category), random)) {
        if (added === limit) break
        if (canAdd(outfit, candidate)) {
          outfit.push(candidate)
          added++
        }
      }
    }
    addFrom('shoes', 1)
    if (random() < LAYER_CHANCE) addFrom('layer', 1)
    if (random() < OUTERWEAR_CHANCE) addFrom('outerwear', 1)
    addFrom('accessory', Math.floor(random() * (MAX_ACCESSORIES + 1)))
    return outfit
  }

  let outfit = build()
  for (let i = 1; i < ATTEMPTS && seen.has(outfitKey(outfit)); i++) outfit = build()
  return { ok: true, items: outfit }
}

/** Plain-language reasons an outfit works, one per rule. */
export function explainOutfit(items: readonly StyleItem[]): string[] {
  const reasons: string[] = []

  const colors = [...new Set(items.map((i) => i.color))]
  const accents = colors.filter((c) => !isNeutral(c))
  if (colors.length === 1) reasons.push(`Colour: all ${colors[0]}, a tonal look.`)
  else if (accents.length === 0) reasons.push(`Colour: ${colors.join(', ')} are all neutrals.`)
  else if (accents.length === 1)
    reasons.push(`Colour: ${accents[0]} stands out against neutral pieces.`)
  else reasons.push(`Colour: ${accents.join(' and ')} pair well on the colour wheel.`)

  const top = items.find((i) => i.category === 'top')
  const bottom = items.find((i) => i.category === 'bottom')
  if (top && bottom) {
    if (top.fit === 'oversized')
      reasons.push(`Fit: the oversized top is balanced by a ${bottom.fit} bottom.`)
    else if (bottom.fit === 'oversized')
      reasons.push(`Fit: the ${top.fit} top balances the oversized bottom.`)
    else reasons.push(`Fit: ${top.fit} on top, ${bottom.fit} below.`)
  }

  const stack = layerStack(items)
  if (stack.length > 1) {
    const names = stack.map((i) => i.name || CATEGORY_LABELS[i.category].toLowerCase())
    reasons.push(`Layering: ${names.join(', under ')}.`)
  }

  const statement = items.find(isStatement)
  reasons.push(
    statement
      ? `Focal point: the ${statement.pattern} ${statement.category} is the only statement piece.`
      : 'Focal point: all solids, so nothing competes.',
  )
  return reasons
}
