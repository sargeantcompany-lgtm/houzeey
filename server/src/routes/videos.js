import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { createPlaybackUrls, createUploadUrl, inspectBucketObject } from '../services/videoStorage.js'
import { getVideoQueue } from '../services/videoQueue.js'

const router = Router()
const MAX_UPLOAD_BYTES = Number(process.env.MAX_VIDEO_UPLOAD_BYTES || 536870912)
if (!Number.isSafeInteger(MAX_UPLOAD_BYTES) || MAX_UPLOAD_BYTES < 1) {
  throw new Error('MAX_VIDEO_UPLOAD_BYTES must be a positive whole number')
}
const UPLOAD_TYPES = new Map([
  ['video/mp4', 'mp4'],
  ['video/quicktime', 'mov'],
  ['video/webm', 'webm'],
  ['video/x-m4v', 'm4v'],
])

function isValidUploadSize(size) {
  return Number.isSafeInteger(size) && size > 0 && size <= MAX_UPLOAD_BYTES
}

function parsePriceQuery(value) {
  if (value === undefined || value === '') return { value: null, valid: true }
  if (typeof value !== 'string' || !/^\d+(\.\d{1,2})?$/.test(value)) {
    return { value: null, valid: false }
  }
  const parsed = Number(value)
  return { value: parsed, valid: Number.isFinite(parsed) && parsed <= 999999999999 }
}

function parseFeedCursor(value) {
  if (value === undefined || value === '') return { value: null, valid: true }
  if (typeof value !== 'string' || value.length > 256) return { value: null, valid: false }

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    const createdAt = new Date(parsed.createdAt)
    if (
      !Number.isFinite(createdAt.getTime()) ||
      typeof parsed.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.id)
    ) {
      return { value: null, valid: false }
    }
    return { value: { createdAt, id: parsed.id }, valid: true }
  } catch {
    return { value: null, valid: false }
  }
}

router.get('/feed', async (req, res) => {
  const suburb = req.query.suburb === undefined ? '' : req.query.suburb
  const minPrice = parsePriceQuery(req.query.min_price)
  const maxPrice = parsePriceQuery(req.query.max_price)
  const cursor = parseFeedCursor(req.query.cursor)

  if (
    typeof suburb !== 'string' ||
    suburb.length > 100 ||
    !minPrice.valid ||
    !maxPrice.valid ||
    !cursor.valid
  ) {
    return res.status(400).json({ error: 'Feed filters or cursor are invalid.' })
  }
  if (minPrice.value != null && maxPrice.value != null && minPrice.value > maxPrice.value) {
    return res.status(400).json({ error: 'Minimum price cannot exceed maximum price.' })
  }

  const conditions = [
    "v.status = 'ready'",
    "l.status = 'active'",
    "l.type = 'sale'",
    "u.role IN ('buyer', 'seller')",
    'u.verified = TRUE',
    "sr.status = 'approved'",
  ]
  const params = []
  let parameter = 1

  if (suburb.trim()) {
    conditions.push(`(l.suburb ILIKE $${parameter} OR l.postcode ILIKE $${parameter})`)
    params.push(`%${suburb.trim()}%`)
    parameter++
  }
  if (minPrice.value != null) {
    conditions.push(`l.price_display <> 'contact' AND COALESCE(l.price_max, l.price) >= $${parameter}`)
    params.push(minPrice.value)
    parameter++
  }
  if (maxPrice.value != null) {
    conditions.push(`l.price_display <> 'contact' AND l.price <= $${parameter}`)
    params.push(maxPrice.value)
    parameter++
  }
  if (cursor.value) {
    conditions.push(`(v.created_at, v.id) < ($${parameter}::timestamptz, $${parameter + 1}::uuid)`)
    params.push(cursor.value.createdAt, cursor.value.id)
    parameter += 2
  }

  const pageSize = 8
  params.push(pageSize + 1)

  try {
    const result = await pool.query(`
      SELECT v.id AS video_id, v.mp4_key, v.thumb_key, v.duration_seconds, v.created_at AS video_created_at,
        l.id AS listing_id, l.title, l.suburb, l.state, l.postcode, l.property_type,
        l.price, l.price_max, l.price_display, l.beds, l.baths, l.cars, l.land_size
      FROM videos v
      JOIN listings l ON l.id = v.listing_id
      JOIN users u ON u.id = l.user_id
      LEFT JOIN LATERAL (
        SELECT status FROM solicitor_reviews
        WHERE listing_id = l.id ORDER BY created_at DESC LIMIT 1
      ) sr ON TRUE
      WHERE ${conditions.join(' AND ')}
      ORDER BY v.created_at DESC, v.id DESC
      LIMIT $${parameter}
    `, params)

    const hasMore = result.rows.length > pageSize
    const pageRows = result.rows.slice(0, pageSize)
    const items = await Promise.all(pageRows.map(async row => {
      const playback = await createPlaybackUrls(row.mp4_key, row.thumb_key)
      return {
        id: row.video_id,
        videoUrl: playback.videoUrl,
        thumbnailUrl: playback.thumbnailUrl,
        expiresIn: playback.expiresIn,
        durationSeconds: row.duration_seconds,
        createdAt: row.video_created_at,
        listing: {
          id: row.listing_id,
          title: row.title,
          suburb: row.suburb,
          state: row.state,
          postcode: row.postcode,
          propertyType: row.property_type,
          price: row.price,
          priceMax: row.price_max,
          priceDisplay: row.price_display,
          beds: row.beds,
          baths: row.baths,
          cars: row.cars,
          landSize: row.land_size,
        },
      }
    }))
    const lastRow = pageRows[pageRows.length - 1]
    const nextCursor = hasMore && lastRow
      ? Buffer.from(JSON.stringify({
        createdAt: lastRow.video_created_at.toISOString(),
        id: lastRow.video_id,
      })).toString('base64url')
      : null

    res.json({ items, nextCursor, hasMore })
  } catch (error) {
    console.error('Could not load property video feed:', error)
    res.status(503).json({ error: 'Property videos are temporarily unavailable.' })
  }
})

