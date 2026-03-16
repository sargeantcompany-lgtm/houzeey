import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/settlement/:offerId — get milestones for an accepted offer
router.get('/:offerId', requireAuth, async (req, res) => {
  try {
    const offer = await pool.query('SELECT buyer_id, seller_id FROM offers WHERE id = $1', [req.params.offerId])
    if (offer.rows.length === 0) return res.status(404).json({ error: 'Offer not found' })

    const o = offer.rows[0]
    if (o.buyer_id !== req.user.id && o.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' })
    }

    const milestones = await pool.query(`
      SELECT sm.*, u.name AS completed_by_name
      FROM settlement_milestones sm
      LEFT JOIN users u ON sm.completed_by = u.id
      WHERE sm.offer_id = $1
      ORDER BY sm.sort_order ASC
    `, [req.params.offerId])

    res.json(milestones.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch milestones' })
  }
})

// PUT /api/settlement/:offerId/milestone/:milestoneId — mark milestone complete/incomplete
router.put('/:offerId/milestone/:milestoneId', requireAuth, async (req, res) => {
  const { completed } = req.body

  try {
    const offer = await pool.query('SELECT buyer_id, seller_id FROM offers WHERE id = $1', [req.params.offerId])
    if (offer.rows.length === 0) return res.status(404).json({ error: 'Offer not found' })

    const o = offer.rows[0]
    if (o.buyer_id !== req.user.id && o.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' })
    }

    const result = await pool.query(`
      UPDATE settlement_milestones SET
        completed = $1,
        completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
        completed_by = CASE WHEN $1 THEN $2 ELSE NULL END
      WHERE id = $3 AND offer_id = $4
      RETURNING *
    `, [completed, req.user.id, req.params.milestoneId, req.params.offerId])

    if (result.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update milestone' })
  }
})

export default router
