import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import './SolicitorReview.css'

function formatPrice(review) {
  if (review.price_display === 'contact') return 'Contact for price'
  if (review.price == null) return 'Price on request'
  if (review.price_display === 'range' && review.price_max) {
    return `$${Number(review.price).toLocaleString('en-AU')} – $${Number(review.price_max).toLocaleString('en-AU')}`
  }
  return `$${Number(review.price).toLocaleString('en-AU')}`
}

export default function SolicitorReview() {
  const { token } = useParams()
  const [review, setReview] = useState(null)
  const [form, setForm] = useState({ reviewer_name: '', registration_number: '', attestation: false, notes: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    api.solicitorReviews.get(token)
      .then(data => {
        setReview(data)
        setForm(current => ({
          ...current,
          reviewer_name: data.solicitor_name || '',
          registration_number: data.registration_number || '',
        }))
      })
      .catch(requestError => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [token])

  async function submitReview(decision) {
    setError('')
    if (decision === 'approved' && !form.attestation) {
      setError('Please confirm that you reviewed the property information before approving.')
      return
    }
    if (decision === 'changes_requested' && !form.notes.trim()) {
      setError('Add a note describing the changes required.')
      return
    }

    setSubmitting(true)
    try {
      const response = await api.solicitorReviews.submit(token, { ...form, decision })
      setResult(response)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="solicitor-review-page"><p className="solicitor-review-state">Loading review request…</p></main>
  if (error && !review) return <main className="solicitor-review-page"><div className="solicitor-review-card"><span className="solicitor-review-kicker">Houzeey · Legal review</span><h1>Review link unavailable</h1><p>{error}</p></div></main>

  return (
    <main className="solicitor-review-page">
      <div className="solicitor-review-wrap">
        <div className="solicitor-review-brand"><span className="solicitor-mark">H</span><span>Houzeey <small>Private property marketplace</small></span></div>
        {result ? (
          <section className="solicitor-review-card solicitor-review-result">
            <span className="solicitor-review-success">✓</span>
            <span className="solicitor-review-kicker">Review recorded</span>
            <h1>{result.status === 'approved' ? 'Thank you for reviewing the listing.' : 'Changes requested.'}</h1>
            <p>{result.message}</p>
            <small>The secure review link is now closed. The seller can see the updated status in their Houzeey dashboard.</small>
          </section>
        ) : (
          <>
            <section className="solicitor-review-intro">
              <span className="solicitor-review-kicker">Review request · Expires {new Date(review.expires_at).toLocaleDateString('en-AU')}</span>
              <h1>Please review these property details.</h1>
              <p>{review.seller_name} has asked you to review the information for this private sale listing before it is published.</p>
            </section>

            <section className="solicitor-review-card">
              <div className="solicitor-property-heading">
                <div>
                  <span className="solicitor-property-label">Property for sale by owner</span>
                  <h2>{review.title}</h2>
                  <p>{review.address}, {review.suburb} {review.state} {review.postcode}</p>
                </div>
                <strong>{formatPrice(review)}</strong>
              </div>
              <div className="solicitor-property-stats">
                {review.property_type && <span><b>Type</b>{review.property_type}</span>}
                {review.beds != null && <span><b>Bedrooms</b>{review.beds}</span>}
                {review.baths != null && <span><b>Bathrooms</b>{review.baths}</span>}
                {review.cars != null && <span><b>Parking</b>{review.cars}</span>}
                {review.land_size != null && <span><b>Land</b>{Number(review.land_size).toLocaleString()} m²</span>}
              </div>
              <div className="solicitor-description">
                <h3>Seller’s description</h3>
                <p>{review.description || 'No description supplied.'}</p>
              </div>
              <div className="solicitor-review-disclaimer">
                <strong>What this review means</strong>
                <p>Houzeey records your attestation and keeps the listing unpublished until you respond. Professional registration is not independently verified by this link; please provide your current registration details below.</p>
              </div>

              <div className="solicitor-review-form">
                <h2>Your professional details</h2>
                <div className="solicitor-form-grid">
                  <label>Full name<input value={form.reviewer_name} onChange={event => setForm({ ...form, reviewer_name: event.target.value })} required /></label>
                  <label>Registration number<input value={form.registration_number} onChange={event => setForm({ ...form, registration_number: event.target.value })} required /></label>
                </div>
                <label className="solicitor-attest">
                  <input type="checkbox" checked={form.attestation} onChange={event => setForm({ ...form, attestation: event.target.checked })} />
                  <span>I have reviewed the listing details with my client and checked them against the supporting information available to me.</span>
                </label>
                <label className="solicitor-note-label">
                  Review note
                  <textarea rows="3" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Required if requesting changes. Do not include confidential legal advice." />
                </label>
                {error && <p className="solicitor-review-error" role="alert">{error}</p>}
                <div className="solicitor-review-actions">
                  <button type="button" className="solicitor-request-changes" disabled={submitting} onClick={() => submitReview('changes_requested')}>Request changes</button>
                  <button type="button" className="solicitor-approve" disabled={submitting} onClick={() => submitReview('approved')}>{submitting ? 'Submitting…' : 'Attest and publish listing'}</button>
                </div>
              </div>
            </section>
          </>
        )}
        <p className="solicitor-review-footnote">This service records information supplied by users and their nominated legal representative. It is not legal advice and does not guarantee title, ownership or the accuracy of source documents.</p>
      </div>
    </main>
  )
}
