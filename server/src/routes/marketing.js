import { Router } from 'express'
import nodemailer from 'nodemailer'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin access required' })
  next()
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// GET /api/marketing/contacts — list contacts
router.get('/contacts', requireAuth, requireAdmin, async (req, res) => {
  const { type, search, limit = 100, offset = 0 } = req.query
  try {
    const conditions = []
    const params = []

    if (type && type !== 'all') {
      conditions.push(`type = $${params.length + 1}`)
      params.push(type)
    }
    if (search) {
      conditions.push(`(email ILIKE $${params.length + 1} OR name ILIKE $${params.length + 1})`)
      params.push(`%${search}%`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await pool.query(
      `SELECT * FROM contacts ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), parseInt(offset)]
    )
    const count = await pool.query(`SELECT COUNT(*) FROM contacts ${where}`, params)

    res.json({ contacts: result.rows, total: parseInt(count.rows[0].count) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch contacts' })
  }
})

// POST /api/marketing/contacts — add single contact
router.post('/contacts', requireAuth, requireAdmin, async (req, res) => {
  const { email, name, phone, type, source } = req.body
  if (!email) return res.status(400).json({ error: 'email is required' })

  try {
    const result = await pool.query(`
      INSERT INTO contacts (email, name, phone, type, source)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type
      RETURNING *
    `, [email, name || null, phone || null, type || 'general', source || null])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add contact' })
  }
})

// POST /api/marketing/contacts/import — bulk import CSV data
router.post('/contacts/import', requireAuth, requireAdmin, async (req, res) => {
  const { contacts } = req.body // array of { email, name, phone, type }
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'contacts array is required' })
  }

  let imported = 0
  let skipped = 0

  for (const c of contacts) {
    if (!c.email) { skipped++; continue }
    try {
      await pool.query(`
        INSERT INTO contacts (email, name, phone, type, source)
        VALUES ($1, $2, $3, $4, 'import')
        ON CONFLICT (email) DO NOTHING
      `, [c.email.trim().toLowerCase(), c.name || null, c.phone || null, c.type || 'general'])
      imported++
    } catch {
      skipped++
    }
  }

  res.json({ imported, skipped })
})

// DELETE /api/marketing/contacts/:id
router.delete('/contacts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM contacts WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete contact' })
  }
})

// GET /api/marketing/campaigns — list campaigns
router.get('/campaigns', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.name AS created_by_name
      FROM campaigns c LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
    `)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch campaigns' })
  }
})

// POST /api/marketing/campaigns — create campaign
router.post('/campaigns', requireAuth, requireAdmin, async (req, res) => {
  const { name, subject, body, type = 'email', filter_type = 'all' } = req.body
  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'name, subject and body are required' })
  }

  try {
    const result = await pool.query(`
      INSERT INTO campaigns (name, subject, body, type, filter_type, created_by)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [name, subject, body, type, filter_type, req.user.id])
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create campaign' })
  }
})

// POST /api/marketing/campaigns/:id/send — send campaign emails
router.post('/campaigns/:id/send', requireAuth, requireAdmin, async (req, res) => {
  try {
    const campRes = await pool.query('SELECT * FROM campaigns WHERE id = $1', [req.params.id])
    if (campRes.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' })

    const campaign = campRes.rows[0]
    if (campaign.status === 'sent') return res.status(400).json({ error: 'Campaign already sent' })

    // Get recipients based on filter_type
    let contactQuery = 'SELECT email, name FROM contacts WHERE subscribed = TRUE'
    const params = []
    if (campaign.filter_type && campaign.filter_type !== 'all') {
      contactQuery += ' AND type = $1'
      params.push(campaign.filter_type)
    }

    const contacts = await pool.query(contactQuery, params)

    if (contacts.rows.length === 0) {
      return res.status(400).json({ error: 'No contacts match this campaign filter' })
    }

    // Mark as sending
    await pool.query("UPDATE campaigns SET status = 'sending' WHERE id = $1", [campaign.id])

    // Send emails async (don't block the response)
    res.json({ message: `Sending to ${contacts.rows.length} contacts...`, total: contacts.rows.length })

    const transporter = getTransporter()
    let sent = 0
    let failed = 0

    for (const contact of contacts.rows) {
      try {
        const personalBody = campaign.body
          .replace(/{{name}}/g, contact.name || 'there')
          .replace(/{{email}}/g, contact.email)

        await transporter.sendMail({
          from: `"Houzeey" <${process.env.SMTP_USER}>`,
          to: contact.email,
          subject: campaign.subject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              ${personalBody.replace(/\n/g, '<br>')}
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999;">
                You're receiving this because you're registered with Houzeey.
                <a href="https://www.houzeey.com/unsubscribe?email=${contact.email}">Unsubscribe</a>
              </p>
            </div>
          `,
        })
        sent++
      } catch {
        failed++
      }
    }

    await pool.query(
      "UPDATE campaigns SET status = 'sent', sent_count = $1, failed_count = $2, sent_at = NOW() WHERE id = $3",
      [sent, failed, campaign.id]
    )
  } catch (err) {
    console.error(err)
    await pool.query("UPDATE campaigns SET status = 'failed' WHERE id = $1", [req.params.id])
  }
})

export default router
