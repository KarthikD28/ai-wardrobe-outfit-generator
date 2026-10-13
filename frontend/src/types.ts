export const GENDERS = ['male', 'female'] as const
export const CATEGORIES = [
  'top', 'dress', 'layer', 'outerwear', 'bottom', 'shoes', 'accessory',
] as const // prettier-ignore
export const FITS = ['slim', 'regular', 'oversized'] as const
export const PATTERNS = ['solid', 'patterned', 'graphic'] as const
export const COLORS = [
  'black', 'white', 'gray', 'beige', 'brown', 'navy',
  'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink',
] as const // prettier-ignore

export type Gender = (typeof GENDERS)[number]
export type Category = (typeof CATEGORIES)[number]
export type Fit = (typeof FITS)[number]
export type Pattern = (typeof PATTERNS)[number]
export type Color = (typeof COLORS)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Top',
  dress: 'Dress',
  layer: 'Mid layer',
  outerwear: 'Outerwear',
  bottom: 'Bottom',
  shoes: 'Shoes',
  accessory: 'Accessory',
}

/** Examples shown when choosing a type, so pieces land on the right layer. */
export const CATEGORY_EXAMPLES: Record<Category, string> = {
  top: 't-shirt, shirt, polo',
  dress: 'dress, jumpsuit',
  layer: 'sweater, hoodie, quarter-zip, cardigan',
  outerwear: 'jacket, coat, blazer',
  bottom: 'trousers, jeans, shorts, skirt',
  shoes: 'sneakers, boots',
  accessory: 'hat, necklace, bracelet, bag',
}

/** Fit only means something for pieces that drape on the body. */
export const hasFit = (category: Category) => category !== 'shoes' && category !== 'accessory'

export interface User {
  id: number
  email: string
  gender: Gender
}

export interface Item {
  id: number
  name: string
  image_url: string
  category: Category
  fit: Fit
  pattern: Pattern
  color: Color
  color_hex: string
  background_removed: boolean
  created_at: string
}

export interface Outfit {
  id: number
  note: string
  created_at: string
  items: Item[]
}
