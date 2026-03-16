import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getSession } from '../auth'
import './Inspections.css'

function formatDt(dt) {
  return new Date(dt).toLocaleString('en-AU', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Inspections() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const session = getSession()

  const [slots, setSlots] = useState([])
  const [myInspections, setMyInspections] = useState([])
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newSlots, setNewSlots] = useState([''])
  const [adding, setAdding] = useState(false)
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isOwner = listing && session?.id === listing.user_id

  useEffect(() => {
    const promises = [
      api.listings.get(listingId),
      api.inspections.slots(listingId),
    ]
    if (session) {
      promises.push(api.inspections.mine())
    }

    Promise.all(promises)
      .then(([l, s, mine]) => {
        setListing(l)
        setSlots(s)
        if (mine) setMyInspections(mine)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [listingId])

  async function handleAddSlots(e) {
    e.preventDefault()
    setError('')
    const validSlots = newSlots.filter(s => s.trim())
    if (!validSlots.length) return setError('Please enter at least one time slot')

    setAdding(true)
    try {
      const added = await api.inspections.addSlots(listingId, validSlots)
      setSlots(prev => [...prev, ...added])
      setNewSlots([''])
      setSuccess('Time slots added successfully')
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleBook(slotId) {
    setError('')
    setBooking(slotId)
    try {
      await api.inspections.book(slotId)
      setSlots(prev => prev.filter(s => s.id !== slotId))
      setSuccess('Inspection booked! You\'ll see it in your dashboard.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBooking(null)
    }
  }

  async function handleCancel(id) {
    try {
      await api.inspections.cancel(id)
      setMyInspections(prev => prev.filter(i => i.id !== id))
      setSuccess('Inspection cancelled')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="container"><p className="loading-text">Loading…</p></div>
  if (!listing) return <div className="container"><p>Listing not found.</p></div>

  return (
    <div className="inspections-page">
      <div className="container">
        <div className="insp-header">
          <button className="back-btn" onClick={() => navigate(`/listing/${listingId}`)}>← Back to listing</button>
          <h1>Inspection Bookings</h1>
          <p className="insp-listing-title">{listing.title} — {listing.suburb}, {listing.state}</p>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {/* Owner: add time slots */}
        {isOwner && (
          <div className="insp-section">
            <h2>Add Available Time Slots</h2>
            <form onSubmit={handleAddSlots} className="slots-form">
              {newSlots.map((slot, i) => (
                <div key={i} className="slot-input-row">
                  <input
                    type="datetime-local"
                    value={slot}
                    onChange={e => setNewSlots(prev => prev.map((s, idx) => idx === i ? e.target.value : s))}
                  />
                  {newSlots.length > 1 && (
                    <button type="button" className="remove-slot" onClick={() => setNewSlots(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn-outline-sm" onClick={() => setNewSlots(prev => [...prev, ''])}>+ Add another slot</button>
              <button type="submit" className="btn-primary-sm" disabled={adding}>{adding ? 'Adding…' : 'Save Slots'}</button>
            </form>
          </div>
        )}

        {/* Available slots */}
        <div className="insp-section">
          <h2>Available Inspection Times</h2>
          {slots.length === 0 ? (
            <p className="empty-text">No inspection times available yet.</p>
          ) : (
            <div className="slots-grid">
              {slots.map(slot => (
                <div key={slot.id} className="slot-card">
                  <div className="slot-datetime">{formatDt(slot.datetime)}</div>
                  {!isOwner && session && (
                    <button
                      className="btn-primary-sm"
                      onClick={() => handleBook(slot.id)}
                      disabled={booking === slot.id}
                    >
                      {booking === slot.id ? 'Booking…' : 'Book Inspection'}
                    </button>
                  )}
                  {!session && (
                    <button className="btn-outline-sm" onClick={() => navigate('/login')}>Log in to book</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My bookings */}
        {session && myInspections.length > 0 && (
          <div className="insp-section">
            <h2>My Booked Inspections</h2>
            <div className="my-inspections">
              {myInspections.filter(i => i.listing_id === listingId).map(insp => (
                <div key={insp.id} className="my-insp-card">
                  <div>
                    <div className="insp-dt">{formatDt(insp.datetime)}</div>
                    <div className="insp-address">{insp.listing_address}</div>
                  </div>
                  <button className="btn-danger-sm" onClick={() => handleCancel(insp.id)}>Cancel</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
