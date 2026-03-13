import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/conversations — list all conversations for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.listing_id,
        c.updated_at,
        l.title AS listing_title,
        l.suburb AS listing_suburb,
        (
          SELECT content FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC LIMIT 1
        ) AS last_message,
        (
          SELECT created_at FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC LIMIT 1
        ) AS last_message_at,
        (
          SELECT COUNT(*) FROM messages
          WHERE conversation_id = c.id AND sender_id != $1 AND read = false
        ) AS unread_count,
        other_user.id AS other_user_id,
        other_user.name AS other_user_name,
        other_user.avatar_url AS other_user_avatar
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $1
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != $1
      JOIN users other_user ON cp2.user_id = other_user.id
      LEFT JOIN listings l ON c.listing_id = l.id
      ORDER BY c.updated_at DESC
    `, [req.user.id])

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch conversations' })
  }
})

// POST /api/conversations — start or get existing conversation
router.post('/', requireAuth, async (req, res) => {
  const { recipient_id, listing_id, message } = req.body

  if (!recipient_id || !message) {
    return res.status(400).json({ error: 'recipient_id and message are required' })
  }
  if (recipient_id === req.user.id) {
    return res.status(400).json({ error: 'Cannot message yourself' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Check if conversation already exists between these two users for this listing
    const existing = await client.query(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
      WHERE ($3::uuid IS NULL OR c.listing_id = $3)
      LIMIT 1
    `, [req.user.id, recipient_id, listing_id || null])

    let conversationId
    if (existing.rows.length > 0) {
      conversationId = existing.rows[0].id
    } else {
      const conv = await client.query(
        'INSERT INTO conversations (listing_id) VALUES ($1) RETURNING id',
        [listing_id || null]
      )
      conversationId = conv.rows[0].id
      await client.query(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
        [conversationId, req.user.id, recipient_id]
      )
    }

    const msg = await client.query(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
      [conversationId, req.user.id, message]
    )

    await client.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    )

    await client.query('COMMIT')
    res.status(201).json({ conversation_id: conversationId, message: msg.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to create conversation' })
  } finally {
    client.release()
  }
})

// GET /api/conversations/:id/messages
router.get('/:id/messages', requireAuth, async (req, res) => {
  try {
    // Verify user is a participant
    const check = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (check.rows.length === 0) return res.status(403).json({ error: 'Not a participant' })

    const result = await pool.query(`
      SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [req.params.id])

    // Mark messages from others as read
    await pool.query(
      'UPDATE messages SET read = true WHERE conversation_id = $1 AND sender_id != $2 AND read = false',
      [req.params.id, req.user.id]
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// POST /api/conversations/:id/messages
router.post('/:id/messages', requireAuth, async (req, res) => {
  const { content } = req.body
  if (!content || !content.trim()) return res.status(400).json({ error: 'Message content required' })

  try {
    const check = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (check.rows.length === 0) return res.status(403).json({ error: 'Not a participant' })

    const result = await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.user.id, content.trim()]
    )

    await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [req.params.id])

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

export default router
