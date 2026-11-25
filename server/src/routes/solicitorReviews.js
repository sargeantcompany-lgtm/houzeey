import { Router } from 'express'
import crypto from 'crypto'
import pool from '../db.js'

const router = Router()

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

router.get('/:token', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        sr.id, sr.solicitor_name, sr.solicitor_firm, sr.registration_number,
        sr.registration_state, sr.expires_at,
        l.title, l.address, l.suburb, l.state, l.postcode, l.property_type,
        l.beds, l.baths, l.cars, l.land_size, l.price, l.price_display, l.price_max,
        l.description, u.name AS seller_name
      FROM solicitor_reviews sr
      JOIN listings l ON l.id = sr.listing_id
      JOIN users u ON u.id = l.user_id
      WHERE sr.token_hash = $1 AND sr.status = 'pending'
        AND sr.expires_at > NOW() AND l.type = 'sale'
        AND NOT EXISTS (
          SELECT 1 FROM solicitor_reviews newer
          WHERE newer.listing_id = sr.listing_id AND newer.created_at > sr.created_at
        )
    `, [hashToken(req.params.token)])

    if (!result.rowCount) {
      return res.status(410).json({ error: 'This review link is invalid, expired, or already used.' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Could not load the solicitor review' })
  }
})

router.post('/:token', async (req, res) => {
  const { decision, reviewer_name, registration_number, attestation, notes } = req.body
  if (!['approved', 'changes_requested'].includes(decision)) {
    return res.status(400).json({ error: 'Choose approve or request changes.' })
  }
  if (!String(reviewer_name || '').trim() || !String(registration_number || '').trim()) {
    return res.status(400).json({ error: 'Your full name and professional registration number are required.' })
  }
  if (decision === 'approved' && attestation !== true) {
    return res.status(400).json({ error: 'Confirm that you reviewed the listing information before approving.' })
  }
  if (decision === 'changes_requested' && !String(notes || '').trim()) {
    return res.status(400).json({ error: 'Add a note explaining what needs to be corrected.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const review = await client.query(`
      SELECT id, listing_id
      FROM solicitor_reviews sr
      WHERE token_hash = $1 AND status = 'pending' AND expires_at > NOW()
        AND NOT EXISTS (
          SELECT 1 FROM solicitor_reviews newer
          WHERE newer.listing_id = sr.listing_id AND newer.created_at > sr.created_at
        )
      FOR UPDATE
    `, [hashToken(req.params.token)])

    if (!review.rowCount) {
      await client.query('ROLLBACK')
      return res.status(410).json({ error: 'This review link is invalid, expired, or already used.' })
    }

    const status = decision === 'approved' ? 'approved' : 'changes_requested'
    await client.query(`
      UPDATE solicitor_reviews
      SET status = $1, reviewer_name = $2, reviewer_registration_number = $3,
          notes = $4, reviewed_at = NOW()
      WHERE id = $5
    `, [status, String(reviewer_name).trim(), String(registration_number).trim(), String(notes || '').trim() || null, review.rows[0].id])

    const published = await client.query(`
      UPDATE listings SET status = $1, updated_at = NOW()
      WHERE id = $2 AND type = 'sale' AND status = 'pending_review'
        AND EXISTS (SELECT 1 FROM users WHERE users.id = listings.user_id AND users.verified = TRUE)
    `, [decision === 'approved' ? 'active' : 'needs_changes', review.rows[0].listing_id])
    if (!published.rowCount) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'The seller identity is not verified, so this listing cannot be published yet.' })
    }

    await client.query('COMMIT')
    res.json({
      status,
      message: decision === 'approved'
        ? 'Thank you. Your attestation has been recorded and the private sale listing is now published.'
        : 'Your requested changes have been recorded. The property will remain unpublished.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(error)
    res.status(500).json({ error: 'Could not submit the solicitor review' })
  } finally {
    client.release()
  }
})

export default router
