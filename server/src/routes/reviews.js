import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/reviews/:userId — get reviews for a user
router.get('/:userId', async (req, res) => {
  try {
    const reviews = await pool.query(`
      SELECT r.*, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = $1
      ORDER BY r.created_at DESC
    `, [req.params.userId])

    const avg = await pool.query(
      'SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS total FROM reviews WHERE reviewee_id = $1',
      [req.params.userId]
    )

    res.json({
      reviews: reviews.rows,
      avg_rating: parseFloat(avg.rows[0].avg_rating) || 0,
      total: parseInt(avg.rows[0].total),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch reviews' })
  }
})

// POST /api/reviews — leave a review
router.post('/', requireAuth, async (req, res) => {
  const { reviewee_id, listing_id, rating, comment } = req.body

  if (!reviewee_id || !rating) {
    return res.status(400).json({ error: 'reviewee_id and rating are required' })
  }
  if (reviewee_id === req.user.id) {
    return res.status(400).json({ error: 'Cannot review yourself' })
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Upsert the review
    const result = await client.query(`
      INSERT INTO reviews (reviewer_id, reviewee_id, listing_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
      RETURNING *
    `, [req.user.id, reviewee_id, listing_id || null, rating, comment || null])

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'You have already reviewed this person for this listing' })
    }

    // Recalculate trust score
    await client.query(`
      UPDATE users SET trust_score = (
        SELECT ROUND(AVG(rating))::INTEGER FROM reviews WHERE reviewee_id = $1
      ) WHERE id = $1
    `, [reviewee_id])

    await client.query('COMMIT')
    res.status(201).json(result.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to submit review' })
  } finally {
    client.release()
  }
})

export default router
