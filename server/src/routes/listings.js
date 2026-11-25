import { Router } from 'express'
import crypto from 'crypto'
import { body, validationResult } from 'express-validator'
import pool from '../db.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { saveImage } from '../services/imageStorage.js'
import { createPlaybackUrls, isBucketConfigured } from '../services/videoStorage.js'
import { sendEmail } from '../email.js'

const router = Router()

// Features a seller can tick on the listing form (shown as a tick list on the property page).
const LISTING_FEATURES = new Set([
  'Air conditioning', 'Built-in wardrobes', 'Dishwasher', 'Solar panels', 'Swimming pool',
  'Garden', 'Balcony', 'Study', 'Ensuite', 'Waterfront',
])
function parseFeatures(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',')
  return [...new Set(list.map(v => String(v).trim()).filter(v => LISTING_FEATURES.has(v)))]
}

function buildImageUrl(req, imageId) {
  return `${req.protocol}://${req.get('host')}/api/images/${imageId}`
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function parseIntegerQuery(value, fallback, max) {
  if (value === undefined || value === '') return { value: fallback, valid: true }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return { value: fallback, valid: false }
  const parsed = Number(value)
  return { value: parsed, valid: Number.isSafeInteger(parsed) && parsed <= max }
}

function parsePriceQuery(value) {
  if (value === undefined || value === '') return { value: null, valid: true }
  if (typeof value !== 'string' || !/^\d+(\.\d{1,2})?$/.test(value)) return { value: null, valid: false }
  const parsed = Number(value)
  return { value: parsed, valid: Number.isFinite(parsed) && parsed <= 999999999999 }
}

// GET /api/listings — browse with filters
router.get('/', optionalAuth, async (req, res) => {
  const { type, suburb, state, beds, min_price, max_price, property_type, sort, limit, offset } = req.query
  const bedFilter = parseIntegerQuery(beds, null, 100)
  const bathFilter = parseIntegerQuery(req.query.baths, null, 100)
  const carFilter = parseIntegerQuery(req.query.cars, null, 100)
  const minLandFilter = parseIntegerQuery(req.query.min_land_size, null, 2147483647)
  const maxLandFilter = parseIntegerQuery(req.query.max_land_size, null, 2147483647)
  const limitFilter = parseIntegerQuery(limit, 20, 60)
  const offsetFilter = parseIntegerQuery(offset, 0, 1000000)
  const minPriceFilter = parsePriceQuery(min_price)
  const maxPriceFilter = parsePriceQuery(max_price)

  if (
    !bedFilter.valid || !bathFilter.valid || !carFilter.valid ||
    !minLandFilter.valid || !maxLandFilter.valid ||
    !limitFilter.valid || limitFilter.value < 1 || !offsetFilter.valid ||
    !minPriceFilter.valid || !maxPriceFilter.valid
  ) {
    return res.status(400).json({ error: 'Search filters must use valid non-negative values.' })
  }
  if (minPriceFilter.value != null && maxPriceFilter.value != null && minPriceFilter.value > maxPriceFilter.value) {
    return res.status(400).json({ error: 'Minimum price cannot exceed maximum price.' })
  }
  if (minLandFilter.value != null && maxLandFilter.value != null && minLandFilter.value > maxLandFilter.value) {
    return res.status(400).json({ error: 'Minimum land size cannot exceed maximum land size.' })
  }

  const conditions = ["l.status IN ('active', 'under_offer')", "l.type = 'sale'", "u.role IN ('buyer', 'seller')", "u.verified = TRUE", "sr.status = 'approved'"]
  const params = []
  let p = 1

  if (type && type !== 'sale') conditions.push('1 = 0')
  if (suburb) {
    conditions.push(`(l.suburb ILIKE $${p} OR l.postcode ILIKE $${p})`)
    params.push(`%${suburb}%`)
    p++
  }
  if (state) { conditions.push(`l.state = $${p++}`); params.push(state) }
  if (bedFilter.value != null) { conditions.push(`l.beds >= $${p++}`); params.push(bedFilter.value) }
  if (bathFilter.value != null) { conditions.push(`l.baths >= $${p++}`); params.push(bathFilter.value) }
  if (carFilter.value != null) { conditions.push(`l.cars >= $${p++}`); params.push(carFilter.value) }
  if (minLandFilter.value != null) { conditions.push(`l.land_size >= $${p++}`); params.push(minLandFilter.value) }
  if (maxLandFilter.value != null) { conditions.push(`l.land_size <= $${p++}`); params.push(maxLandFilter.value) }
  if (minPriceFilter.value != null) { conditions.push(`l.price >= $${p++}`); params.push(minPriceFilter.value) }
  if (maxPriceFilter.value != null) { conditions.push(`l.price <= $${p++}`); params.push(maxPriceFilter.value) }
  if (property_type) { conditions.push(`l.property_type = $${p++}`); params.push(property_type) }

  const orderMap = {
    'price_asc': 'l.price ASC',
    'price_desc': 'l.price DESC',
    'newest': 'l.created_at DESC',
  }
  const orderBy = orderMap[sort] || 'l.created_at DESC'

  const where = conditions.join(' AND ')

  try {
    const result = await pool.query(`
      SELECT
        l.*,
        u.name AS seller_name,
        u.verified AS seller_verified,
        sr.status AS solicitor_review_status,
        (SELECT url FROM listing_images WHERE listing_id = l.id ORDER BY display_order LIMIT 1) AS primary_image
      FROM listings l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT status FROM solicitor_reviews
        WHERE listing_id = l.id ORDER BY created_at DESC LIMIT 1
      ) sr ON TRUE
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT $${p++} OFFSET $${p++}
    `, [...params, limitFilter.value, offsetFilter.value])

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM listings l
       JOIN users u ON l.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT status FROM solicitor_reviews
         WHERE listing_id = l.id ORDER BY created_at DESC LIMIT 1
       ) sr ON TRUE
       WHERE ${where}`,
      params
    )

    res.json({
      listings: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: limitFilter.value,
      offset: offsetFilter.value,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch listings' })
  }
})

// GET /api/listings/my — current user's listings
router.get('/my', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        l.*,
        sr.status AS solicitor_review_status,
        sr.expires_at AS solicitor_review_expires_at,
        (SELECT url FROM listing_images WHERE listing_id = l.id ORDER BY display_order LIMIT 1) AS primary_image,
        (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.listing_id = l.id) AS enquiries
      FROM listings l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN LATERAL (
        SELECT status, expires_at FROM solicitor_reviews
        WHERE listing_id = l.id ORDER BY created_at DESC LIMIT 1
      ) sr ON TRUE
      WHERE l.user_id = $1 AND l.type = 'sale' AND u.role IN ('buyer', 'seller')
      ORDER BY l.created_at DESC
    `, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch your listings' })
  }
})

