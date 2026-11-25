import { Router } from 'express'
import pool from '../db.js'
import { notify } from '../notify.js'
import { sendEmail } from '../email.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function siteUrl() {
  return String(process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '')
}

// All buyer/seller messaging stays inside Houzeey. After each message:
//  - each recipient gets an in-app notification (bell) linking to Messages
//  - the site owner gets an email copy of the full message (MESSAGE_ALERT_EMAIL,
//    falling back to ADMIN_EMAIL). Failures are logged, never block sending.
async function alertNewMessage(conversationId, senderId, content) {
  try {
    const info = await pool.query(`
      SELECT s.name AS sender_name, s.email AS sender_email,
        l.id AS listing_id, l.title AS listing_title, l.address, l.suburb, l.state
      FROM conversations c
      JOIN users s ON s.id = $2
      LEFT JOIN listings l ON l.id = c.listing_id
      WHERE c.id = $1
    `, [conversationId, senderId])
    const recipients = await pool.query(`
      SELECT u.id, u.name, u.email FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = $1 AND cp.user_id <> $2
    `, [conversationId, senderId])
    const row = info.rows[0]
    if (!row) return

    const property = row.listing_title
      ? `${row.listing_title}${row.address ? ` (${row.address}, ${row.suburb} ${row.state})` : ''}`
      : 'a general enquiry'
    const preview = content.length > 140 ? content.slice(0, 137) + '…' : content

    await Promise.all(recipients.rows.map(r => notify(r.id, {
      type: 'message',
      title: `New message from ${row.sender_name}`,
      body: preview,
      link: '/messages',
    })))

    const ownerEmail = process.env.MESSAGE_ALERT_EMAIL || process.env.ADMIN_EMAIL
    if (!ownerEmail) return
    const to = recipients.rows.map(r => `${r.name} <${r.email}>`).join(', ')
    const listingLink = row.listing_id ? `${siteUrl()}/listing/${row.listing_id}` : siteUrl()
    await sendEmail({
      to: ownerEmail,
      subject: `Houzeey message: ${row.sender_name} → ${recipients.rows.map(r => r.name).join(', ')} about ${row.listing_title || 'an enquiry'}`,
      text: `From: ${row.sender_name} <${row.sender_email}>
To: ${to}
Property: ${property}

${content}

View listing: ${listingLink}
`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px">
        <h2 style="color:#1b6570;margin:0 0 12px">New Houzeey message</h2>
        <p style="margin:0 0 4px"><strong>From:</strong> ${escapeHtml(row.sender_name)} &lt;${escapeHtml(row.sender_email)}&gt;</p>
        <p style="margin:0 0 4px"><strong>To:</strong> ${escapeHtml(to)}</p>
        <p style="margin:0 0 16px"><strong>Property:</strong> ${escapeHtml(property)}</p>
        <div style="white-space:pre-wrap;background:#f4f7f7;border-radius:8px;padding:14px">${escapeHtml(content)}</div>
        <p style="margin:18px 0"><a href="${listingLink}" style="background:#1b6570;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View listing on Houzeey</a></p>
        <p style="color:#888;font-size:12px">Messages stay inside Houzeey. Buyers and sellers reply in the app.</p>
      </div>`,
    })
  } catch (err) {
    console.error('Message alert failed:', err.message)
  }
}

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
    alertNewMessage(conversationId, req.user.id, message)
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
    alertNewMessage(req.params.id, req.user.id, content.trim())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

export default router
