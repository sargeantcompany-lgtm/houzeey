import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()

function buildUrl(req, filename) {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`
}

// GET /api/identity/me — get my verification status
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM identity_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch verification status' })
  }
})

// POST /api/identity — submit ID documents
router.post('/', requireAuth, upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]), async (req, res) => {
  const { document_type } = req.body

  if (!document_type) {
    return res.status(400).json({ error: 'document_type is required' })
  }

  const documentFile = req.files?.document?.[0]
  const selfieFile = req.files?.selfie?.[0]

  if (!documentFile) {
    return res.status(400).json({ error: 'ID document photo is required' })
  }

  try {
    // Check for existing pending/approved submission
    const existing = await pool.query(
      "SELECT id, status FROM identity_verifications WHERE user_id = $1 AND status IN ('pending', 'approved') ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    )

    if (existing.rows.length > 0 && existing.rows[0].status === 'approved') {
      return res.status(409).json({ error: 'Your identity is already verified' })
    }

    const documentUrl = buildUrl(req, documentFile.filename)
    const selfieUrl = selfieFile ? buildUrl(req, selfieFile.filename) : null

    const result = await pool.query(`
      INSERT INTO identity_verifications (user_id, document_type, document_url, selfie_url, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `, [req.user.id, document_type, documentUrl, selfieUrl])

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to submit verification' })
  }
})

export default router
