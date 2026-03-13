import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import pool from '../db.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()

function buildImageUrl(req, filename) {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`
}

// GET /api/listings — browse with filters
router.get('/', optionalAuth, async (req, res) => {
  const { type, suburb, state, beds, min_price, max_price, property_type, sort, limit = 20, offset = 0 } = req.query

  const conditions = ["l.status = 'active'"]
  const params = []
  let p = 1

  if (type) { conditions.push(`l.type = $${p++}`); params.push(type) }
  if (suburb) { conditions.push(`l.suburb ILIKE $${p++}`); params.push(`%${suburb}%`) }
  if (state) { conditions.push(`l.state = $${p++}`); params.push(state) }
  if (beds) { conditions.push(`l.beds >= $${p++}`); params.push(parseInt(beds)) }
  if (min_price) { conditions.push(`l.price >= $${p++}`); params.push(parseFloat(min_price)) }
  if (max_price) { conditions.push(`l.price <= $${p++}`); params.push(parseFloat(max_price)) }
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
        (SELECT url FROM listing_images WHERE listing_id = l.id ORDER BY display_order LIMIT 1) AS primary_image
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT $${p++} OFFSET $${p++}
    `, [...params, parseInt(limit), parseInt(offset)])

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM listings l WHERE ${where}`,
      params
    )

    res.json({
      listings: result.rows,
      total: parseInt(countResult.rows[0].count),
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
        (SELECT url FROM listing_images WHERE listing_id = l.id ORDER BY display_order LIMIT 1) AS primary_image,
        (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.listing_id = l.id) AS enquiries
      FROM listings l
      WHERE l.user_id = $1
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
        u.created_at AS seller_since
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1
    `, [req.params.id])

    if (result.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })

    const listing = result.rows[0]

    const images = await pool.query(
      'SELECT id, url, display_order FROM listing_images WHERE listing_id = $1 ORDER BY display_order',
      [req.params.id]
    )
    listing.images = images.rows

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
  body('type').isIn(['sale', 'rent']),
  body('price').isNumeric(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg })
  }

  const {
    type, property_type, title, address, suburb, state, postcode,
    beds, baths, cars, land_size, description, price, price_display, price_max,
  } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(`
      INSERT INTO listings
        (user_id, type, property_type, title, address, suburb, state, postcode,
         beds, baths, cars, land_size, description, price, price_display, price_max)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *
    `, [
      req.user.id, type, property_type, title, address, suburb, state, postcode,
      beds || null, baths || null, cars || null, land_size || null,
      description, price, price_display || 'exact', price_max || null,
    ])

    const listing = result.rows[0]

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const url = buildImageUrl(req, req.files[i].filename)
        await client.query(
          'INSERT INTO listing_images (listing_id, url, display_order) VALUES ($1, $2, $3)',
          [listing.id, url, i]
        )
      }
    }

    await client.query('COMMIT')
    res.status(201).json(listing)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Failed to create listing' })
  } finally {
    client.release()
  }
})

// PUT /api/listings/:id
router.put('/:id', requireAuth, upload.array('images', 20), async (req, res) => {
  try {
    const existing = await pool.query('SELECT user_id FROM listings WHERE id = $1', [req.params.id])
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Listing not found' })
    if (existing.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Not your listing' })

    const {
      type, property_type, title, address, suburb, state, postcode,
      beds, baths, cars, land_size, description, price, price_display, price_max, status,
    } = req.body

    const result = await pool.query(`
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
        status = COALESCE($16, status),
        updated_at = NOW()
      WHERE id = $17
      RETURNING *
    `, [type, property_type, title, address, suburb, state, postcode,
        beds, baths, cars, land_size, description, price, price_display, price_max, status,
        req.params.id])

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update listing' })
  }
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
