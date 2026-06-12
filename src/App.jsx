import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HouseholdProvider, useHousehold } from './contexts/HouseholdContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import AnalysisPage from './pages/AnalysisPage'
import VacationPage from './pages/VacationPage'
import ProfilePage from './pages/ProfilePage'
import BillsPage from './pages/BillsPage'
import HouseholdPage from './pages/HouseholdPage'
import ManageHouseholdsPage from './pages/ManageHouseholdsPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

function NoHousehold() {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <p className="text-2xl mb-2">🏠</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Household Found</h2>
        <p className="text-sm text-gray-500 mb-6">Your account is not linked to any household. Please contact your admin to get a valid join code and sign up again.</p>
        <button onClick={signOut} className="text-sm text-indigo-600 hover:underline">Sign out</button>
      </div>
    </div>
  )
}

function HouseholdGate() {
  const { household, loading: householdLoading } = useHousehold()

  // If this is a password recovery redirect, show reset page regardless of household
  if (window.location.hash.includes('type=recovery') ||
      window.location.pathname.includes('reset-password')) {
    return <ResetPasswordPage />
  }

  if (householdLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!household) return <NoHousehold />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/vacation" element={<VacationPage />} />
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/household" element={<HouseholdPage />} />
        <Route path="/manage-households" element={<ManageHouseholdsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

function AppRoutes() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) return (
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<LoginPage />} />
    </Routes>
  )

  return (
    <HouseholdProvider>
      <HouseholdGate />
    </HouseholdProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/family-budget">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
