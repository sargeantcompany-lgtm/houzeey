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

          {/* Protected routes — require login */}
          <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Route>
        {/* Auth pages outside layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  )
}
