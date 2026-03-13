const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken() {
  return localStorage.getItem('houzeey_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const get = (path) => request(path)
const post = (path, body) =>
  request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) })
const put = (path, body) =>
  request(path, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) })
const del = (path) => request(path, { method: 'DELETE' })

export const api = {
  // Auth
  auth: {
    register: (data) => post('/api/auth/register', data),
    login: (data) => post('/api/auth/login', data),
    me: () => get('/api/auth/me'),
  },

  // Listings
  listings: {
    list: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
      return get(`/api/listings${qs ? `?${qs}` : ''}`)
    },
    get: (id) => get(`/api/listings/${id}`),
    mine: () => get('/api/listings/my'),
    create: (formData) => post('/api/listings', formData),
    update: (id, data) => put(`/api/listings/${id}`, data),
    delete: (id) => del(`/api/listings/${id}`),
  },

  // Conversations + Messages
  conversations: {
    list: () => get('/api/conversations'),
    start: (data) => post('/api/conversations', data),
    messages: (id) => get(`/api/conversations/${id}/messages`),
    send: (id, content) => post(`/api/conversations/${id}/messages`, { content }),
  },

  // Payments
  payments: {
    history: () => get('/api/payments'),
    leases: () => get('/api/payments/leases'),
    pay: (data) => post('/api/payments', data),
    createLease: (data) => post('/api/payments/leases', data),
  },

  // Users
  users: {
    get: (id) => get(`/api/users/${id}`),
    stats: () => get('/api/users/me/stats'),
    update: (formData) => put('/api/users/me', formData),
  },

  // Saved listings
  saved: {
    list: () => get('/api/saved'),
    save: (listingId) => post(`/api/saved/${listingId}`),
    unsave: (listingId) => del(`/api/saved/${listingId}`),
  },
}
