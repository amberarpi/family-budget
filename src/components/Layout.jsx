import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, PieChart, Plane, LogOut, DollarSign, UserCircle, User } from 'lucide-react'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.from('profiles').select('first_name, avatar_url').eq('id', user.id).single()
      if (data?.first_name) setFirstName(data.first_name)
      else {
        const part = user.email.split('@')[0]
        setFirstName(part.charAt(0).toUpperCase() + part.slice(1))
      }
      if (data?.avatar_url) setAvatarUrl(`${data.avatar_url}?t=${Date.now()}`)
      else setAvatarUrl(null)
    }
    loadProfile()
    window.addEventListener('avatar-updated', loadProfile)
    return () => window.removeEventListener('avatar-updated', loadProfile)
  }, [user])

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/analysis', label: 'Analysis', icon: PieChart },
    { to: '/vacation', label: 'Vacations', icon: Plane },
    { to: '/profile', label: 'Profile', icon: UserCircle },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <DollarSign size={18} />
            </div>
            <span className="font-bold text-gray-900 text-lg">Welcome, {firstName}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <NavLink to="/profile" className="shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center border-2 border-indigo-200">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={16} className="text-indigo-400" />
                )}
              </div>
            </NavLink>
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
