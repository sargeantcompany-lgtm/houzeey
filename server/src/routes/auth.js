import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )
}

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['buyer', 'renter', 'seller', 'landlord']).withMessage('Invalid role'),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg })
  }

  const { name, email, password, role } = req.body

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists' })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, verified, created_at',
      [name, email, password_hash, role]
    )

    const user = result.rows[0]
    res.status(201).json({ token: makeToken(user), user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid email or password' })
  }

  const { email, password } = req.body

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, password_hash, verified, avatar_url FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const { password_hash, ...safeUser } = user
    res.json({ token: makeToken(safeUser), user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, verified, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

export default router
