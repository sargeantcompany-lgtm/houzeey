import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Middleware: must be admin
function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin access required' })
  next()
}

// GET /api/admin/stats — platform overview
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [users, listings, offers, applications, reviews, contacts] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query("SELECT COUNT(*) FROM listings WHERE status = 'active'"),
      pool.query('SELECT COUNT(*) FROM offers'),
      pool.query('SELECT COUNT(*) FROM rental_applications'),
      pool.query('SELECT COUNT(*) FROM reviews'),
      pool.query('SELECT COUNT(*) FROM contacts'),
    ])

    const pendingVerifications = await pool.query(
      "SELECT COUNT(*) FROM identity_verifications WHERE status = 'pending'"
    )
    const pendingOffers = await pool.query(
      "SELECT COUNT(*) FROM offers WHERE status = 'pending'"
    )

    res.json({
      total_users: parseInt(users.rows[0].count),
      active_listings: parseInt(listings.rows[0].count),
      total_offers: parseInt(offers.rows[0].count),
      total_applications: parseInt(applications.rows[0].count),
      total_reviews: parseInt(reviews.rows[0].count),
      total_contacts: parseInt(contacts.rows[0].count),
      pending_verifications: parseInt(pendingVerifications.rows[0].count),
      pending_offers: parseInt(pendingOffers.rows[0].count),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch admin stats' })
  }
})

// GET /api/admin/users — list all users
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const { search, limit = 50, offset = 0 } = req.query
  try {
    let query = `
      SELECT id, name, email, role, verified, is_admin, trust_score, created_at
      FROM users
    `
    const params = []
    if (search) {
      query += ` WHERE name ILIKE $1 OR email ILIKE $1`
      params.push(`%${search}%`)
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit), parseInt(offset))

    const result = await pool.query(query, params)
    const count = await pool.query(
      search ? `SELECT COUNT(*) FROM users WHERE name ILIKE $1 OR email ILIKE $1` : 'SELECT COUNT(*) FROM users',
      search ? [`%${search}%`] : []
    )
    res.json({ users: result.rows, total: parseInt(count.rows[0].count) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// PUT /api/admin/users/:id — update user (verify, ban, make admin)
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { verified, is_admin, role } = req.body
  try {
    const result = await pool.query(`
      UPDATE users SET
        verified = COALESCE($1, verified),
        is_admin = COALESCE($2, is_admin),
        role = COALESCE($3, role)
      WHERE id = $4
      RETURNING id, name, email, role, verified, is_admin, trust_score, created_at
    `, [
      verified !== undefined ? verified : null,
      is_admin !== undefined ? is_admin : null,
      role || null,
      req.params.id,
    ])
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// GET /api/admin/listings — all listings
router.get('/listings', requireAuth, requireAdmin, async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query
  try {
    const conditions = []
    const params = []
    if (status) { conditions.push(`l.status = $${params.length + 1}`); params.push(status) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await pool.query(`
      SELECT l.*, u.name AS owner_name, u.email AS owner_email
      FROM listings l JOIN users u ON l.user_id = u.id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit), parseInt(offset)])

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch listings' })
  }
})

// PUT /api/admin/listings/:id — update listing status
router.put('/listings/:id', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.body
  try {
    const result = await pool.query(
      'UPDATE listings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update listing' })
  }
})

// DELETE /api/admin/listings/:id
router.delete('/listings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM listings WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete listing' })
  }
})

// GET /api/admin/verifications — pending ID verifications
router.get('/verifications', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT iv.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM identity_verifications iv
      JOIN users u ON iv.user_id = u.id
      WHERE iv.status = 'pending'
      ORDER BY iv.created_at ASC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch verifications' })
  }
})

// PUT /api/admin/verifications/:id — approve or reject
router.put('/verifications/:id', requireAuth, requireAdmin, async (req, res) => {
  const { status, notes } = req.body

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const verif = await client.query('SELECT * FROM identity_verifications WHERE id = $1', [req.params.id])
    if (verif.rows.length === 0) return res.status(404).json({ error: 'Verification not found' })

    await client.query(`
      UPDATE identity_verifications SET
        status = $1, notes = $2, reviewed_by = $3, reviewed_at = NOW()
      WHERE id = $4
    `, [status, notes || null, req.user.id, req.params.id])

    if (status === 'approved') {
      await client.query('UPDATE users SET verified = TRUE WHERE id = $1', [verif.rows[0].user_id])
    }

    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to update verification' })
  } finally {
    client.release()
  }
})

export default router
