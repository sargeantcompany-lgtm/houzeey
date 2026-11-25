import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MediaCapture from '../components/MediaCapture/MediaCapture'
import { api } from '../api'
import { getVideoMimeType, MAX_VIDEO_UPLOAD_BYTES } from '../videoUpload'
import './Sell.css'

const STEPS = ['Property details', 'Photos', 'Pricing', 'Legal review', 'Review']

export default function Sell() {
  const [step, setStep] = useState(0)
  const [mediaItems, setMediaItems] = useState([])
  const [createdListingId, setCreatedListingId] = useState(null)
  const [form, setForm] = useState({
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
    priceMax: '',
    priceDisplay: 'exact',
    solicitor_name: '',
    solicitor_firm: '',
    solicitor_email: '',
    solicitor_phone: '',
    solicitor_registration_number: '',
    solicitor_state: 'NSW',
  })
  const [submitting, setSubmitting] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [identityVerified, setIdentityVerified] = useState(false)
  const [checkingIdentity, setCheckingIdentity] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.auth.me()
      .then(user => setIdentityVerified(Boolean(user.verified)))
      .catch(() => setIdentityVerified(false))
      .finally(() => setCheckingIdentity(false))
  }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function addCapturedMedia(item) {
    if (item.type === 'video' && mediaItems.some(media => media.type === 'video')) {
      URL.revokeObjectURL(item.url)
      setError('Only one video can be added to a listing.')
      return
    }
    if (item.type === 'video' && item.blob.size > MAX_VIDEO_UPLOAD_BYTES) {
      URL.revokeObjectURL(item.url)
      setError('Choose a video smaller than 512 MB.')
      return
    }
    setMediaItems(prev => [...prev, item])
    setError('')
  }

  async function handleNext() {
    if (step === 0 && (!form.address.trim() || !form.suburb.trim() || !form.postcode.trim())) {
      setError('Enter the property address, suburb and postcode to continue.')
      return
    }

    if (step === 2 && form.priceDisplay !== 'contact' && (!form.price || Number(form.price) <= 0)) {
      setError('Enter a valid asking price or choose “Contact for price”.')
      return
    }
    if (step === 2 && form.priceDisplay === 'range' && (!form.priceMax || Number(form.priceMax) <= Number(form.price))) {
      setError('Enter a price ceiling greater than the minimum price.')
      return
    }

    if (step === 3 && (
      !form.solicitor_name.trim() ||
      !form.solicitor_firm.trim() ||
      !form.solicitor_email.trim() ||
      !form.solicitor_registration_number.trim()
    )) {
      setError('Add your solicitor or conveyancer’s contact and registration details.')
      return
    }

    if (step < STEPS.length - 1) {
      setError('')
      setStep(s => s + 1)
      return
    }

    const videoItems = mediaItems.filter(item => item.type === 'video')
    if (step === STEPS.length - 1 && videoItems.length > 1) {
      setError('Only one video can be added to a listing.')
      return
    }
    if (step === STEPS.length - 1 && videoItems[0]) {
      if (videoItems[0].blob.size > MAX_VIDEO_UPLOAD_BYTES) {
        setError('Choose a video smaller than 512 MB.')
        return
      }
      if (!getVideoMimeType(videoItems[0].blob)) {
        setError('Choose an MP4, MOV, M4V, or WebM video.')
        return
      }
    }

    // Final step — create the listing, then upload any video directly to storage.
    setSubmitting(true)
    setError('')
    let listingCreated = Boolean(createdListingId)
    try {
      let listingId = createdListingId
      if (!listingId) {
        const formData = new FormData()
        formData.append('type', 'sale')
        formData.append('property_type', form.propertyType)
        formData.append('title', `${form.beds ? form.beds + ' Bed ' : ''}${form.propertyType.charAt(0).toUpperCase() + form.propertyType.slice(1)}, ${form.suburb}`)
        formData.append('address', form.address)
        formData.append('suburb', form.suburb)
        formData.append('state', form.state)
        formData.append('postcode', form.postcode)
        if (form.beds) formData.append('beds', form.beds)
        if (form.baths) formData.append('baths', form.baths)
        if (form.cars) formData.append('cars', form.cars)
        if (form.size) formData.append('land_size', form.size)
        formData.append('description', form.description)
        formData.append('price', form.price || '0')
        formData.append('price_display', form.priceDisplay)
        if (form.priceMax) formData.append('price_max', form.priceMax)
        formData.append('solicitor_name', form.solicitor_name)
        formData.append('solicitor_firm', form.solicitor_firm)
        formData.append('solicitor_email', form.solicitor_email)
        formData.append('solicitor_phone', form.solicitor_phone)
        formData.append('solicitor_registration_number', form.solicitor_registration_number)
        formData.append('solicitor_state', form.solicitor_state)

        mediaItems.filter(item => item.type === 'photo' && item.blob).forEach(item => {
          formData.append('images', item.blob, item.name || 'photo.jpg')
        })

        const listing = await api.listings.create(formData)
        listingId = listing.id
        listingCreated = true
        setCreatedListingId(listingId)
      }

      const video = videoItems[0]
      if (video) {
        const contentType = getVideoMimeType(video.blob)
        setUploadProgress(0)
        setUploadMessage('Preparing direct video upload…')
        const upload = await api.videos.createUploadUrl(listingId, {
          contentType,
          fileSize: video.blob.size,
        })
        setUploadMessage('Uploading video…')
        await api.videos.uploadDirect(upload.uploadUrl, video.blob, contentType, setUploadProgress)
        setUploadMessage('Starting video processing…')
        await api.videos.completeUpload(upload.videoId)
      }

      navigate('/dashboard', { state: { listingSubmitted: true } })
    } catch (err) {
      setError(listingCreated
        ? `Your listing was submitted for solicitor review, but its video upload could not finish. ${err.message} Choose “Retry video upload” to try again.`
        : err.message || 'Could not submit your listing for review. Please try again.')
      setSubmitting(false)
      setUploadMessage('')
    }
  }

  return (
    <div className="sell-page">
      <div className="container">
        <div className="sell-card">
          <span className="sell-kicker">Private sale · No agency listings</span>
          <h1>Sell your home directly</h1>
          <p className="sell-intro">Create your listing and invite your solicitor or conveyancer to review the details before it can be published.</p>

          {checkingIdentity ? (
            <p className="sell-identity-pending">Checking your identity verification…</p>
          ) : !identityVerified ? (
            <div className="sell-identity-gate">
              <strong>Verify your identity before listing</strong>
              <p>We need to check who is creating a private sale listing. Identity verification is separate from proof of ownership and your solicitor’s review.</p>
              <Link to="/verify-identity">Go to identity verification <span aria-hidden="true">→</span></Link>
            </div>
          ) : (
          <>

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
              <p className="upload-tip">Use your camera to take photos and videos, or upload from your device. Add up to one video (MP4, MOV, M4V, or WebM; 512 MB maximum).</p>

              <MediaCapture
                onMediaCaptured={addCapturedMedia}
                videoDisabled={mediaItems.some(item => item.type === 'video')}
              />

              <div className="upload-divider"><span>or upload files</span></div>

              <label className="file-upload-label">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="file-input-hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || [])
                    let hasVideo = mediaItems.some(item => item.type === 'video')
                    let rejectedVideo = false
                    const additions = []
                    files.forEach(file => {
                      const isVideo = file.type.startsWith('video/') || Boolean(getVideoMimeType(file))
                      if (isVideo) {
                        if (hasVideo || !getVideoMimeType(file) || file.size > MAX_VIDEO_UPLOAD_BYTES) {
                          rejectedVideo = true
                          return
                        }
                        hasVideo = true
                      }
                      const url = URL.createObjectURL(file)
                      additions.push({
                        type: isVideo ? 'video' : 'photo',
                        url,
                        blob: file,
                        name: file.name,
                      })
                    })
                    if (additions.length) setMediaItems(prev => [...prev, ...additions])
                    if (rejectedVideo) setError('Only one supported video up to 512 MB can be added to a listing.')
                    else setError('')
                    e.target.value = ''
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
              {error && <p className="sell-error" role="alert">{error}</p>}
            </div>
          )}

          {/* Step 2: Pricing */}
          {step === 2 && (
            <div className="sell-step">
              <label className="full">
                {form.priceDisplay === 'range' ? 'Minimum asking price ($)' : 'Asking price ($)'}
                <input type="number" name="price" value={form.price} onChange={handleChange} placeholder="1450000" />
              </label>

              {form.priceDisplay === 'range' && (
                <label className="full">
                  Maximum asking price ($)
                  <input type="number" name="priceMax" value={form.priceMax} onChange={handleChange} placeholder="1550000" />
                </label>
              )}

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
                    ? `$${Number(form.price).toLocaleString()}`
                    : form.priceDisplay === 'contact'
                    ? 'Price on request'
                    : form.price && form.priceMax
                    ? `$${Number(form.price).toLocaleString()} – $${Number(form.priceMax).toLocaleString()}`
                    : 'Enter a price range'}
                </strong>
              </div>
            </div>
          )}

          {/* Step 3: Solicitor or conveyancer */}
          {step === 3 && (
            <div className="sell-step legal-review-step">
              <div className="legal-review-intro">
                <span className="legal-review-icon">§</span>
                <div>
                  <h3>Invite your solicitor or conveyancer</h3>
                  <p>Your listing stays unpublished until your nominated legal representative reviews it through a secure email link.</p>
                </div>
              </div>
              <div className="field-row">
                <label>Legal representative’s full name<input name="solicitor_name" value={form.solicitor_name} onChange={handleChange} required /></label>
                <label>Firm<input name="solicitor_firm" value={form.solicitor_firm} onChange={handleChange} required /></label>
              </div>
              <label className="full">Work email<input type="email" name="solicitor_email" value={form.solicitor_email} onChange={handleChange} placeholder="name@lawfirm.com.au" required /></label>
              <div className="field-row">
                <label>Phone (optional)<input type="tel" name="solicitor_phone" value={form.solicitor_phone} onChange={handleChange} /></label>
                <label>Professional registration number<input name="solicitor_registration_number" value={form.solicitor_registration_number} onChange={handleChange} required /></label>
                <label>Registration state or territory
                  <select name="solicitor_state" value={form.solicitor_state} onChange={handleChange}>
                    {['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'].map(state => <option key={state}>{state}</option>)}
                  </select>
                </label>
              </div>
              <div className="legal-review-notice">
                <strong>What happens next</strong>
                <p>We email your legal representative a one-time review link. They can attest to the listing details or request corrections. The listing remains private until they approve it.</p>
                <small>Houzeey records the response but does not independently verify professional registration. Do not include confidential legal advice in the listing.</small>
              </div>
              {error && <p className="sell-error" role="alert">{error}</p>}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="sell-step review-step">
              <h3>Review your listing</h3>
              <div className="review-grid">
                <div className="review-item"><span>Type</span><strong>Private sale</strong></div>
                <div className="review-item"><span>Property</span><strong>{form.propertyType}</strong></div>
                <div className="review-item"><span>Address</span><strong>{form.address}, {form.suburb} {form.state} {form.postcode}</strong></div>
                <div className="review-item"><span>Bedrooms</span><strong>{form.beds || '-'}</strong></div>
                <div className="review-item"><span>Bathrooms</span><strong>{form.baths || '-'}</strong></div>
                <div className="review-item"><span>Price</span><strong>{form.priceDisplay === 'contact' ? 'Price on request' : form.priceDisplay === 'range' ? `$${Number(form.price).toLocaleString()} – $${Number(form.priceMax).toLocaleString()}` : form.price ? `$${Number(form.price).toLocaleString()}` : '-'}</strong></div>
                <div className="review-item"><span>Photos</span><strong>{mediaItems.filter(m => m.type === 'photo').length} added</strong></div>
                <div className="review-item"><span>Solicitor</span><strong>{form.solicitor_name} · {form.solicitor_firm}</strong></div>
              </div>
              <p className="review-note">Submitting sends a review invitation to your legal representative. Your listing stays private until their attestation is received. You confirm that you are the owner or authorised to sell this property.</p>
              {mediaItems.some(item => item.type === 'video') && (
                <p className="review-note">The video will upload directly to private storage, then be converted to a vertical playback video and thumbnail. Processing is limited to 180 seconds.</p>
              )}
              {uploadMessage && (
                <p className="upload-progress-message" role="status" aria-live="polite">
                  {uploadMessage}{uploadMessage === 'Uploading video…' ? ` ${uploadProgress}%` : ''}
                </p>
              )}
              {error && <p className="sell-error">{error}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="sell-actions">
            {step > 0 && (
              <button className="btn-back" onClick={() => setStep(s => s - 1)} disabled={submitting || Boolean(createdListingId)}>Back</button>
            )}
            <button className="btn-next" onClick={handleNext} disabled={submitting}>
              {submitting
                ? uploadMessage === 'Uploading video…' ? `Uploading video… ${uploadProgress}%` : uploadMessage || 'Submitting…'
                : createdListingId && step === STEPS.length - 1
                  ? 'Retry video upload'
                  : step === STEPS.length - 1 ? 'Send for solicitor review' : 'Next'}
            </button>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  )
}
