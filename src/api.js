const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getToken() {
  return localStorage.getItem('houzeey_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { ...options.headers }

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

  // Reviews
  reviews: {
    get: (userId) => get(`/api/reviews/${userId}`),
    submit: (data) => post('/api/reviews', data),
  },

  // Identity verification
  identity: {
    me: () => get('/api/identity/me'),
    submit: (formData) => post('/api/identity', formData),
  },

  // Inspections
  inspections: {
    slots: (listingId) => get(`/api/inspections/listing/${listingId}/slots`),
    forListing: (listingId) => get(`/api/inspections/listing/${listingId}`),
    mine: () => get('/api/inspections/mine'),
    addSlots: (listingId, slots) => post(`/api/inspections/listing/${listingId}/slots`, { slots }),
    book: (slotId, notes) => post(`/api/inspections/book/${slotId}`, { notes }),
    cancel: (id) => del(`/api/inspections/${id}`),
  },

  // Offers
  offers: {
    forListing: (listingId) => get(`/api/offers/listing/${listingId}`),
    mine: () => get('/api/offers/mine'),
    get: (id) => get(`/api/offers/${id}`),
    submit: (data) => post('/api/offers', data),
    counter: (id, data) => post(`/api/offers/${id}/counter`, data),
    accept: (id) => post(`/api/offers/${id}/accept`, {}),
    reject: (id) => post(`/api/offers/${id}/reject`, {}),
    withdraw: (id) => post(`/api/offers/${id}/withdraw`, {}),
    pdf: (id) => `${BASE}/api/offers/${id}/pdf`,
  },

  // Settlement
  settlement: {
    get: (offerId) => get(`/api/settlement/${offerId}`),
    updateMilestone: (offerId, milestoneId, completed) =>
      put(`/api/settlement/${offerId}/milestone/${milestoneId}`, { completed }),
  },

  // Rental applications
  applications: {
    forListing: (listingId) => get(`/api/applications/listing/${listingId}`),
    mine: () => get('/api/applications/mine'),
    get: (id) => get(`/api/applications/${id}`),
    submit: (formData) => post('/api/applications', formData),
    updateStatus: (id, status, notes) => put(`/api/applications/${id}/status`, { status, landlord_notes: notes }),
  },

  // Admin
  admin: {
    stats: () => get('/api/admin/stats'),
    users: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
      return get(`/api/admin/users${qs ? `?${qs}` : ''}`)
    },
    updateUser: (id, data) => put(`/api/admin/users/${id}`, data),
    deleteUser: (id) => del(`/api/admin/users/${id}`),
    listings: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
      return get(`/api/admin/listings${qs ? `?${qs}` : ''}`)
    },
    updateListing: (id, data) => put(`/api/admin/listings/${id}`, data),
    deleteListing: (id) => del(`/api/admin/listings/${id}`),
    verifications: () => get('/api/admin/verifications'),
    reviewVerification: (id, status, notes) => put(`/api/admin/verifications/${id}`, { status, notes }),
  },

  // Marketing
  marketing: {
    contacts: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
      return get(`/api/marketing/contacts${qs ? `?${qs}` : ''}`)
    },
    addContact: (data) => post('/api/marketing/contacts', data),
    importContacts: (contacts) => post('/api/marketing/contacts/import', { contacts }),
    deleteContact: (id) => del(`/api/marketing/contacts/${id}`),
    campaigns: () => get('/api/marketing/campaigns'),
    createCampaign: (data) => post('/api/marketing/campaigns', data),
    sendCampaign: (id) => post(`/api/marketing/campaigns/${id}/send`, {}),
  },
}
