import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import BottomNav from './BottomNav'
import './Layout.css'

export default function Layout() {
  const { pathname } = useLocation()
  const isFeed = pathname === '/feed'

  return (
    <div className={`app-shell${isFeed ? ' app-shell-feed' : ''}`}>
      {!isFeed && <Navbar />}
      <main className={`main-content${isFeed ? ' main-content-feed' : ''}`}>
        <Outlet />
      </main>
      {!isFeed && <Footer />}
      <BottomNav />
    </div>
  )
}
