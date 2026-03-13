import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/payments — user's payment history
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        l.title AS listing_title,
        l.suburb AS listing_suburb,
        l.address AS listing_address
      FROM payments p
      LEFT JOIN listings l ON p.listing_id = l.id
      WHERE p.user_id = $1
      ORDER BY p.paid_at DESC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch payments' })
  }
})

// GET /api/payments/leases — leases for current user (as tenant)
router.get('/leases', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        le.*,
        l.title AS listing_title,
        l.suburb AS listing_suburb,
        l.address AS listing_address,
        landlord.name AS landlord_name,
        (
          SELECT COUNT(*) FROM payments p
          WHERE p.lease_id = le.id AND p.status = 'paid'
        ) AS payments_made
      FROM leases le
      JOIN listings l ON le.listing_id = l.id
      JOIN users landlord ON le.landlord_id = landlord.id
      WHERE le.tenant_id = $1 AND le.status = 'active'
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch leases' })
  }
})

// POST /api/payments — process a payment
router.post('/', requireAuth, async (req, res) => {
  const { lease_id, listing_id, amount, method = 'card' } = req.body

  if (!amount || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'Valid amount required' })
  }

  try {
    // NOTE: Real payment processing (Stripe etc.) would go here.
    // For now we record the payment as paid directly.
    const receipt_id = `REC-${uuidv4().slice(0, 8).toUpperCase()}`

    const result = await pool.query(`
      INSERT INTO payments (lease_id, user_id, listing_id, amount, method, status, receipt_id, due_date, paid_at)
      VALUES ($1, $2, $3, $4, $5, 'paid', $6, CURRENT_DATE, NOW())
      RETURNING *
    `, [lease_id || null, req.user.id, listing_id || null, parseFloat(amount), method, receipt_id])

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Payment failed' })
  }
})

// POST /api/payments/leases — landlord creates a lease for a tenant
router.post('/leases', requireAuth, async (req, res) => {
  const { tenant_id, listing_id, monthly_amount, due_day = 1, start_date, end_date } = req.body

  if (!tenant_id || !listing_id || !monthly_amount || !start_date) {
    return res.status(400).json({ error: 'tenant_id, listing_id, monthly_amount and start_date are required' })
  }

  try {
    // Verify requester owns the listing
    const listingCheck = await pool.query('SELECT user_id FROM listings WHERE id = $1', [listing_id])
    if (listingCheck.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })
    if (listingCheck.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })

    const result = await pool.query(`
      INSERT INTO leases (tenant_id, landlord_id, listing_id, monthly_amount, due_day, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [tenant_id, req.user.id, listing_id, monthly_amount, due_day, start_date, end_date || null])

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create lease' })
  }
})

export default router
