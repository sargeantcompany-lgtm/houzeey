import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import './Auth.css'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.auth.resetPassword(token, form.password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.message || 'This reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-error">Invalid reset link. <Link to="/forgot-password">Request a new one</Link></p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span style={{ fontSize: '2rem' }}>🏠</span>
          <span className="auth-brand">houzeey</span>
        </div>

        {done ? (
          <div className="auth-success-state">
            <div className="auth-success-icon">✓</div>
            <h2>Password updated</h2>
            <p>Your password has been changed. Redirecting to login…</p>
          </div>
        ) : (
          <>
            <h1>Set new password</h1>
            <p className="auth-sub">Choose a strong password for your account.</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                New password
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  autoFocus
                  placeholder="At least 8 characters"
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  required
                />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
