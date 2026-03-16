import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import PDFDocument from 'pdfkit'

const router = Router()

// GET /api/offers/listing/:listingId — all offers on a listing (seller only)
router.get('/listing/:listingId', requireAuth, async (req, res) => {
  try {
    const listing = await pool.query('SELECT user_id FROM listings WHERE id = $1', [req.params.listingId])
    if (listing.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })
    if (listing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })

    const result = await pool.query(`
      SELECT o.*, u.name AS buyer_name, u.email AS buyer_email,
             l.title AS listing_title, l.address AS listing_address
      FROM offers o
      JOIN users u ON o.buyer_id = u.id
      JOIN listings l ON o.listing_id = l.id
      WHERE o.listing_id = $1
      ORDER BY o.updated_at DESC
    `, [req.params.listingId])

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch offers' })
  }
})

// GET /api/offers/mine — offers I've made as a buyer
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, l.title AS listing_title, l.address AS listing_address,
             l.suburb AS listing_suburb, u.name AS seller_name
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      JOIN users u ON o.seller_id = u.id
      WHERE o.buyer_id = $1
      ORDER BY o.updated_at DESC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch your offers' })
  }
})

// GET /api/offers/:id — single offer with history
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, l.title AS listing_title, l.address AS listing_address,
             b.name AS buyer_name, b.email AS buyer_email,
             s.name AS seller_name, s.email AS seller_email
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      JOIN users b ON o.buyer_id = b.id
      JOIN users s ON o.seller_id = s.id
      WHERE o.id = $1
    `, [req.params.id])

    if (result.rows.length === 0) return res.status(404).json({ error: 'Offer not found' })
    const offer = result.rows[0]

    if (offer.buyer_id !== req.user.id && offer.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' })
    }

    const history = await pool.query(`
      SELECT oh.*, u.name AS made_by_name
      FROM offer_history oh
      JOIN users u ON oh.made_by = u.id
      WHERE oh.offer_id = $1
      ORDER BY oh.created_at ASC
    `, [req.params.id])

    offer.history = history.rows
    res.json(offer)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch offer' })
  }
})

// POST /api/offers — submit a new offer
router.post('/', requireAuth, async (req, res) => {
  const {
    listing_id, offer_price, settlement_date, finance_clause, finance_days,
    building_inspection, building_days, deposit_amount, deposit_due_days,
    inclusions, exclusions, conditions,
  } = req.body

  if (!listing_id || !offer_price) {
    return res.status(400).json({ error: 'listing_id and offer_price are required' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const listing = await client.query('SELECT user_id FROM listings WHERE id = $1', [listing_id])
    if (listing.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Listing not found' })
    }

    const sellerId = listing.rows[0].user_id
    if (sellerId === req.user.id) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Cannot make an offer on your own listing' })
    }

    const offer = await client.query(`
      INSERT INTO offers (
        listing_id, buyer_id, seller_id, offer_price, settlement_date,
        finance_clause, finance_days, building_inspection, building_days,
        deposit_amount, deposit_due_days, inclusions, exclusions, conditions,
        status, current_offer_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending','buyer')
      RETURNING *
    `, [
      listing_id, req.user.id, sellerId, offer_price, settlement_date || null,
      finance_clause || false, finance_days || null, building_inspection || false, building_days || null,
      deposit_amount || null, deposit_due_days || 7, inclusions || null, exclusions || null, conditions || null,
    ])

    await client.query(`
      INSERT INTO offer_history (offer_id, made_by, made_by_role, offer_price, settlement_date,
        finance_clause, building_inspection, conditions, action)
      VALUES ($1,$2,'buyer',$3,$4,$5,$6,$7,'submitted')
    `, [offer.rows[0].id, req.user.id, offer_price, settlement_date || null,
        finance_clause || false, building_inspection || false, conditions || null])

    await client.query('COMMIT')
    res.status(201).json(offer.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to submit offer' })
  } finally {
    client.release()
  }
})

// POST /api/offers/:id/counter — seller counters an offer
router.post('/:id/counter', requireAuth, async (req, res) => {
  const { offer_price, settlement_date, finance_clause, building_inspection, conditions, note } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const offerRes = await client.query('SELECT * FROM offers WHERE id = $1 FOR UPDATE', [req.params.id])
    if (offerRes.rows.length === 0) return res.status(404).json({ error: 'Offer not found' })

    const offer = offerRes.rows[0]
    if (offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can counter' })
    if (!['pending', 'countered'].includes(offer.status)) {
      return res.status(400).json({ error: 'Offer cannot be countered in its current state' })
    }

    await client.query(`
      UPDATE offers SET offer_price = COALESCE($1, offer_price),
        settlement_date = COALESCE($2, settlement_date),
        finance_clause = COALESCE($3, finance_clause),
        building_inspection = COALESCE($4, building_inspection),
        conditions = COALESCE($5, conditions),
        status = 'countered', current_offer_by = 'seller', updated_at = NOW()
      WHERE id = $6
    `, [offer_price || null, settlement_date || null, finance_clause, building_inspection,
        conditions || null, offer.id])

    await client.query(`
      INSERT INTO offer_history (offer_id, made_by, made_by_role, offer_price, settlement_date,
        finance_clause, building_inspection, conditions, note, action)
      VALUES ($1,$2,'seller',$3,$4,$5,$6,$7,$8,'countered')
    `, [offer.id, req.user.id, offer_price || offer.offer_price, settlement_date || offer.settlement_date,
        finance_clause ?? offer.finance_clause, building_inspection ?? offer.building_inspection,
        conditions || offer.conditions, note || null])

    await client.query('COMMIT')
    const updated = await pool.query('SELECT * FROM offers WHERE id = $1', [req.params.id])
    res.json(updated.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to counter offer' })
  } finally {
    client.release()
  }
})

// POST /api/offers/:id/accept
router.post('/:id/accept', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const offerRes = await client.query('SELECT * FROM offers WHERE id = $1 FOR UPDATE', [req.params.id])
    if (offerRes.rows.length === 0) return res.status(404).json({ error: 'Offer not found' })

    const offer = offerRes.rows[0]
    if (offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can accept' })
    if (offer.status === 'accepted') return res.status(400).json({ error: 'Already accepted' })

    await client.query(
      "UPDATE offers SET status = 'accepted', updated_at = NOW() WHERE id = $1",
      [offer.id]
    )

    await client.query(`
      INSERT INTO offer_history (offer_id, made_by, made_by_role, offer_price, action)
      VALUES ($1, $2, 'seller', $3, 'accepted')
    `, [offer.id, req.user.id, offer.offer_price])

    // Auto-create settlement milestones
    const milestones = [
      { title: 'Offer accepted', description: 'Both parties have agreed on the offer terms', days: 0, order: 1 },
      { title: 'Deposit paid', description: `Buyer pays deposit of $${offer.deposit_amount || 'TBC'}`, days: offer.deposit_due_days || 7, order: 2 },
      { title: 'Finance approved', description: 'Buyer obtains formal finance approval', days: offer.finance_days || 14, order: 3 },
      { title: 'Building & pest inspection', description: 'Inspection carried out and report reviewed', days: offer.building_days || 14, order: 4 },
      { title: 'Contracts exchanged', description: 'Solicitors exchange signed contracts', days: 21, order: 5 },
      { title: 'Settlement', description: 'Final settlement — keys handed over', days: 42, order: 6 },
    ]

    const baseDate = offer.settlement_date ? new Date(offer.settlement_date) : new Date()
    for (const m of milestones) {
      const dueDate = new Date(baseDate)
      dueDate.setDate(dueDate.getDate() + (m.order === 6 ? 0 : m.days))
      await client.query(`
        INSERT INTO settlement_milestones (offer_id, title, description, due_date, sort_order)
        VALUES ($1, $2, $3, $4, $5)
      `, [offer.id, m.title, m.description, dueDate.toISOString().split('T')[0], m.order])
    }

    await client.query('COMMIT')
    const updated = await pool.query('SELECT * FROM offers WHERE id = $1', [req.params.id])
    res.json(updated.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to accept offer' })
  } finally {
    client.release()
  }
})

// POST /api/offers/:id/reject
router.post('/:id/reject', requireAuth, async (req, res) => {
  try {
    const offerRes = await pool.query('SELECT * FROM offers WHERE id = $1', [req.params.id])
    if (offerRes.rows.length === 0) return res.status(404).json({ error: 'Offer not found' })

    const offer = offerRes.rows[0]
    if (offer.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can reject' })

    await pool.query("UPDATE offers SET status = 'rejected', updated_at = NOW() WHERE id = $1", [offer.id])
    await pool.query(`
      INSERT INTO offer_history (offer_id, made_by, made_by_role, offer_price, action)
      VALUES ($1, $2, 'seller', $3, 'rejected')
    `, [offer.id, req.user.id, offer.offer_price])

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to reject offer' })
  }
})

// POST /api/offers/:id/withdraw — buyer withdraws
router.post('/:id/withdraw', requireAuth, async (req, res) => {
  try {
    const offerRes = await pool.query('SELECT * FROM offers WHERE id = $1', [req.params.id])
    if (offerRes.rows.length === 0) return res.status(404).json({ error: 'Offer not found' })

    const offer = offerRes.rows[0]
    if (offer.buyer_id !== req.user.id) return res.status(403).json({ error: 'Only buyer can withdraw' })

    await pool.query("UPDATE offers SET status = 'withdrawn', updated_at = NOW() WHERE id = $1", [offer.id])
    await pool.query(`
      INSERT INTO offer_history (offer_id, made_by, made_by_role, offer_price, action)
      VALUES ($1, $2, 'buyer', $3, 'withdrawn')
    `, [offer.id, req.user.id, offer.offer_price])

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to withdraw offer' })
  }
})

// GET /api/offers/:id/pdf — generate letter of offer PDF
router.get('/:id/pdf', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, l.title AS listing_title, l.address AS listing_address,
             l.suburb, l.state, l.postcode,
             b.name AS buyer_name, b.email AS buyer_email,
             s.name AS seller_name, s.email AS seller_email
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      JOIN users b ON o.buyer_id = b.id
      JOIN users s ON o.seller_id = s.id
      WHERE o.id = $1
    `, [req.params.id])

    if (result.rows.length === 0) return res.status(404).json({ error: 'Offer not found' })
    const o = result.rows[0]

    if (o.buyer_id !== req.user.id && o.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' })
    }

    const doc = new PDFDocument({ margin: 60 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="letter-of-offer-${o.id}.pdf"`)
    doc.pipe(res)

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('LETTER OF OFFER', { align: 'center' })
    doc.fontSize(12).font('Helvetica').text('Houzeey — Peer-to-Peer Property Platform', { align: 'center' })
    doc.moveDown(2)

    // Property
    doc.fontSize(14).font('Helvetica-Bold').text('Property Details')
    doc.fontSize(11).font('Helvetica')
    doc.text(`Address: ${o.listing_address}, ${o.suburb} ${o.state} ${o.postcode}`)
    doc.text(`Listing: ${o.listing_title}`)
    doc.moveDown()

    // Parties
    doc.fontSize(14).font('Helvetica-Bold').text('Parties')
    doc.fontSize(11).font('Helvetica')
    doc.text(`Buyer: ${o.buyer_name} (${o.buyer_email})`)
    doc.text(`Seller: ${o.seller_name} (${o.seller_email})`)
    doc.moveDown()

    // Offer terms
    doc.fontSize(14).font('Helvetica-Bold').text('Offer Terms')
    doc.fontSize(11).font('Helvetica')
    doc.text(`Purchase Price: $${Number(o.offer_price).toLocaleString('en-AU')}`)
    if (o.settlement_date) doc.text(`Settlement Date: ${new Date(o.settlement_date).toLocaleDateString('en-AU')}`)
    if (o.deposit_amount) doc.text(`Deposit: $${Number(o.deposit_amount).toLocaleString('en-AU')} (due within ${o.deposit_due_days} days)`)
    doc.text(`Finance Clause: ${o.finance_clause ? `Yes (${o.finance_days} days)` : 'No'}`)
    doc.text(`Building & Pest Inspection: ${o.building_inspection ? `Yes (${o.building_days} days)` : 'No'}`)
    if (o.inclusions) doc.text(`Inclusions: ${o.inclusions}`)
    if (o.exclusions) doc.text(`Exclusions: ${o.exclusions}`)
    if (o.conditions) doc.text(`Special Conditions: ${o.conditions}`)
    doc.moveDown()

    // Status
    doc.fontSize(14).font('Helvetica-Bold').text('Status')
    doc.fontSize(11).font('Helvetica').text(`Offer Status: ${o.status.toUpperCase()}`)
    doc.text(`Date: ${new Date(o.created_at).toLocaleDateString('en-AU')}`)
    doc.moveDown(2)

    // Signatures
    doc.fontSize(14).font('Helvetica-Bold').text('Signatures')
    doc.moveDown()
    doc.fontSize(11).font('Helvetica')
    doc.text('Buyer: _________________________   Date: ____________')
    doc.moveDown()
    doc.text('Seller: _________________________   Date: ____________')
    doc.moveDown(2)

    // Disclaimer
    doc.fontSize(9).fillColor('#666')
    doc.text('This letter of offer is generated by Houzeey and is not a legally binding contract. Parties should engage a licensed conveyancer or solicitor for the formal contract of sale.')

    doc.end()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to generate PDF' })
  }
})

export default router
