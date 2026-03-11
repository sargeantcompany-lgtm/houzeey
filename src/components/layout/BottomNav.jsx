import { NavLink } from 'react-router-dom'
import './BottomNav.css'

const NAV_ITEMS = [
  { to: '/',           icon: '🏠', label: 'Home'      },
  { to: '/buy',        icon: '🔍', label: 'Buy'       },
  { to: '/rent',       icon: '🔑', label: 'Rent'      },
  { to: '/marketplace',icon: '◈',  label: 'Discover'  },
  { to: '/dashboard',  icon: '👤', label: 'Account'   },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon">{icon}</span>
          <span className="bottom-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
