import { Router } from 'express'
import pool from '../db.js'
import { sendEmail } from '../email.js'
import { notify } from '../notify.js'
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

// GET /api/offers/received — offers received on my listings (as seller)
router.get('/received', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, l.title AS listing_title, l.address AS listing_address,
             u.name AS buyer_name, u.email AS buyer_email,
             l.suburb AS listing_suburb, l.state AS listing_state, l.postcode AS listing_postcode,
             l.price AS listing_price, l.price_display AS listing_price_display, l.status AS listing_status,
             (SELECT url FROM listing_images WHERE listing_id = l.id AND NOT is_private ORDER BY display_order LIMIT 1) AS listing_image,
             COALESCE((SELECT json_agg(h ORDER BY h.created_at) FROM (
               SELECT oh.made_by_role, oh.action, oh.offer_price, oh.settlement_date, oh.conditions, oh.created_at
               FROM offer_history oh WHERE oh.offer_id = o.id
             ) h), '[]') AS history
      FROM offers o
      JOIN listings l ON o.listing_id = l.id
      JOIN users u ON o.buyer_id = u.id
      WHERE o.seller_id = $1
      ORDER BY o.updated_at DESC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch received offers' })
  }
})

// GET /api/offers/mine — offers I've made as a buyer
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, l.title AS listing_title, l.address AS listing_address,
             u.name AS seller_name,
             l.suburb AS listing_suburb, l.state AS listing_state, l.postcode AS listing_postcode,
             l.price AS listing_price, l.price_display AS listing_price_display, l.status AS listing_status,
             (SELECT url FROM listing_images WHERE listing_id = l.id AND NOT is_private ORDER BY display_order LIMIT 1) AS listing_image,
             COALESCE((SELECT json_agg(h ORDER BY h.created_at) FROM (
               SELECT oh.made_by_role, oh.action, oh.offer_price, oh.settlement_date, oh.conditions, oh.created_at
               FROM offer_history oh WHERE oh.offer_id = o.id
             ) h), '[]') AS history
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

  if (!listing_id || !Number.isFinite(Number(offer_price)) || Number(offer_price) <= 0) {
    return res.status(400).json({ error: 'listing_id and a positive offer_price are required' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Only published listings can receive offers (not ones awaiting solicitor review, sold, etc.)
    const listing = await client.query(
      "SELECT user_id FROM listings WHERE id = $1 AND status = 'active' AND type = 'sale'",
      [listing_id]
    )
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

// POST /api/offers/:id/counter — either party counters the latest offer
router.post('/:id/counter', requireAuth, async (req, res) => {
  const { offer_price, settlement_date, finance_clause, building_inspection, conditions, note } = req.body

  if (offer_price !== undefined && offer_price !== null && offer_price !== '' &&
      (!Number.isFinite(Number(offer_price)) || Number(offer_price) <= 0)) {
    return res.status(400).json({ error: 'Counter offer price must be greater than zero' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const offerRes = await client.query('SELECT * FROM offers WHERE id = $1 FOR UPDATE', [req.params.id])
    if (offerRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Offer not found' })
    }

    const offer = offerRes.rows[0]
    if (![offer.buyer_id, offer.seller_id].includes(req.user.id)) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Not authorised' })
    }

    const actorRole = offer.buyer_id === req.user.id ? 'buyer' : 'seller'
    if (!['pending', 'countered'].includes(offer.status)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Offer cannot be countered in its current state' })
    }
    if (offer.current_offer_by === actorRole) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Wait for the other party to respond before countering' })
    }

    await client.query(`
      UPDATE offers SET offer_price = COALESCE($1, offer_price),
        settlement_date = COALESCE($2, settlement_date),
        finance_clause = COALESCE($3, finance_clause),
        building_inspection = COALESCE($4, building_inspection),
        conditions = COALESCE($5, conditions),
        status = 'countered', current_offer_by = $6, updated_at = NOW()
      WHERE id = $7
    `, [offer_price || null, settlement_date || null, finance_clause, building_inspection,
        conditions ?? null, actorRole, offer.id])

    await client.query(`
      INSERT INTO offer_history (offer_id, made_by, made_by_role, offer_price, settlement_date,
        finance_clause, building_inspection, conditions, note, action)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'countered')
    `, [offer.id, req.user.id, actorRole, offer_price ?? offer.offer_price, settlement_date || offer.settlement_date,
        finance_clause ?? offer.finance_clause, building_inspection ?? offer.building_inspection,
        conditions ?? offer.conditions, note || null])

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
    if (offerRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Offer not found' })
    }

    const offer = offerRes.rows[0]
    if (![offer.buyer_id, offer.seller_id].includes(req.user.id)) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Not authorised' })
    }

    const actorRole = offer.buyer_id === req.user.id ? 'buyer' : 'seller'
    if (!['pending', 'countered'].includes(offer.status)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Offer cannot be accepted in its current state' })
    }
    if (offer.current_offer_by === actorRole) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'You cannot accept an offer you made' })
    }

    await client.query(
      "UPDATE offers SET status = 'accepted', updated_at = NOW() WHERE id = $1",
      [offer.id]
    )

    await client.query(`
      INSERT INTO offer_history (offer_id, made_by, made_by_role, offer_price, action)
      VALUES ($1, $2, $3, $4, 'accepted')
    `, [offer.id, req.user.id, actorRole, offer.offer_price])

    // Auto-create settlement milestones
    const milestones = [
      { title: 'Offer accepted', description: 'Both parties have agreed on the offer terms', days: 0, order: 1 },
      { title: 'Deposit paid', description: `Buyer pays deposit of $${offer.deposit_amount || 'TBC'}`, days: offer.deposit_due_days || 7, order: 2 },
      { title: 'Finance approved', description: 'Buyer obtains formal finance approval', days: offer.finance_days || 14, order: 3 },
      { title: 'Building & pest inspection', description: 'Inspection carried out and report reviewed', days: offer.building_days || 14, order: 4 },
      { title: 'Contracts exchanged', description: 'Solicitors exchange signed contracts', days: 21, order: 5 },
      { title: 'Settlement', description: 'Final settlement — keys handed over', days: 42, order: 6 },
    ]

    // Steps are counted from today (acceptance). Settlement uses the agreed
    // settlement date when one was set. Previously every step was counted from
    // the settlement date, so deposit/finance appeared due after settlement.
    const acceptedOn = new Date()
    for (const m of milestones) {
      let dueDate = new Date(acceptedOn)
      dueDate.setDate(dueDate.getDate() + m.days)
      if (m.order === 6 && offer.settlement_date) dueDate = new Date(offer.settlement_date)
      await client.query(`
        INSERT INTO settlement_milestones (offer_id, title, description, due_date, sort_order)
        VALUES ($1, $2, $3, $4, $5)
      `, [offer.id, m.title, m.description, `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`, m.order])
    }

    // The home now shows as "Under offer", and the seller's solicitor from the
    // listing review is pre-filled for the handover.
    await client.query(
      "UPDATE listings SET status = 'under_offer' WHERE id = $1 AND status = 'active'",
      [offer.listing_id]
    )
    await client.query(`
      INSERT INTO offer_solicitors (offer_id, side, name, firm, email, phone, licence)
      SELECT $1, 'seller', solicitor_name, solicitor_firm, solicitor_email, solicitor_phone, registration_number
      FROM solicitor_reviews WHERE listing_id = $2 AND status = 'approved'
      ORDER BY created_at DESC LIMIT 1
      ON CONFLICT (offer_id, side) DO NOTHING
    `, [offer.id, offer.listing_id])

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
    if (!['pending', 'countered'].includes(offer.status) || offer.current_offer_by === 'seller') {
      return res.status(400).json({ error: 'Offer cannot be rejected in its current state' })
    }

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
    if (!['pending', 'countered'].includes(offer.status)) {
      return res.status(400).json({ error: 'Offer cannot be withdrawn in its current state' })
    }

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
// ---------- Deal handover: solicitors and settlement checklist ----------
const CHECKLIST_KEYS = new Set(['voi_s', 'voi_b', 'aml', 'disc', 'contract', 'review', 'exchange', 'cooling', 'deposit', 'finance', 'bp', 'pexa', 'settled'])

async function loadPartyOffer(offerId, userId) {
  const result = await pool.query(`
    SELECT o.*, l.title AS listing_title, l.address, l.suburb, l.state, l.postcode,
      b.name AS buyer_name, b.email AS buyer_email, s.name AS seller_name, s.email AS seller_email
    FROM offers o
    JOIN listings l ON l.id = o.listing_id
    JOIN users b ON b.id = o.buyer_id
    JOIN users s ON s.id = o.seller_id
    WHERE o.id = $1
  `, [offerId])
  const offer = result.rows[0]
  if (!offer) return { status: 404, error: 'Offer not found' }
  if (![offer.buyer_id, offer.seller_id].includes(userId)) return { status: 403, error: 'Not authorised' }
  return { offer, side: offer.buyer_id === userId ? 'buyer' : 'seller' }
}

async function dealState(offerId) {
  const [sol, ticks, offer] = await Promise.all([
    pool.query('SELECT side, name, firm, email, phone, licence FROM offer_solicitors WHERE offer_id = $1', [offerId]),
    pool.query(`SELECT c.item_key, c.done_at, u.name AS done_by_name
      FROM offer_checklist c LEFT JOIN users u ON u.id = c.done_by WHERE c.offer_id = $1`, [offerId]),
    pool.query('SELECT handover_at FROM offers WHERE id = $1', [offerId]),
  ])
  return {
    solicitors: Object.fromEntries(sol.rows.map(r => [r.side, r])),
    checklist: Object.fromEntries(ticks.rows.map(r => [r.item_key, { done_at: r.done_at, by: r.done_by_name }])),
    handover_at: offer.rows[0]?.handover_at || null,
  }
}

// GET /api/offers/:id/deal
router.get('/:id/deal', requireAuth, async (req, res) => {
  try {
    const found = await loadPartyOffer(req.params.id, req.user.id)
    if (found.error) return res.status(found.status).json({ error: found.error })
    res.json({ ...(await dealState(req.params.id)), my_side: found.side })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not load the deal details' })
  }
})

// PUT /api/offers/:id/solicitors/:side — each party sets their own solicitor
router.put('/:id/solicitors/:side', requireAuth, async (req, res) => {
  const side = req.params.side
  const { name, firm, email, phone, licence } = req.body || {}
  if (!['seller', 'buyer'].includes(side)) return res.status(400).json({ error: 'Unknown side' })
  if (!String(name || '').trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '').trim())) {
    return res.status(400).json({ error: "Add your solicitor's name and a valid email." })
  }
  try {
    const found = await loadPartyOffer(req.params.id, req.user.id)
    if (found.error) return res.status(found.status).json({ error: found.error })
    if (found.side !== side) return res.status(403).json({ error: 'You can only set your own solicitor.' })
    if (found.offer.status !== 'accepted') return res.status(400).json({ error: 'Solicitors are added once an offer is accepted.' })
    await pool.query(`
      INSERT INTO offer_solicitors (offer_id, side, name, firm, email, phone, licence, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (offer_id, side) DO UPDATE SET name = EXCLUDED.name, firm = EXCLUDED.firm,
        email = EXCLUDED.email, phone = EXCLUDED.phone, licence = EXCLUDED.licence, updated_at = NOW()
    `, [req.params.id, side, String(name).trim(), String(firm || '').trim() || null, String(email).trim(),
      String(phone || '').trim() || null, String(licence || '').trim() || null])
    const other = side === 'buyer' ? found.offer.seller_id : found.offer.buyer_id
    await notify(other, { type: 'offer', title: `The ${side} added their solicitor`, body: found.offer.listing_title, link: '/offers' })
    res.json(await dealState(req.params.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not save the solicitor' })
  }
})

// PUT /api/offers/:id/checklist/:key { done }
router.put('/:id/checklist/:key', requireAuth, async (req, res) => {
  const key = req.params.key
  if (!CHECKLIST_KEYS.has(key)) return res.status(400).json({ error: 'Unknown checklist item' })
  try {
    const found = await loadPartyOffer(req.params.id, req.user.id)
    if (found.error) return res.status(found.status).json({ error: found.error })
    if (found.offer.status !== 'accepted') return res.status(400).json({ error: 'The checklist starts once an offer is accepted.' })
    if (req.body?.done) {
      await pool.query(`INSERT INTO offer_checklist (offer_id, item_key, done_by) VALUES ($1, $2, $3)
        ON CONFLICT (offer_id, item_key) DO NOTHING`, [req.params.id, key, req.user.id])
    } else {
      await pool.query('DELETE FROM offer_checklist WHERE offer_id = $1 AND item_key = $2', [req.params.id, key])
    }
    if (key === 'settled' && req.body?.done) {
      await pool.query("UPDATE listings SET status = 'sold' WHERE id = $1 AND status IN ('active', 'under_offer')", [found.offer.listing_id])
    }
    res.json(await dealState(req.params.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not update the checklist' })
  }
})

// POST /api/offers/:id/handover — email the agreed deal to both solicitors
router.post('/:id/handover', requireAuth, async (req, res) => {
  try {
    const found = await loadPartyOffer(req.params.id, req.user.id)
    if (found.error) return res.status(found.status).json({ error: found.error })
    const o = found.offer
    if (o.status !== 'accepted') return res.status(400).json({ error: 'Only accepted offers can be handed over.' })
    const deal = await dealState(req.params.id)
    if (!deal.solicitors.seller || !deal.solicitors.buyer) {
      return res.status(400).json({ error: 'Both solicitors need to be added first.' })
    }
    const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-AU')
    const fmtSol = x => `${x.name}${x.firm ? ', ' + x.firm : ''} · ${x.email}${x.phone ? ' · ' + x.phone : ''}${x.licence ? ' · Registration: ' + x.licence : ''}`
    const conditions = [
      o.finance_clause ? `Subject to finance (${o.finance_days || 14} days)` : null,
      o.building_inspection ? `Subject to building and pest inspection (${o.building_days || 14} days)` : null,
      o.conditions || null,
    ].filter(Boolean)
    const text = [
      'PRIVATE SALE AGREED ON HOUZEEY: SALES ADVICE', '',
      `Property: ${o.address}, ${o.suburb} ${o.state} ${o.postcode}`,
      `Agreed price: ${money(o.offer_price)}`,
      `Deposit: ${o.deposit_amount ? money(o.deposit_amount) : 'To be agreed'}`,
      `Settlement: ${o.settlement_date ? new Date(o.settlement_date).toLocaleDateString('en-AU') : 'To be agreed'}`,
      `Conditions: ${conditions.length ? conditions.join('; ') : 'None (unconditional)'}`, '',
      `Seller: ${o.seller_name} (${o.seller_email})`,
      `Seller's solicitor/conveyancer: ${fmtSol(deal.solicitors.seller)}`,
      `Buyer: ${o.buyer_name} (${o.buyer_email})`,
      `Buyer's solicitor/conveyancer: ${fmtSol(deal.solicitors.buyer)}`, '',
      'Next steps for the solicitors:',
      '1. Verification of identity (VOI) and AML/CTF checks on your client.',
      `2. Seller's solicitor: prepare the contract of sale and the disclosure required in ${o.state}.`,
      "3. Buyer's solicitor: review the contract and advise the buyer.",
      '4. Exchange contracts, deposit into trust, conditions satisfied, settlement booked.', '',
      'This summary records what the buyer and seller agreed on Houzeey. It is not a contract of sale; nothing is binding until contracts are signed and exchanged.',
    ].join('\n')
    await sendEmail({
      to: [deal.solicitors.seller.email, deal.solicitors.buyer.email].join(', '),
      subject: `Private sale agreed: ${o.address}, ${o.suburb} at ${money(o.offer_price)}`,
      text,
      html: '<div style="font-family:Arial,sans-serif;max-width:620px;white-space:pre-wrap">' +
        text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]) + '</div>',
    })
    await pool.query('UPDATE offers SET handover_at = NOW() WHERE id = $1', [o.id])
    await notify(found.side === 'buyer' ? o.seller_id : o.buyer_id, {
      type: 'offer', title: 'Deal sent to both solicitors', body: o.listing_title, link: '/offers',
    })
    res.json(await dealState(req.params.id))
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Could not email the solicitors. Check the email settings and try again.' })
  }
})

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
