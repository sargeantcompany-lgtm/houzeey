import { useState, useEffect } from 'react'
import { api } from '../api'
import './VerifyIdentity.css'

const STATUS_LABELS = { pending: 'Under Review', approved: 'Approved', rejected: 'Rejected' }
const STATUS_COLORS = { pending: 'orange', approved: 'green', rejected: 'red' }

export default function VerifyIdentity() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ document_type: 'passport' })
  const [documentFile, setDocumentFile] = useState(null)
  const [selfieFile, setSelfieFile] = useState(null)

  useEffect(() => {
    api.identity.me()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!documentFile) return setError('Please upload your ID document photo')

    const formData = new FormData()
    formData.append('document_type', form.document_type)
    formData.append('document', documentFile)
    if (selfieFile) formData.append('selfie', selfieFile)

    setSubmitting(true)
    try {
      await api.identity.submit(formData)
      setSuccess(true)
      setStatus({ status: 'pending' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="container"><p className="loading-text">Loading…</p></div>

  return (
    <div className="verify-page">
      <div className="container">
        <div className="verify-card">
          <div className="verify-header">
            <div className="verify-icon">🪪</div>
            <h1>Identity Verification</h1>
            <p>Verify your identity to build trust with buyers, sellers and renters on Houzeey.</p>
          </div>

          {status ? (
            <div className={`verify-status verify-status--${STATUS_COLORS[status.status]}`}>
              <div className="verify-status-icon">
                {status.status === 'approved' ? '✅' : status.status === 'pending' ? '⏳' : '❌'}
              </div>
              <div>
                <strong>{STATUS_LABELS[status.status]}</strong>
                {status.status === 'pending' && <p>We're reviewing your documents. This usually takes 1–2 business days.</p>}
                {status.status === 'approved' && <p>Your identity is verified. You'll show a verified badge on your profile.</p>}
                {status.status === 'rejected' && (
                  <>
                    <p>Your documents were not accepted. {status.notes && `Reason: ${status.notes}`}</p>
                    <p>Please resubmit with clearer documents.</p>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {(!status || status.status === 'rejected') && !success && (
            <form onSubmit={handleSubmit} className="verify-form">
              <h2>Submit Documents</h2>

              <div className="form-group">
                <label>Document Type</label>
                <select value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))}>
                  <option value="passport">Passport</option>
                  <option value="drivers_licence">Driver's Licence</option>
                  <option value="national_id">National ID Card</option>
                  <option value="medicare">Medicare Card</option>
                </select>
              </div>

              <div className="form-group">
                <label>Photo of ID Document *</label>
                <p className="field-hint">Take a clear photo of your document — all four corners visible, no blur.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setDocumentFile(e.target.files[0])}
                  required
                />
                {documentFile && <span className="file-chosen">{documentFile.name}</span>}
              </div>

              <div className="form-group">
                <label>Selfie (optional but recommended)</label>
                <p className="field-hint">A photo of you holding your ID document next to your face.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setSelfieFile(e.target.files[0])}
                />
                {selfieFile && <span className="file-chosen">{selfieFile.name}</span>}
              </div>

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" className="btn-primary btn-full" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit for Verification'}
              </button>

              <p className="verify-privacy">
                🔒 Your documents are stored securely and only reviewed by Houzeey staff. They are never shared with other users.
              </p>
            </form>
          )}

          {success && (
            <div className="verify-success">
              <div className="success-icon">✅</div>
              <h2>Submitted!</h2>
              <p>Your documents have been submitted for review. We'll update your account within 1–2 business days.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
