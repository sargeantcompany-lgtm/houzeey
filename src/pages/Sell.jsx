import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MediaCapture from '../components/MediaCapture/MediaCapture'
import './Sell.css'

const STEPS = ['Property details', 'Photos', 'Pricing', 'Review']

export default function Sell() {
  const [step, setStep] = useState(0)
  const [mediaItems, setMediaItems] = useState([])
  const [form, setForm] = useState({
    listingType: 'sale',
    address: '',
    suburb: '',
    state: 'NSW',
    postcode: '',
    propertyType: 'house',
    beds: '',
    baths: '',
    cars: '',
    size: '',
    description: '',
    price: '',
    priceDisplay: 'exact',
  })
  const navigate = useNavigate()

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleNext() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else navigate('/dashboard')
  }

  return (
    <div className="sell-page">
      <div className="container">
        <div className="sell-card">
          <h1>List your property</h1>

          {/* Progress */}
          <div className="sell-progress">
            {STEPS.map((s, i) => (
              <div key={s} className={`progress-step ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
                <div className="progress-dot">{i < step ? '✓' : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* Step 0: Property details */}
          {step === 0 && (
            <div className="sell-step">
              <div className="field-row">
                <label>
                  Listing type
                  <select name="listingType" value={form.listingType} onChange={handleChange}>
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                </label>
                <label>
                  Property type
                  <select name="propertyType" value={form.propertyType} onChange={handleChange}>
                    {['House', 'Apartment', 'Townhouse', 'Unit', 'Land', 'Rural'].map(t => (
                      <option key={t} value={t.toLowerCase()}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="full">
                Street address
                <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="12 Maple Street" />
              </label>

              <div className="field-row">
                <label>
                  Suburb
                  <input type="text" name="suburb" value={form.suburb} onChange={handleChange} placeholder="Surry Hills" />
                </label>
                <label>
                  State
                  <select name="state" value={form.state} onChange={handleChange}>
                    {['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>
                  Postcode
                  <input type="text" name="postcode" value={form.postcode} onChange={handleChange} placeholder="2010" maxLength={4} />
                </label>
              </div>

              <div className="field-row">
                <label>Bedrooms <input type="number" name="beds" value={form.beds} onChange={handleChange} min={0} /></label>
                <label>Bathrooms <input type="number" name="baths" value={form.baths} onChange={handleChange} min={0} /></label>
                <label>Car spaces <input type="number" name="cars" value={form.cars} onChange={handleChange} min={0} /></label>
                <label>Land size (m²) <input type="number" name="size" value={form.size} onChange={handleChange} min={0} /></label>
              </div>

              <label className="full">
                Description
                <textarea name="description" value={form.description} onChange={handleChange} rows={5} placeholder="Describe your property..." />
              </label>
            </div>
          )}

          {/* Step 1: Photos & Video */}
          {step === 1 && (
            <div className="sell-step">
              <p className="upload-tip">Use your camera to take photos and videos, or upload from your device.</p>

              <MediaCapture onMediaCaptured={item => setMediaItems(prev => [...prev, item])} />

              <div className="upload-divider"><span>or upload files</span></div>

              <label className="file-upload-label">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="file-input-hidden"
                  onChange={e => {
                    Array.from(e.target.files).forEach(file => {
                      const url = URL.createObjectURL(file)
                      setMediaItems(prev => [...prev, {
                        type: file.type.startsWith('video') ? 'video' : 'photo',
                        url,
                        blob: file,
                        name: file.name,
                      }])
                    })
                  }}
                />
                <span>📁 Choose photos or videos from device</span>
              </label>

              {mediaItems.length > 0 && (
                <div className="media-count">
                  ✓ {mediaItems.filter(m => m.type === 'photo').length} photo{mediaItems.filter(m => m.type === 'photo').length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                  {mediaItems.filter(m => m.type === 'video').length} video{mediaItems.filter(m => m.type === 'video').length !== 1 ? 's' : ''} added
                </div>
              )}
            </div>
          )}

          {/* Step 2: Pricing */}
          {step === 2 && (
            <div className="sell-step">
              <label className="full">
                {form.listingType === 'sale' ? 'Asking price ($)' : 'Weekly rent ($)'}
                <input type="number" name="price" value={form.price} onChange={handleChange} placeholder={form.listingType === 'sale' ? '1,450,000' : '650'} />
              </label>

              <label className="full">
                Price display
                <select name="priceDisplay" value={form.priceDisplay} onChange={handleChange}>
                  <option value="exact">Show exact price</option>
                  <option value="contact">Contact for price</option>
                  <option value="range">Show price range</option>
                </select>
              </label>

              <div className="price-preview">
                <span>Preview:</span>
                <strong>
                  {form.priceDisplay === 'exact' && form.price
                    ? `$${Number(form.price).toLocaleString()}${form.listingType === 'rent' ? '/wk' : ''}`
                    : form.priceDisplay === 'contact'
                    ? 'Contact for price'
                    : 'Price on request'}
                </strong>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="sell-step review-step">
              <h3>Review your listing</h3>
              <div className="review-grid">
                <div className="review-item"><span>Type</span><strong>{form.listingType === 'sale' ? 'For Sale' : 'For Rent'}</strong></div>
                <div className="review-item"><span>Property</span><strong>{form.propertyType}</strong></div>
                <div className="review-item"><span>Address</span><strong>{form.address}, {form.suburb} {form.state} {form.postcode}</strong></div>
                <div className="review-item"><span>Bedrooms</span><strong>{form.beds || '-'}</strong></div>
                <div className="review-item"><span>Bathrooms</span><strong>{form.baths || '-'}</strong></div>
                <div className="review-item"><span>Price</span><strong>{form.price ? `$${Number(form.price).toLocaleString()}` : '-'}</strong></div>
              </div>
              <p className="review-note">By publishing, you confirm the listing is accurate and you are authorised to list this property.</p>
            </div>
          )}

          {/* Actions */}
          <div className="sell-actions">
            {step > 0 && (
              <button className="btn-back" onClick={() => setStep(s => s - 1)}>Back</button>
            )}
            <button className="btn-next" onClick={handleNext}>
              {step === STEPS.length - 1 ? 'Publish listing' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