router.post('/listings/:listingId/upload-url', requireAuth, async (req, res) => {
  const { contentType, fileSize } = req.body || {}
  const extension = UPLOAD_TYPES.get(contentType)
  const size = Number(fileSize)

  if (!extension) {
    return res.status(400).json({ error: 'Choose an MP4, MOV, M4V, or WebM video.' })
  }
  if (!isValidUploadSize(size)) {
    return res.status(400).json({
      error: `Video must be between 1 byte and ${Math.floor(MAX_UPLOAD_BYTES / 1048576)} MB.`,
    })
  }

  let videoId
  let objectKey
  let client

  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const listing = await client.query(`
      SELECT l.id
      FROM listings l
      JOIN users u ON u.id = l.user_id
      WHERE l.id = $1 AND l.user_id = $2 AND l.type = 'sale'
        AND l.status NOT IN ('sold', 'withdrawn', 'archived')
        AND u.role IN ('buyer', 'seller') AND u.verified = TRUE
      FOR UPDATE OF l
    `, [req.params.listingId, req.user.id])

    if (!listing.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Listing not found or unavailable for upload.' })
    }

    const existing = await client.query(
      'SELECT id, original_key, status FROM videos WHERE listing_id = $1 FOR UPDATE',
      [req.params.listingId],
    )

    if (existing.rowCount && !['uploading', 'failed'].includes(existing.rows[0].status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'This listing already has a video that is processing or ready.' })
    }

    if (existing.rowCount) {
      videoId = existing.rows[0].id
      objectKey = existing.rows[0].status === 'uploading'
        ? existing.rows[0].original_key
        : `original/${req.params.listingId}/${videoId}/${randomUUID()}.${extension}`
      await client.query(`
        UPDATE videos
        SET original_key = $1, original_size_bytes = $2, original_content_type = $3,
          mp4_key = NULL, thumb_key = NULL, status = 'uploading', error = NULL,
          duration_seconds = NULL, updated_at = NOW()
        WHERE id = $4
      `, [objectKey, size, contentType, videoId])
    } else {
      videoId = randomUUID()
      objectKey = `original/${req.params.listingId}/${videoId}/${randomUUID()}.${extension}`
      await client.query(`
        INSERT INTO videos
          (id, listing_id, original_key, original_size_bytes, original_content_type, status)
        VALUES ($1, $2, $3, $4, $5, 'uploading')
      `, [videoId, req.params.listingId, objectKey, size, contentType])
    }

    await client.query('COMMIT')
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('Video upload transaction rollback failed:', rollbackError)
      }
    }
    console.error('Video upload URL preparation failed:', error)
    return res.status(500).json({ error: 'Could not prepare the video upload.' })
  } finally {
    client?.release()
  }

  try {
    const uploadUrl = await createUploadUrl(objectKey, contentType, size, 3600)
    res.json({
      videoId,
      uploadUrl,
      key: objectKey,
      headers: { 'Content-Type': contentType },
      expiresIn: 3600,
    })
  } catch (error) {
    console.error('Video upload URL signing failed:', error)
    res.status(503).json({ error: 'Video storage is not configured or is temporarily unavailable.' })
  }
})

