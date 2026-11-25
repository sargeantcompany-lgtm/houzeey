import { Router } from 'express'
import pool from '../db.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { createPlaybackUrls, isBucketConfigured } from '../services/videoStorage.js'

// Social layer for the Craft-style feed: posts, likes and comments.
const router = Router()

// Same visibility rule as public search: active sale listings from verified
// private sellers whose solicitor review is approved (under offer still shows).
const PUBLIC_LISTING = `
  l.status IN ('active', 'under_offer') AND l.type = 'sale'
  AND u.role IN ('buyer', 'seller') AND u.verified = TRUE AND sr.status = 'approved'`

const REVIEW_JOIN = `
  LEFT JOIN LATERAL (
    SELECT status FROM solicitor_reviews
    WHERE listing_id = l.id ORDER BY created_at DESC LIMIT 1
  ) sr ON TRUE`

function intParam(value, fallback, max) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback
}

// GET /api/social/feed?filter=all|video&q=&limit=&offset=
router.get('/feed', optionalAuth, async (req, res) => {
  const filter = req.query.filter === 'video' ? 'video' : 'all'
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
  const limit = intParam(req.query.limit, 12, 30) || 12
  const offset = intParam(req.query.offset, 0, 100000)
  const params = [req.user?.id || null]
  const conditions = [PUBLIC_LISTING]
  if (q) {
    params.push(`%${q}%`)
    conditions.push(`(l.suburb ILIKE $${params.length} OR l.postcode ILIKE $${params.length} OR l.state ILIKE $${params.length})`)
  }
  if (filter === 'video') conditions.push('v.mp4_key IS NOT NULL')
  params.push(limit, offset)

  try {
    const result = await pool.query(`
      SELECT l.id, l.user_id, l.title, l.description, l.address, l.suburb, l.state, l.postcode,
        l.property_type, l.price, l.price_max, l.price_display, l.beds, l.baths, l.cars,
        l.land_size, l.status, l.features, l.created_at,
        u.name AS seller_name,
        v.mp4_key, v.thumb_key,
        COALESCE((SELECT array_agg(url ORDER BY display_order) FROM listing_images WHERE listing_id = l.id AND NOT is_private), '{}') AS images,
        (SELECT COUNT(*)::int FROM listing_likes WHERE listing_id = l.id) AS like_count,
        EXISTS (SELECT 1 FROM listing_likes WHERE listing_id = l.id AND user_id = $1) AS liked,
        EXISTS (SELECT 1 FROM saved_listings WHERE listing_id = l.id AND user_id = $1) AS saved,
        (SELECT COUNT(*)::int FROM listing_comments WHERE listing_id = l.id) AS comment_count,
        COALESCE((
          SELECT json_agg(c ORDER BY c.created_at) FROM (
            SELECT lc.id, lc.body, lc.created_at, cu.name
            FROM listing_comments lc JOIN users cu ON cu.id = lc.user_id
            WHERE lc.listing_id = l.id ORDER BY lc.created_at DESC LIMIT 2
          ) c
        ), '[]') AS recent_comments
      FROM listings l
      JOIN users u ON u.id = l.user_id
      ${REVIEW_JOIN}
      LEFT JOIN LATERAL (
        SELECT mp4_key, thumb_key FROM videos
        WHERE listing_id = l.id AND status = 'ready' ORDER BY created_at DESC LIMIT 1
      ) v ON TRUE
      WHERE ${conditions.join(' AND ')}
      ORDER BY (v.mp4_key IS NOT NULL) DESC, l.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params)

    const canSign = isBucketConfigured()
    const posts = await Promise.all(result.rows.map(async row => {
      let video = null
      if (row.mp4_key && canSign) {
        try {
          const urls = await createPlaybackUrls(row.mp4_key, row.thumb_key)
          video = { url: urls.videoUrl, thumbnailUrl: urls.thumbnailUrl }
        } catch (error) {
          console.error('Could not sign feed video:', error.message)
        }
      }
      const { mp4_key: _m, thumb_key: _t, ...listing } = row
      return { ...listing, video }
    }))
    res.json({ posts, hasMore: posts.length === limit })
  } catch (error) {
    console.error('Feed failed:', error)
    res.status(500).json({ error: 'Could not load the feed.' })
  }
})

// GET /api/social/states — listing counts per state for "Explore by state"
router.get('/states', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.state, COUNT(*)::int AS count
      FROM listings l JOIN users u ON u.id = l.user_id ${REVIEW_JOIN}
      WHERE ${PUBLIC_LISTING}
      GROUP BY l.state
    `)
    res.json(Object.fromEntries(result.rows.map(r => [r.state, r.count])))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not load state counts.' })
  }
})

async function assertVisible(listingId, userId) {
  const result = await pool.query(`
    SELECT l.id FROM listings l JOIN users u ON u.id = l.user_id ${REVIEW_JOIN}
    WHERE l.id = $1 AND ((${PUBLIC_LISTING}) OR l.user_id = $2)
  `, [listingId, userId || null])
  return result.rowCount > 0
}

async function likeSummary(listingId, userId) {
  const result = await pool.query(`
    SELECT (SELECT COUNT(*)::int FROM listing_likes WHERE listing_id = $1) AS like_count,
      EXISTS (SELECT 1 FROM listing_likes WHERE listing_id = $1 AND user_id = $2) AS liked
  `, [listingId, userId])
  return result.rows[0]
}

// POST /api/social/listings/:id/like
router.post('/listings/:id/like', requireAuth, async (req, res) => {
  try {
    if (!(await assertVisible(req.params.id, req.user.id))) return res.status(404).json({ error: 'Listing not found' })
    await pool.query('INSERT INTO listing_likes (listing_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, req.user.id])
    res.json(await likeSummary(req.params.id, req.user.id))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not like this home.' })
  }
})

// DELETE /api/social/listings/:id/like
router.delete('/listings/:id/like', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM listing_likes WHERE listing_id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json(await likeSummary(req.params.id, req.user.id))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not update your like.' })
  }
})

// GET /api/social/listings/:id/comments
router.get('/listings/:id/comments', optionalAuth, async (req, res) => {
  try {
    if (!(await assertVisible(req.params.id, req.user?.id))) return res.status(404).json({ error: 'Listing not found' })
    const result = await pool.query(`
      SELECT lc.id, lc.body, lc.created_at, u.name
      FROM listing_comments lc JOIN users u ON u.id = lc.user_id
      WHERE lc.listing_id = $1 ORDER BY lc.created_at ASC LIMIT 200
    `, [req.params.id])
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not load comments.' })
  }
})

// POST /api/social/listings/:id/comments { body }
router.post('/listings/:id/comments', requireAuth, async (req, res) => {
  const body = String(req.body?.body || '').trim()
  if (!body || body.length > 300) return res.status(400).json({ error: 'Comments must be 1 to 300 characters.' })
  try {
    if (!(await assertVisible(req.params.id, req.user.id))) return res.status(404).json({ error: 'Listing not found' })
    const result = await pool.query(`
      INSERT INTO listing_comments (listing_id, user_id, body) VALUES ($1, $2, $3)
      RETURNING id, body, created_at
    `, [req.params.id, req.user.id, body])
    const user = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id])
    res.status(201).json({ ...result.rows[0], name: user.rows[0]?.name })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not post your comment.' })
  }
})

export default router
