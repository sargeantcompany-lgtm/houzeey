import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/saved — list saved listings
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        l.*,
        (SELECT url FROM listing_images WHERE listing_id = l.id ORDER BY display_order LIMIT 1) AS primary_image,
        sl.created_at AS saved_at
      FROM saved_listings sl
      JOIN listings l ON sl.listing_id = l.id
      WHERE sl.user_id = $1
      ORDER BY sl.created_at DESC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch saved listings' })
  }
})

// POST /api/saved/:listing_id — save a listing
router.post('/:listing_id', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO saved_listings (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.listing_id]
    )
    res.status(201).json({ saved: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save listing' })
  }
})

// DELETE /api/saved/:listing_id — unsave a listing
router.delete('/:listing_id', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM saved_listings WHERE user_id = $1 AND listing_id = $2',
      [req.user.id, req.params.listing_id]
    )
    res.json({ saved: false })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to unsave listing' })
  }
})

export default router
