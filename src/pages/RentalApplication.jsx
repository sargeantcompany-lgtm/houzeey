import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getSession } from '../auth'
import './RentalApplication.css'

export default function RentalApplication() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const session = getSession()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    employer_name: '', employer_contact: '', employment_type: 'full-time', annual_income: '',
    reference1_name: '', reference1_phone: '', reference1_relation: '',
    reference2_name: '', reference2_phone: '', reference2_relation: '',
    current_address: '', current_rent: '', rental_history: '',
    num_occupants: 1, pets: false, pet_description: '', message: '', move_in_date: '',
  })
  const [idDocument, setIdDocument] = useState(null)

  useEffect(() => {
    api.listings.get(listingId)
      .then(setListing)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [listingId])

  function set(field) {
    return e => setForm(f => ({
      ...f,
      [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const formData = new FormData()
    formData.append('listing_id', listingId)
    Object.entries(form).forEach(([k, v]) => formData.append(k, v))
    if (idDocument) formData.append('id_document', idDocument)

    try {
      await api.applications.submit(formData)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="container"><p className="loading-text">Loading…</p></div>
  if (!listing) return <div className="container"><p>Listing not found.</p></div>

  if (submitted) {
    return (
      <div className="rental-app-page">
        <div className="container">
          <div className="app-success">
            <div className="success-icon">✅</div>
            <h1>Application Submitted!</h1>
            <p>Your rental application for <strong>{listing.title}</strong> has been sent to the landlord. They'll review it and get back to you.</p>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rental-app-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(`/listing/${listingId}`)}>← Back to listing</button>

        <div className="app-header">
          <h1>Rental Application</h1>
          <div className="app-listing-info">
            <strong>{listing.title}</strong>
            <span>{listing.address}, {listing.suburb} {listing.state}</span>
            <span className="app-price">${Number(listing.price).toLocaleString('en-AU')}/wk</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="app-form">

          {/* Employment */}
          <div className="app-section">
            <h2>Employment</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Employer / Company Name *</label>
                <input type="text" value={form.employer_name} onChange={set('employer_name')} required />
              </div>
              <div className="form-group">
                <label>Employer Contact / HR</label>
                <input type="text" value={form.employer_contact} onChange={set('employer_contact')} placeholder="Phone or email" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Employment Type *</label>
                <select value={form.employment_type} onChange={set('employment_type')}>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="casual">Casual</option>
                  <option value="self-employed">Self-employed</option>
                  <option value="unemployed">Unemployed / Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Annual Income (AUD)</label>
                <input type="number" value={form.annual_income} onChange={set('annual_income')} placeholder="e.g. 75000" />
              </div>
            </div>
          </div>

          {/* References */}
          <div className="app-section">
            <h2>References</h2>
            <div className="ref-grid">
              <div>
                <h3>Reference 1</h3>
                <div className="form-group"><label>Name</label><input type="text" value={form.reference1_name} onChange={set('reference1_name')} /></div>
                <div className="form-group"><label>Phone</label><input type="tel" value={form.reference1_phone} onChange={set('reference1_phone')} /></div>
                <div className="form-group"><label>Relationship</label><input type="text" value={form.reference1_relation} onChange={set('reference1_relation')} placeholder="e.g. Previous landlord" /></div>
              </div>
              <div>
                <h3>Reference 2</h3>
                <div className="form-group"><label>Name</label><input type="text" value={form.reference2_name} onChange={set('reference2_name')} /></div>
                <div className="form-group"><label>Phone</label><input type="tel" value={form.reference2_phone} onChange={set('reference2_phone')} /></div>
                <div className="form-group"><label>Relationship</label><input type="text" value={form.reference2_relation} onChange={set('reference2_relation')} placeholder="e.g. Employer" /></div>
              </div>
            </div>
          </div>

          {/* Rental history */}
          <div className="app-section">
            <h2>Current Rental Situation</h2>
            <div className="form-group">
              <label>Current Address</label>
              <input type="text" value={form.current_address} onChange={set('current_address')} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Current Weekly Rent (AUD)</label>
                <input type="number" value={form.current_rent} onChange={set('current_rent')} />
              </div>
              <div className="form-group">
                <label>Requested Move-in Date</label>
                <input type="date" value={form.move_in_date} onChange={set('move_in_date')} />
              </div>
            </div>
            <div className="form-group">
              <label>Rental History</label>
              <textarea value={form.rental_history} onChange={set('rental_history')} rows={3} placeholder="Brief summary of your rental history…" />
            </div>
          </div>

          {/* Occupants */}
          <div className="app-section">
            <h2>Occupants & Pets</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Number of Occupants</label>
                <input type="number" value={form.num_occupants} onChange={set('num_occupants')} min="1" max="20" />
              </div>
            </div>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.pets} onChange={set('pets')} />
              I have pets
            </label>
            {form.pets && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Pet details</label>
                <input type="text" value={form.pet_description} onChange={set('pet_description')} placeholder="e.g. 1 small dog (Labrador, 3yo)" />
              </div>
            )}
          </div>

          {/* ID document */}
          <div className="app-section">
            <h2>Identity Document</h2>
            <p className="field-hint">Upload a copy of your passport, driver's licence or other government-issued ID.</p>
            <input type="file" accept="image/*,application/pdf" onChange={e => setIdDocument(e.target.files[0])} />
            {idDocument && <span className="file-chosen">{idDocument.name}</span>}
          </div>

          {/* Message */}
          <div className="app-section">
            <h2>Message to Landlord</h2>
            <div className="form-group">
              <textarea value={form.message} onChange={set('message')} rows={4} placeholder="Introduce yourself and explain why you'd be a great tenant…" />
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Submitting Application…' : 'Submit Application'}
          </button>

          <p className="app-privacy">Your personal information is shared only with this landlord and stored securely.</p>
        </form>
      </div>
    </div>
  )
}
