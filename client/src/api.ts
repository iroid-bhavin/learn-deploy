const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: number // 0 = user, 1 = admin
}

export interface Resource {
  id: number
  name: string
  timezone: string
}

export interface Slot {
  startTime: string
  endTime: string
  status: 'available' | 'booked' | 'past'
  resourceLocal: { start: string; end: string; utcOffset: string }
}

export interface AvailabilityResponse {
  resource: Resource
  date: string
  slotMinutes: number
  slots: Slot[]
}

export interface Booking {
  id: number
  resourceId: number
  startTime: string
  endTime: string
  resource?: Resource
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let token: string | null = localStorage.getItem('token')

export const setToken = (value: string | null) => {
  token = value
  if (value) localStorage.setItem('token', value)
  else localStorage.removeItem('token')
}

export const hasToken = () => token !== null

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const json = await response.json().catch(() => ({}))

  if (!response.ok) {
    const details = Array.isArray(json.data) && json.data.length ? `: ${json.data.join(', ')}` : ''
    throw new ApiError(response.status, (json.message ?? 'Request failed') + details)
  }

  return json.data as T
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('POST', '/auth/login', { email, password }),

  signup: (data: { firstName: string; lastName: string; email: string; password: string }) =>
    request<{ user: User; token: string }>('POST', '/auth/signup', data),

  me: () => request<User>('GET', '/auth/me'),

  resources: () => request<Resource[]>('GET', '/resources'),

  availability: (resourceId: number, date: string) =>
    request<AvailabilityResponse>('GET', `/resources/${resourceId}/availability?date=${date}`),

  myBookings: () => request<Booking[]>('GET', '/bookings'),

  book: (resourceId: number, startTime: string, endTime: string) =>
    request<Booking>('POST', '/bookings', { resourceId, startTime, endTime }),

  cancel: (id: number) => request<unknown>('DELETE', `/bookings/${id}`),
}
