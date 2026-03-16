import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import './Auth.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.auth.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span style={{ fontSize: '2rem' }}>🏠</span>
          <span className="auth-brand">houzeey</span>
        </div>

        {sent ? (
          <div className="auth-success-state">
            <div className="auth-success-icon">📧</div>
            <h2>Check your email</h2>
            <p>If <strong>{email}</strong> has an account, we've sent a password reset link. Check your inbox (and spam folder).</p>
            <Link to="/login" className="auth-btn" style={{ marginTop: 16 }}>Back to login</Link>
          </div>
        ) : (
          <>
            <h1>Forgot password?</h1>
            <p className="auth-sub">Enter your email and we'll send you a reset link.</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="auth-footer-link"><Link to="/login">← Back to login</Link></p>
          </>
        )}
      </div>
    </div>
  )
}
