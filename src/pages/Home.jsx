import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Home.css'

const PROPERTY_TYPES = ['Any', 'House', 'Apartment', 'Townhouse', 'Land', 'Rural']

export default function Home() {
  const [tab, setTab] = useState('buy')
  const [query, setQuery] = useState('')
  const [propertyType, setPropertyType] = useState('Any')
  const navigate = useNavigate()

  function handleSearch(e) {
    e.preventDefault()
    const path = tab === 'buy' ? '/buy' : '/rent'
    navigate(`${path}?q=${encodeURIComponent(query)}&type=${propertyType}`)
  }

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>Find your next home —<br />no agents, no commissions</h1>
          <p>Australia's peer-to-peer property platform. Connect directly with sellers, buyers, landlords and tenants.</p>

          <div className="search-box">
            <div className="search-tabs">
              <button className={tab === 'buy' ? 'active' : ''} onClick={() => setTab('buy')}>Buy</button>
              <button className={tab === 'rent' ? 'active' : ''} onClick={() => setTab('rent')}>Rent</button>
            </div>

            <form className="search-form" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Suburb, postcode or city"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <select value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <button type="submit" className="search-btn">Search</button>
            </form>
          </div>
        </div>
      </section>

      {/* What is Houzeey */}
      <section className="section explainer-section">
        <div className="container">
          <h2>What is Houzeey?</h2>
          <p className="section-sub">Houzeey is Australia's peer-to-peer real estate platform — connecting property owners directly with buyers and renters, with no agents and no commissions.</p>
          <div className="audience-cards">
            <div className="audience-card buyers">
              <div className="audience-icon">🔍</div>
              <h3>Buyers & Renters</h3>
              <ul>
                <li>Search thousands of properties by location, price and type</li>
                <li>Swipe through listings or browse with filters</li>
                <li>Message owners directly — no agent gatekeeping</li>
                <li>Book inspections in seconds</li>
                <li>Negotiate and sign leases online</li>
              </ul>
              <a href="/buy" className="audience-btn">Browse properties →</a>
            </div>
            <div className="audience-card sellers">
              <div className="audience-icon">🏠</div>
              <h3>Sellers & Landlords</h3>
              <ul>
                <li>List your property in under 5 minutes</li>
                <li>Upload photos and video directly from your phone</li>
                <li>Receive enquiries and negotiate directly</li>
                <li>Manage rental payments, receipts and reminders</li>
                <li>Store leases and contracts digitally</li>
              </ul>
              <a href="/register" className="audience-btn">List your property →</a>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section how-it-works">
        <div className="container">
          <h2>How it works</h2>
          <p className="section-sub">Three simple steps. No middleman.</p>
          <div className="steps">
            <div className="step">
              <div className="step-icon">📸</div>
              <h3>1. Create your listing</h3>
              <p>Take photos and video, add your price and property details. Your listing goes live instantly.</p>
            </div>
            <div className="step">
              <div className="step-icon">💬</div>
              <h3>2. Connect directly</h3>
              <p>Buyers and renters message you directly. Negotiate, answer questions and schedule inspections — all in the app.</p>
            </div>
            <div className="step">
              <div className="step-icon">✅</div>
              <h3>3. Close the deal</h3>
              <p>Sign leases, process rental payments and store documents. Everything handled end-to-end on Houzeey.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
        <div className="container">
          <h2>Everything in one place</h2>
          <div className="features-grid">
            {[
              { icon: '🏠', title: 'Sale & Rental Listings', desc: 'List or browse residential properties for sale or rent across Australia.' },
              { icon: '💬', title: 'Direct Messaging', desc: 'Chat and negotiate securely with owners or buyers — no agent in between.' },
              { icon: '📅', title: 'Inspection Scheduling', desc: 'Book and manage open-for-inspection times without the back-and-forth.' },
              { icon: '💳', title: 'Rental Payments', desc: 'Pay and receive rent online with automated receipts and payment reminders.' },
              { icon: '📄', title: 'Lease Management', desc: 'Create, sign and store lease agreements and property documents digitally.' },
              { icon: '◈', title: 'Swipe to Discover', desc: 'Swipe through properties like cards — save your favourites with a tap.' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container cta-inner">
          <h2>Ready to get started?</h2>
          <p>Join Australians saving thousands on agent fees.</p>
          <div className="cta-buttons">
            <a href="/register" className="btn-cta-primary">Create free account</a>
            <a href="/buy" className="btn-cta-outline">Browse properties</a>
          </div>
        </div>
      </section>
    </div>
  )
}
