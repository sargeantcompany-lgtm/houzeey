import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import './EditListing.css'

export default function EditListing() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.listings.get(id).then(l => {
      setForm({
        type: l.type || 'sale',
        property_type: l.property_type || 'house',
        title: l.title || '',
        address: l.address || '',
        suburb: l.suburb || '',
        state: l.state || 'NSW',
        postcode: l.postcode || '',
        beds: l.beds ?? '',
        baths: l.baths ?? '',
        cars: l.cars ?? '',
        land_size: l.land_size ?? '',
        description: l.description || '',
        price: l.price ?? '',
        price_display: l.price_display || 'exact',
        price_max: l.price_max ?? '',
        status: l.status || 'active',
      })
      setLoading(false)
    }).catch(() => {
      setError('Failed to load listing')
      setLoading(false)
    })
  }, [id])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const payload = {
        type: form.type,
        property_type: form.property_type,
        title: form.title || `${form.beds ? form.beds + ' Bed ' : ''}${form.property_type}, ${form.suburb}`,
        address: form.address,
        suburb: form.suburb,
        state: form.state,
        postcode: form.postcode,
        beds: form.beds || null,
        baths: form.baths || null,
        cars: form.cars || null,
        land_size: form.land_size || null,
        description: form.description,
        price: form.price || '0',
        price_display: form.price_display,
        price_max: form.price_max || null,
        status: form.status,
      }
      await api.listings.update(id, payload)
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch (err) {
      setError(err.message || 'Failed to save changes')
      setSaving(false)
    }
  }

  if (loading) return <div className="edit-listing-page"><div className="container"><p>Loading…</p></div></div>
  if (!form) return <div className="edit-listing-page"><div className="container"><p>{error || 'Listing not found'}</p></div></div>

  return (
    <div className="edit-listing-page">
      <div className="container">
        <div className="edit-listing-card">
          <div className="edit-listing-header">
            <Link to="/dashboard" className="edit-back">← Back to dashboard</Link>
            <h1>Edit listing</h1>
          </div>

          <form onSubmit={handleSave}>

            {/* Status + Type */}
            <div className="edit-section">
              <h3>Status &amp; Type</h3>
              <div className="field-row">
                <label>
                  Listing status
                  <select name="status" value={form.status} onChange={handleChange}>
                    <option value="active">Active</option>
                    <option value="under_offer">Under Offer</option>
                    <option value="leased">Leased</option>
                    <option value="sold">Sold</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </label>
                <label>
                  Listing type
                  <select name="type" value={form.type} onChange={handleChange}>
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                </label>
                <label>
                  Property type
                  <select name="property_type" value={form.property_type} onChange={handleChange}>
                    {['House', 'Apartment', 'Townhouse', 'Unit', 'Land', 'Rural'].map(t => (
                      <option key={t} value={t.toLowerCase()}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Location */}
            <div className="edit-section">
              <h3>Location</h3>
              <label className="full">
                Street address
                <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="12 Maple Street" />
              </label>
              <div className="field-row">
                <label>
                  Suburb
                  <input type="text" name="suburb" value={form.suburb} onChange={handleChange} />
                </label>
                <label>
                  State
                  <select name="state" value={form.state} onChange={handleChange}>
                    {['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>
                  Postcode
                  <input type="text" name="postcode" value={form.postcode} onChange={handleChange} maxLength={4} />
                </label>
              </div>
            </div>

            {/* Details */}
            <div className="edit-section">
              <h3>Property details</h3>
              <label className="full">
                Title (optional — auto-generated if blank)
                <input type="text" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Spacious 3 Bed Family Home" />
              </label>
              <div className="field-row">
                <label>Bedrooms <input type="number" name="beds" value={form.beds} onChange={handleChange} min={0} /></label>
                <label>Bathrooms <input type="number" name="baths" value={form.baths} onChange={handleChange} min={0} /></label>
                <label>Car spaces <input type="number" name="cars" value={form.cars} onChange={handleChange} min={0} /></label>
                <label>Land size (m²) <input type="number" name="land_size" value={form.land_size} onChange={handleChange} min={0} /></label>
              </div>
              <label className="full">
                Description
                <textarea name="description" value={form.description} onChange={handleChange} rows={6} />
              </label>
            </div>

            {/* Pricing */}
            <div className="edit-section">
              <h3>Pricing</h3>
              <div className="field-row">
                <label>
                  {form.type === 'sale' ? 'Asking price ($)' : 'Weekly rent ($)'}
                  <input type="number" name="price" value={form.price} onChange={handleChange} />
                </label>
                <label>
                  Price display
                  <select name="price_display" value={form.price_display} onChange={handleChange}>
                    <option value="exact">Show exact price</option>
                    <option value="contact">Contact for price</option>
                    <option value="range">Show price range</option>
                  </select>
                </label>
                {form.price_display === 'range' && (
                  <label>
                    Max price ($)
                    <input type="number" name="price_max" value={form.price_max} onChange={handleChange} />
                  </label>
                )}
              </div>
            </div>

            {error && <p className="edit-error">{error}</p>}
            {success && <p className="edit-success">Saved! Returning to dashboard…</p>}

            <div className="edit-actions">
              <Link to="/dashboard" className="btn-back-link">Cancel</Link>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
