import crypto from 'crypto'
import { isBucketConfigured, uploadObject } from './videoStorage.js'

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Saves an uploaded image (listing photo, avatar, ID or application document) and
// returns its listing_images row id. Uses the private bucket when configured;
// falls back to base64 in PostgreSQL only when no bucket is set (e.g. local dev).
export async function saveImage(db, { listingId = null, buffer, mimetype, order = 0 }) {
  if (isBucketConfigured()) {
    const ext = EXTENSIONS[mimetype] || 'bin'
    const key = `images/${crypto.randomUUID()}.${ext}`
    await uploadObject(key, buffer, mimetype)
    const result = await db.query(
      'INSERT INTO listing_images (listing_id, storage_key, mimetype, display_order) VALUES ($1, $2, $3, $4) RETURNING id',
      [listingId, key, mimetype, order],
    )
    return result.rows[0].id
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn('Bucket not configured: storing image in PostgreSQL. Configure BUCKET_* variables.')
  }
  const result = await db.query(
    'INSERT INTO listing_images (listing_id, data, mimetype, display_order) VALUES ($1, $2, $3, $4) RETURNING id',
    [listingId, buffer.toString('base64'), mimetype, order],
  )
  return result.rows[0].id
}

export function imageUrl(req, imageId) {
  return `${req.protocol}://${req.get('host')}/api/images/${imageId}`
}
