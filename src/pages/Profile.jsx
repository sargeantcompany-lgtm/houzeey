import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { getSession, refreshSession } from '../auth'
import './Profile.css'

export default function Profile() {
  const session = getSession()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState({ name: '', phone: '', bio: '' })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [reviews, setReviews] = useState({ reviews: [], avg_rating: 0, count: 0 })
  const fileRef = useRef()

  useEffect(() => {
    Promise.all([
      api.auth.me(),
      api.reviews.get(session?.id),
    ]).then(([user, rev]) => {
      setProfile(user)
      setForm({ name: user.name || '', phone: user.phone || '', bio: user.bio || '' })
      setReviews(rev)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [session?.id])

  function flash(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 4000)
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      let updated
      if (avatarFile) {
        const fd = new FormData()
        fd.append('name', form.name)
        fd.append('phone', form.phone)
        fd.append('bio', form.bio)
        fd.append('avatar', avatarFile)
        updated = await api.users.update(fd)
      } else {
        updated = await api.auth.updateProfile({ name: form.name, phone: form.phone, bio: form.bio })
      }
      setProfile(updated)
      refreshSession()
      flash('success', 'Profile updated.')
    } catch (err) {
      flash('error', err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm) {
      flash('error', 'New passwords do not match')
      return
    }
    setSaving(true)
    try {
      await api.auth.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      flash('success', 'Password changed successfully.')
      setPwForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      flash('error', err.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const avatarSrc = avatarPreview || profile?.avatar_url
  const initial = (profile?.name || session?.name || '?')[0].toUpperCase()

  const roleBadge = {
    buyer: 'Buyer',
    renter: 'Renter',
    seller: 'Seller / Landlord',
    landlord: 'Landlord',
    buyer_agent: 'Buyer Agent',
    admin: 'Admin',
  }

  if (loading) return <div className="profile-page"><div className="container"><p>Loading…</p></div></div>

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-grid">

          {/* Left card */}
          <aside className="profile-card">
            <div className="profile-avatar-wrap">
              {avatarSrc
                ? <img src={avatarSrc} alt="avatar" className="profile-avatar-img" />
                : <div className="profile-avatar-placeholder">{initial}</div>
              }
              <button className="avatar-change-btn" onClick={() => fileRef.current?.click()} title="Change photo">📷</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </div>

            <h2 className="profile-name">{profile?.name}</h2>
            <div className="profile-role-badge">{roleBadge[profile?.role] || profile?.role}</div>

            {profile?.verified && <div className="profile-verified">✓ Identity Verified</div>}

            <div className="profile-trust">
              <span className="trust-score">{profile?.trust_score ?? 0}</span>
              <span>Trust score</span>
            </div>

            {reviews.count > 0 && (
              <div className="profile-rating">
                {'★'.repeat(Math.round(reviews.avg_rating))}{'☆'.repeat(5 - Math.round(reviews.avg_rating))}
                <span>{reviews.avg_rating} ({reviews.count} reviews)</span>
              </div>
            )}

            <p className="profile-since">Member since {new Date(profile?.created_at).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</p>
          </aside>

          {/* Right tabs */}
          <div className="profile-main">
            <div className="profile-tabs">
              {['profile', 'security', 'reviews'].map(t => (
                <button key={t} className={`profile-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                  {{ profile: 'My Profile', security: 'Security', reviews: 'Reviews' }[t]}
                </button>
              ))}
            </div>

            {msg.text && <div className={`profile-msg ${msg.type}`}>{msg.text}</div>}

            {/* Profile tab */}
            {tab === 'profile' && (
              <form className="profile-form" onSubmit={handleSaveProfile}>
                <div className="pf-section">
                  <h3>Personal details</h3>
                  <div className="pf-row">
                    <label>
                      Full name
                      <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </label>
                    <label>
                      Phone number
                      <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+61 400 000 000" />
                    </label>
                  </div>
                  <label className="full">
                    Bio (optional)
                    <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={4} placeholder="Tell others a bit about yourself…" />
                  </label>
                </div>

                <div className="pf-section">
                  <h3>Account info</h3>
                  <div className="pf-read-only">
                    <span>Email</span>
                    <strong>{profile?.email}</strong>
                  </div>
                  <div className="pf-read-only">
                    <span>Role</span>
                    <strong>{roleBadge[profile?.role] || profile?.role}</strong>
                  </div>
                  <div className="pf-read-only">
                    <span>Identity verified</span>
                    <strong>{profile?.verified ? '✓ Yes' : 'Not yet — '}<a href="/verify-identity" style={{ color: 'var(--green)' }}>Verify now</a></strong>
                  </div>
                </div>

                <div className="pf-actions">
                  <button type="submit" className="btn-save-profile" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                </div>
              </form>
            )}

            {/* Security tab */}
            {tab === 'security' && (
              <form className="profile-form" onSubmit={handleChangePassword}>
                <div className="pf-section">
                  <h3>Change password</h3>
                  <label className="full">
                    Current password
                    <input type="password" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} required />
                  </label>
                  <label className="full">
                    New password
                    <input type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} required minLength={8} />
                  </label>
                  <label className="full">
                    Confirm new password
                    <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
                  </label>
                </div>
                <div className="pf-actions">
                  <button type="submit" className="btn-save-profile" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</button>
                </div>
              </form>
            )}

            {/* Reviews tab */}
            {tab === 'reviews' && (
              <div className="profile-reviews">
                {reviews.count === 0 ? (
                  <p className="pf-empty">No reviews yet.</p>
                ) : (
                  <>
                    <div className="reviews-summary">
                      <span className="reviews-avg">{reviews.avg_rating}</span>
                      <div>
                        <div className="reviews-stars">{'★'.repeat(Math.round(reviews.avg_rating))}{'☆'.repeat(5 - Math.round(reviews.avg_rating))}</div>
                        <span className="reviews-count">{reviews.count} reviews</span>
                      </div>
                    </div>
                    <div className="reviews-list">
                      {reviews.reviews.map(r => (
                        <div key={r.id} className="review-item">
                          <div className="review-header">
                            <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                            <span className="review-date">{new Date(r.created_at).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}</span>
                          </div>
                          {r.comment && <p className="review-comment">{r.comment}</p>}
                          <span className="review-by">— {r.reviewer_name || 'Houzeey user'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
