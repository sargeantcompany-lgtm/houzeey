import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Listings from './pages/Listings'
import ListingDetail from './pages/ListingDetail'
import Dashboard from './pages/Dashboard'
import Messages from './pages/Messages'
import Sell from './pages/Sell'
import Marketplace from './pages/Marketplace'
import Payments from './pages/Payments'
import NotFound from './pages/NotFound'
import VerifyIdentity from './pages/VerifyIdentity'
import Inspections from './pages/Inspections'
import Offers from './pages/Offers'
import Settlement from './pages/Settlement'
import RentalApplication from './pages/RentalApplication'
import Admin from './pages/Admin'
import Marketing from './pages/Marketing'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/buy" element={<Listings mode="sale" />} />
          <Route path="/rent" element={<Listings mode="rent" />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/marketplace" element={<Marketplace />} />

          {/* Protected routes */}
          <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
          <Route path="/verify-identity" element={<ProtectedRoute><VerifyIdentity /></ProtectedRoute>} />
          <Route path="/inspections/:listingId" element={<ProtectedRoute><Inspections /></ProtectedRoute>} />
          <Route path="/offers" element={<ProtectedRoute><Offers /></ProtectedRoute>} />
          <Route path="/offers/:listingId" element={<ProtectedRoute><Offers /></ProtectedRoute>} />
          <Route path="/offers/view/:offerId" element={<ProtectedRoute><Offers /></ProtectedRoute>} />
          <Route path="/settlement/:offerId" element={<ProtectedRoute><Settlement /></ProtectedRoute>} />
          <Route path="/apply/:listingId" element={<ProtectedRoute><RentalApplication /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/marketing" element={<ProtectedRoute><Marketing /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Route>
        {/* Auth pages outside layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  )
}
