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

      {/* How it works */}
      <section className="section how-it-works">
        <div className="container">
          <h2>How Houzeey works</h2>
          <p className="section-sub">Skip the middleman. Save thousands.</p>
          <div className="steps">
            <div className="step">
              <div className="step-icon">📸</div>
              <h3>1. List your property</h3>
              <p>Create a detailed listing with photos, floor plans and your asking price in minutes.</p>
            </div>
            <div className="step">
              <div className="step-icon">🔍</div>
              <h3>2. Get discovered</h3>
              <p>Buyers and renters search and contact you directly through secure messaging.</p>
            </div>
            <div className="step">
              <div className="step-icon">🤝</div>
              <h3>3. Close the deal</h3>
              <p>Manage inspections, documents and payments all in one place.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
        <div className="container">
          <h2>Everything you need</h2>
          <div className="features-grid">
            {[
              { icon: '🏠', title: 'Sale & Rental Listings', desc: 'List residential or investment properties for sale or rent.' },
              { icon: '💬', title: 'Direct Messaging', desc: 'Chat securely with buyers, sellers, landlords or tenants.' },
              { icon: '📅', title: 'Inspection Scheduling', desc: 'Book and manage property inspections without the back-and-forth.' },
              { icon: '💳', title: 'Rental Payments', desc: 'Pay and receive rent online with automated receipts and reminders.' },
              { icon: '📄', title: 'Lease Management', desc: 'Store and manage leases, contracts and documents digitally.' },
              { icon: '🛒', title: 'Marketplace', desc: 'Buy and sell furniture, appliances and moving supplies.' },
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
          <h2>Ready to list your property?</h2>
          <p>Join thousands of Australians saving on agent fees.</p>
          <div className="cta-buttons">
            <a href="/sell" className="btn-cta-primary">List for Sale</a>
            <a href="/rent" className="btn-cta-outline">List for Rent</a>
          </div>
        </div>
      </section>
    </div>
  )
}
