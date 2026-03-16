import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/notifications — unread + recent notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    )
    const unreadCount = result.rows.filter(n => !n.read).length
    res.json({ notifications: result.rows, unread_count: unreadCount })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to mark as read' })
  }
})

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = TRUE WHERE user_id = $1',
      [req.user.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to mark all as read' })
  }
})

export default router
