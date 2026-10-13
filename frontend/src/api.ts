import type { Category, Fit, Gender, Item, Outfit, Pattern, User } from './types'

const TOKEN_KEY = 'wardrobe.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string | null) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function errorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { loc?: unknown[]; msg?: string }
    const field = first.loc?.at(-1)
    return field ? `${field}: ${first.msg}` : (first.msg ?? fallback)
  }
  return fallback
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?')
  }
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, `Request failed (${res.status})`))
  return body as T
}

interface TokenResponse {
  access_token: string
  user: User
}

export interface NewItem {
  photo: Blob
  category: Category
  fit: Fit
  pattern: Pattern
  name: string
}

export type ItemPatch = Partial<Pick<Item, 'name' | 'category' | 'fit' | 'pattern' | 'color'>>

export const api = {
  register: (email: string, password: string, gender: Gender) =>
    request<TokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, gender }),
    }),
  login: (email: string, password: string) =>
    request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/auth/me'),
  setGender: (gender: Gender) =>
    request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify({ gender }) }),

  listItems: () => request<Item[]>('/items'),
  createItem: ({ photo, ...fields }: NewItem) => {
    const form = new FormData()
    form.append('photo', photo, 'photo.jpg')
    for (const [key, value] of Object.entries(fields)) form.append(key, value)
    return request<Item>('/items', { method: 'POST', body: form })
  },
  updateItem: (id: number, patch: ItemPatch) =>
    request<Item>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteItem: (id: number) => request<void>(`/items/${id}`, { method: 'DELETE' }),

  listOutfits: () => request<Outfit[]>('/outfits'),
  saveOutfit: (itemIds: number[]) =>
    request<Outfit>('/outfits', { method: 'POST', body: JSON.stringify({ item_ids: itemIds }) }),
  deleteOutfit: (id: number) => request<void>(`/outfits/${id}`, { method: 'DELETE' }),
}
