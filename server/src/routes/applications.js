import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()

async function storeFile(req, file) {
  const base64 = file.buffer.toString('base64')
  const result = await pool.query(
    'INSERT INTO listing_images (listing_id, data, mimetype, display_order) VALUES (NULL, $1, $2, 0) RETURNING id',
    [base64, file.mimetype]
  )
  return `${req.protocol}://${req.get('host')}/api/images/${result.rows[0].id}`
}

// GET /api/applications/listing/:listingId — landlord views all applications for their listing
router.get('/listing/:listingId', requireAuth, async (req, res) => {
  try {
    const listing = await pool.query('SELECT user_id FROM listings WHERE id = $1', [req.params.listingId])
    if (listing.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })
    if (listing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })

    const result = await pool.query(`
      SELECT ra.*, u.name AS tenant_name, u.email AS tenant_email, u.phone AS tenant_phone
      FROM rental_applications ra
      JOIN users u ON ra.tenant_id = u.id
      WHERE ra.listing_id = $1
      ORDER BY ra.created_at DESC
    `, [req.params.listingId])

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch applications' })
  }
})

// GET /api/applications/received — landlord views all applications across their listings
router.get('/received', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ra.*, u.name AS tenant_name, u.email AS tenant_email, u.phone AS tenant_phone,
             l.title AS listing_title, l.suburb AS listing_suburb
      FROM rental_applications ra
      JOIN users u ON ra.tenant_id = u.id
      JOIN listings l ON ra.listing_id = l.id
      WHERE ra.landlord_id = $1
      ORDER BY ra.created_at DESC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch applications' })
  }
})

// GET /api/applications/mine — tenant views their own applications
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ra.*, l.title AS listing_title, l.address AS listing_address,
             l.suburb AS listing_suburb, l.price AS listing_price,
             u.name AS landlord_name
      FROM rental_applications ra
      JOIN listings l ON ra.listing_id = l.id
      JOIN users u ON ra.landlord_id = u.id
      WHERE ra.tenant_id = $1
      ORDER BY ra.created_at DESC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch your applications' })
  }
})

// GET /api/applications/:id — single application
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ra.*, u.name AS tenant_name, u.email AS tenant_email,
             l.title AS listing_title, l.address AS listing_address
      FROM rental_applications ra
      JOIN users u ON ra.tenant_id = u.id
      JOIN listings l ON ra.listing_id = l.id
      WHERE ra.id = $1
    `, [req.params.id])

    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' })
    const app = result.rows[0]

    if (app.tenant_id !== req.user.id && app.landlord_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' })
    }

    res.json(app)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch application' })
  }
})

// POST /api/applications — tenant submits application
router.post('/', requireAuth, upload.single('id_document'), async (req, res) => {
  const {
    listing_id, employer_name, employer_contact, employment_type, annual_income,
    reference1_name, reference1_phone, reference1_relation,
    reference2_name, reference2_phone, reference2_relation,
    current_address, current_rent, rental_history,
    num_occupants, pets, pet_description, message, move_in_date,
  } = req.body

  if (!listing_id) return res.status(400).json({ error: 'listing_id is required' })

  try {
    const listing = await pool.query('SELECT user_id FROM listings WHERE id = $1', [listing_id])
    if (listing.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })

    const landlordId = listing.rows[0].user_id
    if (landlordId === req.user.id) return res.status(400).json({ error: 'Cannot apply to your own listing' })

    // Check for duplicate
    const existing = await pool.query(
      'SELECT id FROM rental_applications WHERE listing_id = $1 AND tenant_id = $2',
      [listing_id, req.user.id]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already applied to this listing' })
    }

    const idDocUrl = req.file ? await storeFile(req, req.file) : null

    const result = await pool.query(`
      INSERT INTO rental_applications (
        listing_id, tenant_id, landlord_id,
        employer_name, employer_contact, employment_type, annual_income,
        reference1_name, reference1_phone, reference1_relation,
        reference2_name, reference2_phone, reference2_relation,
        id_document_url, current_address, current_rent, rental_history,
        num_occupants, pets, pet_description, message, move_in_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *
    `, [
      listing_id, req.user.id, landlordId,
      employer_name || null, employer_contact || null, employment_type || null,
      annual_income ? parseFloat(annual_income) : null,
      reference1_name || null, reference1_phone || null, reference1_relation || null,
      reference2_name || null, reference2_phone || null, reference2_relation || null,
      idDocUrl, current_address || null, current_rent ? parseFloat(current_rent) : null,
      rental_history || null, parseInt(num_occupants) || 1,
      pets === 'true' || pets === true, pet_description || null,
      message || null, move_in_date || null,
    ])

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to submit application' })
  }
})

// PUT /api/applications/:id/status — landlord approves or rejects
router.put('/:id/status', requireAuth, async (req, res) => {
  const { status, landlord_notes } = req.body

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' })
  }

  try {
    const appRes = await pool.query('SELECT * FROM rental_applications WHERE id = $1', [req.params.id])
    if (appRes.rows.length === 0) return res.status(404).json({ error: 'Application not found' })

    const app = appRes.rows[0]
    if (app.landlord_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })

    const result = await pool.query(
      'UPDATE rental_applications SET status = $1, landlord_notes = $2 WHERE id = $3 RETURNING *',
      [status, landlord_notes || null, req.params.id]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update application status' })
  }
})

export default router
