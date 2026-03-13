import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'
import authRoutes from './routes/auth.js'
import listingRoutes from './routes/listings.js'
import messageRoutes from './routes/messages.js'
import paymentRoutes from './routes/payments.js'
import userRoutes from './routes/users.js'
import savedRoutes from './routes/saved.js'

dotenv.config()

async function initDb() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'buyer',
      verified BOOLEAN DEFAULT FALSE,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      property_type VARCHAR(50),
      title VARCHAR(255),
      address TEXT,
      suburb VARCHAR(100),
      state VARCHAR(50),
      postcode VARCHAR(10),
      beds INTEGER,
      baths INTEGER,
      cars INTEGER,
      land_size INTEGER,
      description TEXT,
      price NUMERIC(12,2),
      price_display VARCHAR(20) DEFAULT 'exact',
      price_max NUMERIC(12,2),
      status VARCHAR(20) DEFAULT 'active',
      views INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listing_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, user_id)
    );`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES users(id),
      landlord_id UUID REFERENCES users(id),
      listing_id UUID REFERENCES listings(id),
      monthly_amount NUMERIC(10,2),
      due_day INTEGER DEFAULT 1,
      start_date DATE,
      end_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lease_id UUID REFERENCES leases(id),
      user_id UUID REFERENCES users(id),
      listing_id UUID REFERENCES listings(id),
      amount NUMERIC(10,2) NOT NULL,
      method VARCHAR(50) DEFAULT 'card',
      status VARCHAR(20) DEFAULT 'paid',
      receipt_id VARCHAR(50),
      due_date DATE,
      paid_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_listings (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, listing_id)
    );`)
  console.log('Database tables ready')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// CORS — allow the React frontend
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded images as static files
const uploadDir = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads')
app.use('/uploads', express.static(uploadDir))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/conversations', messageRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/users', userRoutes)
app.use('/api/saved', savedRoutes)

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'houzeey-api' }))

// 404 handler
app.use((_, res) => res.status(404).json({ error: 'Not found' }))

// Error handler
app.use((err, _, res, __) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Houzeey API running on port ${PORT}`)
    })
  })
  .catch(err => {
    console.error('Failed to initialise database:', err)
    process.exit(1)
  })
