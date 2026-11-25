import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getSession, logout } from '../../auth'
import { api } from '../../api'
import { Icon, loadSaved, resetSaved, useSaved } from '../../craft/ui'

function LogoMark() {
  return (
    <svg className="logo-mark" width="40" height="36" viewBox="0 0 64 58" aria-hidden="true"><path d="M7 29 31 6l24 23" fill="none" stroke="#16b35d" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /><path d="M42 3h6v14l-6-6z" fill="#fda734" /><rect x="26" y="24" width="11" height="10" rx="2.5" fill="#29cbef" /><path d="M14 36v15h34V36" fill="none" stroke="#e31a47" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  )
}

const PAGE_NAMES = { '/': 'home', '/tours': 'tours', '/buy': 'search', '/sell': 'sell', '/offers': 'offers', '/my-listings': 'mine', '/saved': 'saved', '/guides': 'guides' }

// Offers waiting for my reply (shown as a red badge on Offers).
function useOfferBadge(userId, pathname) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!userId) return
    Promise.all([api.offers.mine(), api.offers.received()])
      .then(([made, received]) => {
        const waiting = o => ['pending', 'countered'].includes(o.status)
        setCount(made.filter(o => waiting(o) && o.current_offer_by === 'seller').length +
          received.filter(o => waiting(o) && o.current_offer_by === 'buyer').length)
      })
      .catch(() => {})
  }, [userId, pathname])
  return userId ? count : 0
}

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const session = getSession()
  const userId = session?.id
  // The menu remembers which page it was opened on, so it closes itself when the page changes.
  const [menuFor, setMenuFor] = useState(null)
  const menuOpen = menuFor === pathname
  const [unread, setUnread] = useState(0)
  const saved = useSaved()
  const offerBadge = useOfferBadge(userId, pathname)

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    document.body.dataset.page = PAGE_NAMES[pathname] || (pathname.startsWith('/listing/') ? 'property' : 'other')
    document.body.classList.toggle('no-scroll', menuOpen && window.innerWidth < 768)
  }, [pathname, menuOpen])
  useEffect(() => { loadSaved(true) }, [userId])
  useEffect(() => {
    if (!userId) return
    const load = () => api.notifications.list().then(d => setUnread(d.unread_count || 0)).catch(() => {})
    load()
    const iv = setInterval(load, 60000)
    return () => clearInterval(iv)
  }, [userId])

  function signOut() {
    logout()
    resetSaved()
    navigate('/')
  }

  const navCls = ({ isActive }) => (isActive ? 'active' : undefined)
  const current = path => (pathname === path ? 'page' : undefined)
  const badge = n => (n > 0 ? <span className="nav-badge">{n}</span> : null)

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="header-inner">
          <button className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="mobileNav" onClick={() => setMenuFor(menuOpen ? null : pathname)}>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <Link className="logo" to="/" aria-label="Houzeey home"><LogoMark /><span className="logo-word">HOUZEEY</span></Link>
          <nav className="main-nav" aria-label="Main">
            <NavLink to="/" end className={navCls} aria-current={current('/')}>Feed</NavLink>
            <NavLink to="/tours" className={navCls} aria-current={current('/tours')}>Tours</NavLink>
            <NavLink to="/buy" className={navCls} aria-current={current('/buy')}>Buy</NavLink>
            <NavLink to="/sell" className={navCls} aria-current={current('/sell')}>Sell</NavLink>
            <NavLink to="/offers" className={navCls} aria-current={current('/offers')}>Offers{badge(offerBadge)}</NavLink>
            <NavLink to="/my-listings" className={navCls} aria-current={current('/my-listings')}>My listings</NavLink>
          </nav>
          <div className="header-actions">
            <Link className="btn btn-outline post-video-btn" to="/sell?step=media"><Icon.video />Post a video tour</Link>
            {userId && (
              <Link className="icon-btn" to="/notifications" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`} title="Notifications">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                {unread > 0 && <span className="badge">{unread}</span>}
              </Link>
            )}
            <Link className="icon-btn saved-link" to="/saved" aria-label="Saved properties" title="Saved properties">
              <Icon.heart />
              {saved.size > 0 && <span className="badge">{saved.size}</span>}
            </Link>
            <div className="auth-area">
              {userId ? (
                <>
                  <Link className="hello" to="/dashboard" style={{ textDecoration: 'none' }}>Hi, {String(session.name || '').split(' ')[0]}</Link>
                  <button className="btn btn-ghost" data-signout onClick={signOut}>Sign out</button>
                </>
              ) : (
                <>
                  <Link className="btn btn-ghost" to="/login">Sign in</Link>
                  <Link className="btn btn-primary" to="/register">Join</Link>
                </>
              )}
            </div>
          </div>
        </div>
        <nav className="mobile-nav" id="mobileNav" aria-label="Mobile" hidden={!menuOpen}>
          <Link to="/">Feed</Link>
          <Link to="/tours">Video tours</Link>
          <Link to="/buy">Buy</Link>
          <Link to="/sell">Sell your home</Link>
          <Link to="/offers">Offers &amp; negotiations{badge(offerBadge)}</Link>
          <Link to="/my-listings">My listings</Link>
          <Link to="/saved">Saved properties</Link>
          {userId && <Link to="/messages">Messages</Link>}
          {userId && <Link to="/notifications">Notifications{badge(unread)}</Link>}
          <Link to="/guides">Selling guides</Link>
          {userId && <Link to="/dashboard">My account</Link>}
          <div className="mobile-auth">
            {userId
              ? <button className="btn btn-outline btn-block" onClick={signOut}>Sign out</button>
              : <><Link className="btn btn-primary btn-block" to="/register">Join</Link><Link className="btn btn-outline btn-block" to="/login">Sign in</Link></>}
          </div>
        </nav>
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Link className="logo logo-light" to="/"><LogoMark /><span className="logo-word">HOUZEEY</span></Link>
            <p>Australia&apos;s private property marketplace. Homes sold by the people who own them: no agency listings, no commission.</p>
          </div>
          <div>
            <h3>Property</h3>
            <Link to="/buy">Buy</Link>
            <Link to="/tours">Video tours</Link>
            <Link to="/saved">Saved</Link>
            <Link to="/messages">Messages</Link>
          </div>
          <div>
            <h3>Owners</h3>
            <Link to="/sell">List your property</Link>
            <Link to="/my-listings">Manage listings</Link>
            <Link to="/offers">Offers &amp; negotiations</Link>
            <Link to="/guides">Selling guides</Link>
          </div>
          <div>
            <h3>States</h3>
            <Link to="/buy?state=NSW">New South Wales</Link>
            <Link to="/buy?state=VIC">Victoria</Link>
            <Link to="/buy?state=QLD">Queensland</Link>
            <Link to="/buy?state=WA">Western Australia</Link>
            <Link to="/buy?state=SA">South Australia</Link>
          </div>
        </div>
        <div className="container footer-base">
          <span>© {new Date().getFullYear()} Houzeey · <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> · <Link to="/support">Support</Link></span>
          <span>Always get independent legal advice (a conveyancer or solicitor) before signing a contract of sale.</span>
        </div>
      </footer>

      <div className="toast" id="toast" role="status" aria-live="polite" />

      <nav className="tabbar" aria-label="Quick links">
        <Link to="/" aria-current={current('/')} aria-label="Feed">
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 3.5l8.5 7.5V20a.5.5 0 0 1-.5.5h-5v-6h-6v6H4a.5.5 0 0 1-.5-.5z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></svg><span>Feed</span>
        </Link>
        <Link to="/buy" aria-current={current('/buy')} aria-label="Search">
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg><span>Search</span>
        </Link>
        <Link to="/sell" className="tab-post" aria-current={current('/sell')} aria-label="Post your property">
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg><span>Post</span>
        </Link>
        <Link to="/tours" aria-current={current('/tours')} aria-label="Video tours">
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" strokeWidth="1.9" /><path d="M3.5 8.5h17M9 3.5l2.5 5M14.5 3.5l2.5 5" stroke="currentColor" strokeWidth="1.7" /><path d="m10 12 5 3-5 3z" fill="currentColor" /></svg><span>Tours</span>
        </Link>
        <Link to="/offers" aria-current={current('/offers')} aria-label="Offers">
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 12.5 4H20v7.5L11.5 20z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><circle cx="16" cy="8" r="1.6" fill="currentColor" /></svg><span>Offers</span>
          {offerBadge > 0 && <i className="nav-badge">{offerBadge}</i>}
        </Link>
      </nav>
    </>
  )
}
