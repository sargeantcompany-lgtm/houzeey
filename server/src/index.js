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
import reviewRoutes from './routes/reviews.js'
import identityRoutes from './routes/identity.js'
import inspectionRoutes from './routes/inspections.js'
import offerRoutes from './routes/offers.js'
import settlementRoutes from './routes/settlement.js'
import applicationRoutes from './routes/applications.js'
import adminRoutes from './routes/admin.js'
import marketingRoutes from './routes/marketing.js'

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
      is_admin BOOLEAN DEFAULT FALSE,
      trust_score INTEGER DEFAULT 0,
      phone VARCHAR(50),
      bio TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  // Add columns if they don't exist yet (safe for existing DBs)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;`)

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
      url TEXT,
      data TEXT,
      mimetype VARCHAR(50),
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)
  await pool.query(`ALTER TABLE listing_images ADD COLUMN IF NOT EXISTS data TEXT;`)
  await pool.query(`ALTER TABLE listing_images ADD COLUMN IF NOT EXISTS mimetype VARCHAR(50);`)

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

  // Identity verification
  await pool.query(`
    CREATE TABLE IF NOT EXISTS identity_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      document_type VARCHAR(50),
      document_url TEXT,
      selfie_url TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  // Reviews
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  // Inspection slots + bookings
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inspection_slots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
      datetime TIMESTAMPTZ NOT NULL,
      is_booked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inspections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slot_id UUID REFERENCES inspection_slots(id),
      listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
      owner_id UUID REFERENCES users(id),
      booker_id UUID REFERENCES users(id),
      datetime TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) DEFAULT 'confirmed',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  // Offers
  await pool.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
      buyer_id UUID REFERENCES users(id),
      seller_id UUID REFERENCES users(id),
      agent_id UUID REFERENCES users(id),
      offer_price NUMERIC(12,2) NOT NULL,
      settlement_date DATE,
      finance_clause BOOLEAN DEFAULT FALSE,
      finance_days INTEGER,
      building_inspection BOOLEAN DEFAULT FALSE,
      building_days INTEGER,
      deposit_amount NUMERIC(12,2),
      deposit_due_days INTEGER DEFAULT 7,
      inclusions TEXT,
      exclusions TEXT,
      conditions TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      current_offer_by VARCHAR(10) DEFAULT 'buyer',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS offer_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
      made_by UUID REFERENCES users(id),
      made_by_role VARCHAR(10),
      offer_price NUMERIC(12,2),
      settlement_date DATE,
      finance_clause BOOLEAN,
      building_inspection BOOLEAN,
      conditions TEXT,
      note TEXT,
      action VARCHAR(20),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  // Settlement milestones
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settlement_milestones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      due_date DATE,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      completed_by UUID REFERENCES users(id),
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  // Rental applications
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rental_applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
      tenant_id UUID REFERENCES users(id),
      landlord_id UUID REFERENCES users(id),
      employer_name VARCHAR(255),
      employer_contact VARCHAR(255),
      employment_type VARCHAR(50),
      annual_income NUMERIC(12,2),
      reference1_name VARCHAR(255),
      reference1_phone VARCHAR(50),
      reference1_relation VARCHAR(100),
      reference2_name VARCHAR(255),
      reference2_phone VARCHAR(50),
      reference2_relation VARCHAR(100),
      id_document_url TEXT,
      current_address TEXT,
      current_rent NUMERIC(10,2),
      rental_history TEXT,
      num_occupants INTEGER DEFAULT 1,
      pets BOOLEAN DEFAULT FALSE,
      pet_description TEXT,
      message TEXT,
      move_in_date DATE,
      status VARCHAR(20) DEFAULT 'pending',
      landlord_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  // Marketing contacts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      phone VARCHAR(50),
      type VARCHAR(50) DEFAULT 'general',
      source VARCHAR(100),
      subscribed BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  // Email / SMS campaigns
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      subject VARCHAR(500) NOT NULL,
      body TEXT NOT NULL,
      type VARCHAR(20) DEFAULT 'email',
      filter_type VARCHAR(50) DEFAULT 'all',
      status VARCHAR(20) DEFAULT 'draft',
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      created_by UUID REFERENCES users(id),
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`)

  console.log('Database tables ready')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const uploadDir = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads')
app.use('/uploads', express.static(uploadDir))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/conversations', messageRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/users', userRoutes)
app.use('/api/saved', savedRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/identity', identityRoutes)
app.use('/api/inspections', inspectionRoutes)
app.use('/api/offers', offerRoutes)
app.use('/api/settlement', settlementRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/marketing', marketingRoutes)

// Serve images from DB
app.get('/api/images/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT data, mimetype FROM listing_images WHERE id = $1', [req.params.id])
    if (result.rows.length === 0 || !result.rows[0].data) return res.status(404).end()
    const { data, mimetype } = result.rows[0]
    res.setHeader('Content-Type', mimetype || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000')
    res.send(Buffer.from(data, 'base64'))
  } catch {
    res.status(500).end()
  }
})

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'houzeey-api' }))
app.use((_, res) => res.status(404).json({ error: 'Not found' }))
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