// GET /api/listings/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        l.*,
        u.name AS seller_name,
        u.verified AS seller_verified,
        u.avatar_url AS seller_avatar,
        u.created_at AS seller_since,
        sr.status AS solicitor_review_status
      FROM listings l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT status FROM solicitor_reviews
        WHERE listing_id = l.id ORDER BY created_at DESC LIMIT 1
      ) sr ON TRUE
      WHERE l.id = $1 AND l.type = 'sale' AND u.role IN ('buyer', 'seller') AND u.verified = TRUE
        AND (l.user_id = $2 OR (l.status IN ('active', 'under_offer') AND sr.status = 'approved'))
    `, [req.params.id, req.user?.id || null])

    if (result.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })

    const listing = result.rows[0]

    const images = await pool.query(
      'SELECT id, url, display_order FROM listing_images WHERE listing_id = $1 ORDER BY display_order',
      [req.params.id]
    )
    listing.images = images.rows

    // Ready video tour (signed playback URL), if the bucket is configured.
    listing.video = null
    const video = await pool.query(
      "SELECT mp4_key, thumb_key FROM videos WHERE listing_id = $1 AND status = 'ready' ORDER BY created_at DESC LIMIT 1",
      [req.params.id]
    )
    if (video.rowCount && isBucketConfigured()) {
      try {
        const urls = await createPlaybackUrls(video.rows[0].mp4_key, video.rows[0].thumb_key)
        listing.video = { url: urls.videoUrl, thumbnailUrl: urls.thumbnailUrl }
      } catch (error) {
        console.error('Could not sign listing video:', error.message)
      }
    }

    // Increment views
    await pool.query('UPDATE listings SET views = views + 1 WHERE id = $1', [req.params.id])

    res.json(listing)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch listing' })
  }
})

// POST /api/listings — create listing with images
router.post('/', requireAuth, upload.array('images', 20), [
  body('type').equals('sale'),
  body('property_type').isIn(['house', 'apartment', 'townhouse', 'unit', 'land', 'rural']),
  body('title').trim().notEmpty(),
  body('address').trim().notEmpty(),
  body('suburb').trim().notEmpty(),
  body('state').isIn(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
  body('postcode').matches(/^\d{4}$/),
  body('price').isNumeric(),
  body('price_display').optional().isIn(['exact', 'contact', 'range']),
  body('price_max').optional({ values: 'falsy' }).isNumeric(),
  body('solicitor_name').trim().notEmpty(),
  body('solicitor_firm').trim().notEmpty(),
  body('solicitor_email').isEmail().normalizeEmail(),
  body('solicitor_registration_number').trim().notEmpty(),
  body('solicitor_state').isIn(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg })
  }

  const {
    type, property_type, title, address, suburb, state, postcode,
    beds, baths, cars, land_size, description, price, price_display, price_max,
    solicitor_name, solicitor_firm, solicitor_email, solicitor_phone,
    solicitor_registration_number, solicitor_state,
  } = req.body

  if (price_display === 'range' && (!price_max || Number(price_max) <= Number(price))) {
    return res.status(400).json({ error: 'The maximum asking price must be greater than the minimum.' })
  }
  if (price_display !== 'contact' && Number(price) <= 0) {
    return res.status(400).json({ error: 'Enter an asking price or choose Contact for price.' })
  }

  const seller = await pool.query('SELECT role, verified FROM users WHERE id = $1', [req.user.id])
  if (!seller.rowCount) return res.status(401).json({ error: 'Your account could not be found.' })
  if (!['buyer', 'seller'].includes(seller.rows[0].role)) {
    return res.status(403).json({ error: 'Only private buyer or seller accounts can create listings.' })
  }
  if (!seller.rows[0].verified) {
    return res.status(403).json({ error: 'Verify your identity before creating a private sale listing.' })
  }

  const reviewToken = crypto.randomBytes(32).toString('hex')
  const reviewTokenHash = crypto.createHash('sha256').update(reviewToken).digest('hex')
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  let client
  let committed = false
  let listing
  try {
    client = await pool.connect()
    await client.query('BEGIN')

    const result = await client.query(`
      INSERT INTO listings
        (user_id, type, property_type, title, address, suburb, state, postcode,
         beds, baths, cars, land_size, description, price, price_display, price_max, features, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending_review')
      RETURNING *
    `, [
      req.user.id, type, property_type, title, address, suburb, state, postcode,
      beds || null, baths || null, cars || null, land_size || null,
      description, price, price_display || 'exact', price_max || null, parseFeatures(req.body.features),
    ])

    listing = result.rows[0]

    await client.query(`
      INSERT INTO solicitor_reviews
        (listing_id, solicitor_name, solicitor_firm, solicitor_email, solicitor_phone,
         registration_number, registration_state, token_hash, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      listing.id, solicitor_name.trim(), solicitor_firm.trim(), solicitor_email,
      String(solicitor_phone || '').trim() || null, solicitor_registration_number.trim(),
      solicitor_state, reviewTokenHash, expiresAt,
    ])

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i]
        const imageId = await saveImage(client, {
          listingId: listing.id, buffer: file.buffer, mimetype: file.mimetype, order: i,
        })
        await client.query('UPDATE listing_images SET url = $1 WHERE id = $2', [buildImageUrl(req, imageId), imageId])
      }
    }

    await client.query('COMMIT')
    committed = true
  } catch (err) {
    if (client && !committed) await client.query('ROLLBACK')
    console.error(err)
    return res.status(500).json({ error: 'Failed to create listing' })
  } finally {
    if (client) client.release()
  }

  const reviewUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/solicitor-review/${reviewToken}`
  const safeSolicitorName = escapeHtml(solicitor_name)
  const safeTitle = escapeHtml(title)
  const safeSuburb = escapeHtml(suburb)
  const safeState = escapeHtml(state)
  const safePostcode = escapeHtml(postcode)
  try {
    await sendEmail({
      to: solicitor_email,
      subject: 'Houzeey: review requested for a private property listing',
      text: `Hello ${solicitor_name},\n\n${seller.rows[0].role === 'seller' ? 'A private seller' : 'A Houzeey member'} has asked you to review the property details for ${title} at ${suburb}, ${state} ${postcode}.\n\nReview the details and attest or request corrections here: ${reviewUrl}\n\nThis review link expires in 14 days. Houzeey records your attestation but does not independently verify your professional registration.\n`,
      html: `<p>Hello ${safeSolicitorName},</p><p>A Houzeey member has asked you to review the property details for <strong>${safeTitle}</strong> at ${safeSuburb}, ${safeState} ${safePostcode}.</p><p><a href="${reviewUrl}">Review the listing details</a>. This link expires in 14 days.</p><p>Houzeey records your attestation but does not independently verify your professional registration.</p>`,
    })
  } catch (err) {
    console.error('Solicitor invitation email failed:', err)
    try {
      await pool.query(
        "DELETE FROM listings WHERE id = $1 AND user_id = $2 AND status = 'pending_review'",
        [listing.id, req.user.id]
      )
    } catch (cleanupError) {
      console.error('Could not remove listing after failed solicitor invitation:', cleanupError)
      return res.status(500).json({
        error: 'The solicitor invitation failed and the listing could not be cleaned up. Contact support before retrying.',
      })
    }
    return res.status(502).json({
      error: 'The solicitor invitation could not be sent, so the listing was not submitted. Check the email settings or contact support.',
    })
  }

  res.status(201).json(listing)
})

router.post('/:id/solicitor-review/resend', requireAuth, async (req, res) => {
  const reviewToken = crypto.randomBytes(32).toString('hex')
  const reviewTokenHash = crypto.createHash('sha256').update(reviewToken).digest('hex')
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  let client
  let review
  let listing
  let committed = false
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const result = await client.query(`
      SELECT l.id, l.title, l.suburb, l.state, l.postcode, l.status,
        u.role, u.verified,
        sr.solicitor_name, sr.solicitor_firm, sr.solicitor_email, sr.solicitor_phone,
        sr.registration_number, sr.registration_state, sr.status AS review_status
      FROM listings l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN LATERAL (
        SELECT * FROM solicitor_reviews
        WHERE listing_id = l.id ORDER BY created_at DESC LIMIT 1
      ) sr ON TRUE
      WHERE l.id = $1 AND l.user_id = $2 AND l.type = 'sale'
      FOR UPDATE OF l
    `, [req.params.id, req.user.id])
    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Listing not found.' })
    }

    listing = result.rows[0]
    if (!['buyer', 'seller'].includes(listing.role)) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Only private buyer or seller accounts can manage sale listings.' })
    }
    if (!listing.verified) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Verify your identity before requesting a solicitor review.' })
    }
    if (listing.status !== 'pending_review' || listing.review_status !== 'pending') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'There is no pending solicitor review to resend.' })
    }

    review = result.rows[0]
    await client.query(
      "UPDATE solicitor_reviews SET status = 'superseded' WHERE listing_id = $1 AND status = 'pending'",
      [listing.id]
    )
    await client.query(`
      INSERT INTO solicitor_reviews
        (listing_id, solicitor_name, solicitor_firm, solicitor_email, solicitor_phone,
         registration_number, registration_state, token_hash, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      listing.id, review.solicitor_name, review.solicitor_firm, review.solicitor_email,
      review.solicitor_phone, review.registration_number, review.registration_state,
      reviewTokenHash, expiresAt,
    ])
    await client.query('COMMIT')
    committed = true
  } catch (error) {
    if (client && !committed) await client.query('ROLLBACK')
    console.error(error)
    return res.status(500).json({ error: 'Could not renew the solicitor review link.' })
  } finally {
    if (client) client.release()
  }

  const reviewUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/solicitor-review/${reviewToken}`
  try {
    await sendEmail({
      to: review.solicitor_email,
      subject: 'Houzeey: review requested for a private property listing',
      text: `Hello ${review.solicitor_name},\n\nPlease review the private sale listing for ${listing.title} at ${listing.suburb}, ${listing.state} ${listing.postcode}: ${reviewUrl}\n\nThis review link expires in 14 days. Houzeey records your attestation but does not independently verify your professional registration.\n`,
      html: `<p>Hello ${escapeHtml(review.solicitor_name)},</p><p>Please review the private sale listing for <strong>${escapeHtml(listing.title)}</strong> at ${escapeHtml(listing.suburb)}, ${escapeHtml(listing.state)} ${escapeHtml(listing.postcode)}.</p><p><a href="${reviewUrl}">Review the listing details</a>. This link expires in 14 days.</p><p>Houzeey records your attestation but does not independently verify your professional registration.</p>`,
    })
  } catch (error) {
    console.error('Solicitor review resend failed:', error)
    return res.status(502).json({ error: 'The listing remains private, but the invitation could not be sent. Please retry or contact support.' })
  }

  res.json({ sent: true, expires_at: expiresAt })
})

// PUT /api/listings/:id
router.put('/:id', requireAuth, upload.array('images', 20), async (req, res) => {
  const propertyFields = [
    'type', 'property_type', 'title', 'address', 'suburb', 'state', 'postcode',
    'beds', 'baths', 'cars', 'land_size', 'description', 'price', 'price_display', 'price_max',
  ]
  const propertyChanged = propertyFields.some(field => Object.hasOwn(req.body, field))
  const requestedStatus = req.body.status
  if (requestedStatus && !['active', 'under_offer', 'sold', 'withdrawn'].includes(requestedStatus)) {
    return res.status(400).json({ error: 'Invalid listing status.' })
  }
  if (req.body.type && req.body.type !== 'sale') {
    return res.status(400).json({ error: 'Houzeey only accepts private property sales.' })
  }

  const reviewToken = propertyChanged ? crypto.randomBytes(32).toString('hex') : null
  const reviewTokenHash = reviewToken ? crypto.createHash('sha256').update(reviewToken).digest('hex') : null
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  let reviewInvite
  let updatedListing
  let committed = false
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query(
      'SELECT l.user_id, l.type, l.status, u.role FROM listings l JOIN users u ON u.id = l.user_id WHERE l.id = $1 FOR UPDATE OF l',
      [req.params.id]
    )
    if (!existing.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Listing not found' })
    }
    if (existing.rows[0].user_id !== req.user.id) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Not your listing' })
    }
    if (existing.rows[0].type !== 'sale') {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Only private sale listings are supported.' })
    }
    if (!['buyer', 'seller'].includes(existing.rows[0].role)) {
      await client.query('ROLLBACK')
      return res.status(403).json({ error: 'Only private buyer or seller accounts can manage sale listings.' })
    }
    if (requestedStatus && ['pending_review', 'needs_changes'].includes(existing.rows[0].status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'A solicitor review must be completed before changing this listing status.' })
    }
    if (requestedStatus === 'active' && existing.rows[0].status !== 'active') {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'A sale listing can only be published after its solicitor review is approved.' })
    }
    if (['under_offer', 'sold'].includes(requestedStatus) && !['active', 'under_offer'].includes(existing.rows[0].status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'A listing must be published before it can be marked under offer or sold.' })
    }

    const {
      type, property_type, title, address, suburb, state, postcode,
      beds, baths, cars, land_size, description, price, price_display, price_max,
    } = req.body

    if (propertyChanged) {
      const review = await client.query(`
        SELECT solicitor_name, solicitor_firm, solicitor_email, solicitor_phone,
          registration_number, registration_state
        FROM solicitor_reviews
        WHERE listing_id = $1
        ORDER BY created_at DESC LIMIT 1
      `, [req.params.id])
      if (!review.rowCount) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: 'This listing needs a legal review invitation before its details can be changed.' })
      }
      reviewInvite = review.rows[0]
    }

    const result = await client.query(`
      UPDATE listings SET
        type = COALESCE($1, type),
        property_type = COALESCE($2, property_type),
        title = COALESCE($3, title),
        address = COALESCE($4, address),
        suburb = COALESCE($5, suburb),
        state = COALESCE($6, state),
        postcode = COALESCE($7, postcode),
        beds = COALESCE($8, beds),
        baths = COALESCE($9, baths),
        cars = COALESCE($10, cars),
        land_size = COALESCE($11, land_size),
        description = COALESCE($12, description),
        price = COALESCE($13, price),
        price_display = COALESCE($14, price_display),
        price_max = COALESCE($15, price_max),
        status = CASE WHEN $16::boolean THEN 'pending_review' ELSE COALESCE($17, status) END,
        updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `, [type, property_type, title, address, suburb, state, postcode,
        beds, baths, cars, land_size, description, price, price_display, price_max, propertyChanged, requestedStatus || null,
        req.params.id])

    updatedListing = result.rows[0]

    if (propertyChanged) {
      await client.query(`
        UPDATE solicitor_reviews SET status = 'superseded'
        WHERE listing_id = $1 AND status = 'pending'
      `, [req.params.id])
      await client.query(`
        INSERT INTO solicitor_reviews
          (listing_id, solicitor_name, solicitor_firm, solicitor_email, solicitor_phone,
           registration_number, registration_state, token_hash, expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        req.params.id, reviewInvite.solicitor_name, reviewInvite.solicitor_firm,
        reviewInvite.solicitor_email, reviewInvite.solicitor_phone,
        reviewInvite.registration_number, reviewInvite.registration_state, reviewTokenHash, expiresAt,
      ])
    }

    await client.query('COMMIT')
    committed = true
  } catch (err) {
    if (!committed) await client.query('ROLLBACK')
    console.error(err)
    return res.status(500).json({ error: 'Failed to update listing' })
  } finally {
    client.release()
  }

  if (propertyChanged) {
    const reviewUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/solicitor-review/${reviewToken}`
    try {
      await sendEmail({
        to: reviewInvite.solicitor_email,
        subject: 'Houzeey: updated private listing needs another review',
        text: `Hello ${reviewInvite.solicitor_name},\n\nThe seller has updated the property details for ${updatedListing.title}. Please review the updated information before it is published: ${reviewUrl}\n\nThis review link expires in 14 days. Houzeey records your attestation but does not independently verify professional registration.\n`,
        html: `<p>Hello ${escapeHtml(reviewInvite.solicitor_name)},</p><p>The seller has updated the property details for <strong>${escapeHtml(updatedListing.title)}</strong>. Please review the current information before it is published.</p><p><a href="${reviewUrl}">Review the updated listing</a>. This link expires in 14 days.</p><p>Houzeey records your attestation but does not independently verify professional registration.</p>`,
      })
    } catch (err) {
      console.error('Solicitor re-review email failed:', err)
      return res.status(502).json({ error: 'Your changes are saved but the solicitor re-review email could not be sent. Please contact support.' })
    }
  }

  res.json(updatedListing)
})

// DELETE /api/listings/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT user_id FROM listings WHERE id = $1', [req.params.id])
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })
    if (existing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })

    await pool.query('DELETE FROM listings WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete listing' })
  }
})

export default router
