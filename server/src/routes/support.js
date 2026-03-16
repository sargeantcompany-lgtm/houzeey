import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/support — my tickets
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
})

// POST /api/support — create ticket
router.post('/', requireAuth, async (req, res) => {
  const { type, subject, description, related_id } = req.body
  if (!subject || !description) {
    return res.status(400).json({ error: 'subject and description are required' })
  }

  try {
    const result = await pool.query(`
      INSERT INTO support_tickets (user_id, type, subject, description, related_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, type || 'general', subject, description, related_id || null])

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create ticket' })
  }
})

// GET /api/support/admin — admin: all tickets
router.get('/admin', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' })
  const { status } = req.query
  try {
    const where = status ? 'WHERE st.status = $1' : ''
    const params = status ? [status] : []
    const result = await pool.query(`
      SELECT st.*, u.name AS user_name, u.email AS user_email
      FROM support_tickets st
      JOIN users u ON st.user_id = u.id
      ${where}
      ORDER BY st.created_at DESC
    `, params)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
})

// PUT /api/support/:id — admin updates ticket status/response
router.put('/:id', requireAuth, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only' })
  const { status, admin_response } = req.body
  try {
    const result = await pool.query(
      'UPDATE support_tickets SET status = COALESCE($1, status), admin_response = COALESCE($2, admin_response), updated_at = NOW() WHERE id = $3 RETURNING *',
      [status || null, admin_response || null, req.params.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update ticket' })
  }
})

export default router
