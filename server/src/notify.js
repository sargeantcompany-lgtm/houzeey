import pool from './db.js'

/**
 * Create an in-app notification for a user.
 * type: 'offer' | 'application' | 'inspection' | 'message' | 'review' | 'verification' | 'system'
 */
export async function notify(userId, { type = 'system', title, body, link = null }) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)',
      [userId, type, title, body, link]
    )
  } catch (err) {
    console.error('Failed to create notification:', err.message)
  }
}
