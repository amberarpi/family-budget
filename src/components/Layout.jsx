import { useAuth } from '../contexts/AuthContext'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, PieChart, Plane, LogOut, DollarSign } from 'lucide-react'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/analysis', label: 'Analysis', icon: PieChart },
    { to: '/vacation', label: 'Vacations', icon: Plane },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <DollarSign size={18} />
            </div>
            <span className="font-bold text-gray-900 text-lg">Family Budget</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`
              }
            >
              <Icon size={16} />
              <span className="hidden sm:block">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 py-6">
        {children}
      </main>
    </div>
  )
}