router.post('/:videoId/complete', requireAuth, async (req, res) => {
  let video
  try {
    const result = await pool.query(`
      SELECT v.id, v.original_key, v.original_size_bytes, v.original_content_type, v.status
      FROM videos v
      JOIN listings l ON l.id = v.listing_id
      WHERE v.id = $1 AND l.user_id = $2
    `, [req.params.videoId, req.user.id])

    if (!result.rowCount) return res.status(404).json({ error: 'Video not found.' })
    video = result.rows[0]
    if (video.status !== 'uploading') {
      return res.status(409).json({ error: 'This video is not waiting for an upload.' })
    }

    const storedObject = await inspectBucketObject(video.original_key)
    if (
      Number(storedObject.ContentLength) !== Number(video.original_size_bytes) ||
      storedObject.ContentType !== video.original_content_type
    ) {
      return res.status(400).json({ error: 'The uploaded video metadata does not match the requested upload.' })
    }

    const claimed = await pool.query(
      "UPDATE videos SET status = 'processing', error = NULL, updated_at = NOW() WHERE id = $1 AND status = 'uploading' RETURNING id",
      [video.id],
    )
    if (!claimed.rowCount) return res.status(409).json({ error: 'This video is already being processed.' })

    await getVideoQueue().add(
      'process-video',
      { videoId: video.id },
      {
        jobId: `${video.id}-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    )

    res.status(202).json({ videoId: video.id, status: 'processing' })
  } catch (error) {
    console.error('Video completion failed:', error)
    if (video) {
      try {
        await pool.query(
          "UPDATE videos SET status = 'failed', error = $2, updated_at = NOW() WHERE id = $1",
          [video.id, 'Video processing could not be queued. Please retry the upload.'],
        )
      } catch (statusError) {
        console.error(`Could not record queue failure for video ${video.id}:`, statusError)
        return res.status(500).json({ error: 'Could not start video processing or record its failure.' })
      }
    }
    res.status(503).json({ error: 'Could not start video processing. Please retry the upload.' })
  }
})

router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.id, v.listing_id, l.title AS listing_title, v.status, v.error,
        v.duration_seconds, v.created_at, v.updated_at
      FROM videos v
      JOIN listings l ON l.id = v.listing_id
      WHERE l.user_id = $1
      ORDER BY v.created_at DESC
    `, [req.user.id])
    res.json(result.rows)
  } catch (error) {
    console.error('Could not fetch video statuses:', error)
    res.status(500).json({ error: 'Could not load video statuses.' })
  }
})

router.get('/:videoId/status', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.id, v.listing_id, v.status, v.error, v.duration_seconds, v.updated_at
      FROM videos v
      JOIN listings l ON l.id = v.listing_id
      WHERE v.id = $1 AND l.user_id = $2
    `, [req.params.videoId, req.user.id])

    if (!result.rowCount) return res.status(404).json({ error: 'Video not found.' })
    res.json(result.rows[0])
  } catch (error) {
    console.error('Could not fetch video status:', error)
    res.status(500).json({ error: 'Could not load video status.' })
  }
})

router.get('/:videoId/playback', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.mp4_key, v.thumb_key, v.duration_seconds, l.id AS listing_id
      FROM videos v
      JOIN listings l ON l.id = v.listing_id
      JOIN users u ON u.id = l.user_id
      LEFT JOIN LATERAL (
        SELECT status FROM solicitor_reviews
        WHERE listing_id = l.id ORDER BY created_at DESC LIMIT 1
      ) sr ON TRUE
      WHERE v.id = $1 AND v.status = 'ready' AND l.status = 'active'
        AND l.type = 'sale' AND u.verified = TRUE AND sr.status = 'approved'
    `, [req.params.videoId])

    if (!result.rowCount) return res.status(404).json({ error: 'Video not found or not available.' })
    const video = result.rows[0]
    const urls = await createPlaybackUrls(video.mp4_key, video.thumb_key)
    res.json({ listingId: video.listing_id, durationSeconds: video.duration_seconds, ...urls })
  } catch (error) {
    console.error('Could not create video playback URLs:', error)
    res.status(503).json({ error: 'Video playback is temporarily unavailable.' })
  }
})

export default router
