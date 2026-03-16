import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { body, validationResult } from 'express-validator'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { sendEmail } from '../email.js'

const router = Router()

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, is_admin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )
}

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['buyer', 'renter', 'seller', 'landlord', 'buyer_agent']).withMessage('Invalid role'),
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
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, verified, is_admin, avatar_url, created_at',
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
      'SELECT id, name, email, role, password_hash, verified, avatar_url, is_admin, phone, bio, trust_score FROM users WHERE email = $1',
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
      'SELECT id, name, email, role, verified, avatar_url, is_admin, phone, bio, trust_score, created_at FROM users WHERE id = $1',
      [req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

// PUT /api/auth/me — update own profile
router.put('/me', requireAuth, async (req, res) => {
  const { name, phone, bio } = req.body
  try {
    const result = await pool.query(`
      UPDATE users SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        bio = COALESCE($3, bio)
      WHERE id = $4
      RETURNING id, name, email, role, verified, avatar_url, is_admin, phone, bio, trust_score, created_at
    `, [name || null, phone || null, bio || null, req.user.id])
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both fields are required' })
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' })
  }
  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })

    const hash = await bcrypt.hash(new_password, 12)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id])
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email.toLowerCase().trim()])
    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
    }

    const user = result.rows[0]
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Invalidate old tokens
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1', [user.id])

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    )

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`

    await sendEmail({
      to: user.email,
      subject: 'Reset your Houzeey password',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #1a5c28;">Reset your password</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a password reset. Click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#3bb54a;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0;">Reset Password</a>
          <p style="color:#9ca3af;font-size:0.85rem;">If you didn't request this, you can ignore this email. Your password won't change.</p>
          <p style="color:#9ca3af;font-size:0.85rem;">Or copy this link: ${resetUrl}</p>
        </div>
      `,
    })

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send reset email' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

  try {
    const result = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' })
    }

    const resetToken = result.rows[0]
    const hash = await bcrypt.hash(password, 12)

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, resetToken.user_id])
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetToken.id])

    res.json({ success: true, message: 'Password updated successfully.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

export default router
