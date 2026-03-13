import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import listingRoutes from './routes/listings.js'
import messageRoutes from './routes/messages.js'
import paymentRoutes from './routes/payments.js'
import userRoutes from './routes/users.js'
import savedRoutes from './routes/saved.js'

dotenv.config()

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

app.listen(PORT, () => {
  console.log(`Houzeey API running on port ${PORT}`)
})
