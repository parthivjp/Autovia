import { useLayoutEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import CarsPage from './pages/CarsPage'
import CarDetailsPage from './pages/CarDetailsPage'
import WishlistPage from './pages/WishlistPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import BookingPage from './pages/BookingPage'
import ConfirmationPage from './pages/ConfirmationPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminCarsPage from './pages/admin/AdminCarsPage'
import AdminBookingsPage from './pages/admin/AdminBookingsPage'
import AdminContentPage from './pages/admin/AdminContentPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import Footer from './components/Footer'
import { CarsProvider } from './context/CarsContext.jsx'
import './styles/global.css'
import './styles/variables.css'
import './styles/reset.css'
import './styles/animations.css'

function RouteScrollReset() {
  const { pathname, hash } = useLocation()

  useLayoutEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])

  return null
}

function App() {
  const { pathname } = useLocation()
  const isAdminRoute = pathname.startsWith('/admin')
  return (
    <div className="app-shell">
      <RouteScrollReset />
      <CarsProvider>
        {!isAdminRoute && <Header />}
        <div className={isAdminRoute ? 'admin-route-main' : undefined}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cars" element={<CarsPage />} />
            <Route path="/cars/:carId" element={<CarDetailsPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/booking/:carId" element={<BookingPage />} />
            <Route path="/confirmation/:bookingId" element={<ConfirmationPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/locations" element={<Navigate to="/admin/content?tab=locations" replace />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="cars" element={<AdminCarsPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="content" element={<AdminContentPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Routes>
        </div>
        {!isAdminRoute && <Footer />}
      </CarsProvider>
    </div>
  )
}

export default App
