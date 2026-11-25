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

function uploadDirectToStorage(uploadUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Storage upload failed (${xhr.status}). Please retry.`))
      }
    })
    xhr.addEventListener('error', () => {
      reject(new Error('Could not reach video storage. Check bucket CORS allows this site and PUT uploads.'))
    })
    xhr.addEventListener('abort', () => reject(new Error('Video upload was cancelled.')))
    xhr.send(file)
  })
}

export const api = {
  // Auth
  auth: {
    register: (data) => post('/api/auth/register', data),
    login: (data) => post('/api/auth/login', data),
    me: () => get('/api/auth/me'),
    updateProfile: (data) => put('/api/auth/me', data),
    changePassword: (data) => post('/api/auth/change-password', data),
    forgotPassword: (email) => post('/api/auth/forgot-password', { email }),
    resetPassword: (token, password) => post('/api/auth/reset-password', { token, password }),
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
    resendSolicitorReview: (id) => post(`/api/listings/${id}/solicitor-review/resend`, {}),
    delete: (id) => del(`/api/listings/${id}`),
  },

  videos: {
    feed: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()
      return get(`/api/videos/feed${qs ? `?${qs}` : ''}`)
    },
    mine: () => get('/api/videos/mine'),
    status: (videoId) => get(`/api/videos/${videoId}/status`),
    playback: (videoId) => get(`/api/videos/${videoId}/playback`),
    createUploadUrl: (listingId, data) => post(`/api/videos/listings/${listingId}/upload-url`, data),
    completeUpload: (videoId) => post(`/api/videos/${videoId}/complete`, {}),
    uploadDirect: uploadDirectToStorage,
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
    get: (userId) => userId
      ? get(`/api/reviews/${userId}`).then(d => ({ ...d, count: d.count ?? d.total ?? 0 }))
      : Promise.resolve({ reviews: [], avg_rating: 0, count: 0 }),
    submit: (data) => post('/api/reviews', data),
  },

  // Identity verification
  identity: {
    me: () => get('/api/identity/me'),
    submit: (formData) => post('/api/identity', formData),
  },

  solicitorReviews: {
    get: (token) => get(`/api/solicitor-reviews/${encodeURIComponent(token)}`),
    submit: (token, data) => post(`/api/solicitor-reviews/${encodeURIComponent(token)}`, data),
  },

  // Inspections
  inspections: {
    slots: (listingId) => get(`/api/inspections/listing/${listingId}/slots`),
    forListing: (listingId) => get(`/api/inspections/listing/${listingId}`),
    mine: () => get('/api/inspections/mine'),
    received: () => get('/api/inspections/received'),
    addSlots: (listingId, slots) => post(`/api/inspections/listing/${listingId}/slots`, { slots }),
    book: (slotId, notes) => post(`/api/inspections/book/${slotId}`, { notes }),
    cancel: (id) => del(`/api/inspections/${id}`),
  },

  // Offers
  offers: {
    forListing: (listingId) => get(`/api/offers/listing/${listingId}`),
    mine: () => get('/api/offers/mine'),
    received: () => get('/api/offers/received'),
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
    received: () => get('/api/applications/received'),
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

  // Notifications
  notifications: {
    list: () => get('/api/notifications'),
    markRead: (id) => put(`/api/notifications/${id}/read`, {}),
    markAllRead: () => put('/api/notifications/read-all', {}),
  },

  // Support
  support: {
    mine: () => get('/api/support'),
    create: (data) => post('/api/support', data),
    adminAll: (status) => get(`/api/support/admin${status ? `?status=${status}` : ''}`),
    update: (id, data) => put(`/api/support/${id}`, data),
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
