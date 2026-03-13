import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()

// GET /api/users/me/stats — dashboard stats
router.get('/me/stats', requireAuth, async (req, res) => {
  try {
    const [listings, views, enquiries, payments] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM listings WHERE user_id = $1 AND status = 'active'", [req.user.id]),
      pool.query('SELECT COALESCE(SUM(views), 0) FROM listings WHERE user_id = $1', [req.user.id]),
      pool.query(`
        SELECT COUNT(*) FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        JOIN listings l ON c.listing_id = l.id
        WHERE l.user_id = $1
      `, [req.user.id]),
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) FROM payments
        WHERE user_id = $1 AND status = 'paid'
        AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())
      `, [req.user.id]),
    ])

    res.json({
      active_listings: parseInt(listings.rows[0].count),
      total_views: parseInt(views.rows[0].coalesce),
      enquiries: parseInt(enquiries.rows[0].count),
      monthly_payments: parseFloat(payments.rows[0].coalesce),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// GET /api/users/:id — public profile
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, role, verified, avatar_url, created_at FROM users WHERE id = $1',
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// PUT /api/users/me — update own profile
router.put('/me', requireAuth, upload.single('avatar'), async (req, res) => {
  const { name, role } = req.body

  try {
    let avatarUrl = undefined
    if (req.file) {
      avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    }

    const result = await pool.query(`
      UPDATE users SET
        name = COALESCE($1, name),
        role = COALESCE($2, role),
        avatar_url = COALESCE($3, avatar_url)
      WHERE id = $4
      RETURNING id, name, email, role, verified, avatar_url, created_at
    `, [name || null, role || null, avatarUrl || null, req.user.id])

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router
