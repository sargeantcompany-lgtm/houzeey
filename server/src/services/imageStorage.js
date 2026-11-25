import crypto from 'crypto'
import { isBucketConfigured, uploadObject } from './videoStorage.js'

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Saves an uploaded image (listing photo, avatar, ID or application document) and
// returns its listing_images row id. Uses the private bucket when configured;
// falls back to base64 in PostgreSQL only when no bucket is set (e.g. local dev).
export async function saveImage(db, { listingId = null, buffer, mimetype, order = 0, isPrivate = false }) {
  if (isBucketConfigured()) {
    const ext = EXTENSIONS[mimetype] || 'bin'
    const key = `images/${crypto.randomUUID()}.${ext}`
    await uploadObject(key, buffer, mimetype)
    const result = await db.query(
      'INSERT INTO listing_images (listing_id, storage_key, mimetype, display_order, is_private) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [listingId, key, mimetype, order, isPrivate],
    )
    return result.rows[0].id
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('Bucket not configured: storing image in PostgreSQL. Configure BUCKET_* variables.')
  }
  const result = await db.query(
    'INSERT INTO listing_images (listing_id, data, mimetype, display_order, is_private) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [listingId, buffer.toString('base64'), mimetype, order, isPrivate],
  )
  return result.rows[0].id
}

export function imageUrl(req, imageId) {
  return `${req.protocol}://${req.get('host')}/api/images/${imageId}`
}

// --- Private documents (ID, selfies, rental application files) ---
// Stored URLs stay plain (/api/images/:id). When an authorised user (owner, admin,
// landlord) fetches a record, the API signs the URL so it works for one hour.
const SIGNED_URL_TTL_SECONDS = 60 * 60

function signatureFor(id, expires) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
    .update(`image:${id}:${expires}`).digest('hex')
}

export function signImageUrl(url) {
  if (!url) return url
  const match = String(url).match(/\/api\/images\/([0-9a-f-]{36})/i)
  if (!match) return url
  const expires = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS
  const base = String(url).split('?')[0]
  return `${base}?expires=${expires}&sig=${signatureFor(match[1], expires)}`
}

export function signDocumentFields(row, fields) {
  if (!row) return row
  const copy = { ...row }
  for (const field of fields) copy[field] = signImageUrl(copy[field])
  return copy
}

export function isValidImageSignature(id, expires, sig) {
  const exp = Number(expires)
  if (!sig || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  const expected = Buffer.from(signatureFor(id, exp))
  const given = Buffer.from(String(sig))
  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}
