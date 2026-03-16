import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/inspections/listing/:listingId/slots — get available slots for a listing
router.get('/listing/:listingId/slots', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM inspection_slots
      WHERE listing_id = $1 AND datetime > NOW() AND is_booked = FALSE
      ORDER BY datetime ASC
    `, [req.params.listingId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch slots' })
  }
})

// GET /api/inspections/listing/:listingId — all inspections for a listing (owner only)
router.get('/listing/:listingId', requireAuth, async (req, res) => {
  try {
    const listing = await pool.query('SELECT user_id FROM listings WHERE id = $1', [req.params.listingId])
    if (listing.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })
    if (listing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })

    const result = await pool.query(`
      SELECT i.*, u.name AS booker_name, u.email AS booker_email, u.phone AS booker_phone
      FROM inspections i
      JOIN users u ON i.booker_id = u.id
      WHERE i.listing_id = $1
      ORDER BY i.datetime ASC
    `, [req.params.listingId])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch inspections' })
  }
})

// GET /api/inspections/mine — my booked inspections
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, l.title AS listing_title, l.address AS listing_address,
             l.suburb AS listing_suburb, u.name AS owner_name
      FROM inspections i
      JOIN listings l ON i.listing_id = l.id
      JOIN users u ON i.owner_id = u.id
      WHERE i.booker_id = $1
      ORDER BY i.datetime ASC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch your inspections' })
  }
})

// POST /api/inspections/listing/:listingId/slots — add available time slots (owner)
router.post('/listing/:listingId/slots', requireAuth, async (req, res) => {
  const { slots } = req.body // array of datetime strings

  if (!slots || !Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ error: 'slots array is required' })
  }

  try {
    const listing = await pool.query('SELECT user_id FROM listings WHERE id = $1', [req.params.listingId])
    if (listing.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })
    if (listing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })

    const inserted = []
    for (const dt of slots) {
      const r = await pool.query(
        'INSERT INTO inspection_slots (listing_id, datetime) VALUES ($1, $2) RETURNING *',
        [req.params.listingId, dt]
      )
      inserted.push(r.rows[0])
    }

    res.status(201).json(inserted)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add slots' })
  }
})

// POST /api/inspections/book/:slotId — book an inspection slot
router.post('/book/:slotId', requireAuth, async (req, res) => {
  const { notes } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const slot = await client.query(
      'SELECT * FROM inspection_slots WHERE id = $1 FOR UPDATE',
      [req.params.slotId]
    )

    if (slot.rows.length === 0) return res.status(404).json({ error: 'Slot not found' })
    if (slot.rows[0].is_booked) return res.status(409).json({ error: 'Slot already booked' })

    const s = slot.rows[0]

    const listing = await client.query('SELECT user_id FROM listings WHERE id = $1', [s.listing_id])
    const ownerId = listing.rows[0].user_id

    if (ownerId === req.user.id) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Cannot book your own listing inspection' })
    }

    await client.query('UPDATE inspection_slots SET is_booked = TRUE WHERE id = $1', [s.id])

    const result = await client.query(`
      INSERT INTO inspections (slot_id, listing_id, owner_id, booker_id, datetime, notes)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [s.id, s.listing_id, ownerId, req.user.id, s.datetime, notes || null])

    await client.query('COMMIT')
    res.status(201).json(result.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to book inspection' })
  } finally {
    client.release()
  }
})

// DELETE /api/inspections/:id — cancel booking
router.delete('/:id', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const insp = await client.query('SELECT * FROM inspections WHERE id = $1', [req.params.id])
    if (insp.rows.length === 0) return res.status(404).json({ error: 'Inspection not found' })

    const i = insp.rows[0]
    if (i.booker_id !== req.user.id && i.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' })
    }

    await client.query('UPDATE inspection_slots SET is_booked = FALSE WHERE id = $1', [i.slot_id])
    await client.query('DELETE FROM inspections WHERE id = $1', [req.params.id])

    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to cancel inspection' })
  } finally {
    client.release()
  }
})

export default router
