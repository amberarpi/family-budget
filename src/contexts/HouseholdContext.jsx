import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const HouseholdContext = createContext(null)

export function HouseholdProvider({ children }) {
  const { user } = useAuth()
  const [household, setHousehold] = useState(null) // { id, name, join_code }
  const [role, setRole] = useState(null) // 'admin' | 'member'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setHousehold(null); setRole(null); setLoading(false); return }
    loadHousehold()
  }, [user])

  async function loadHousehold() {
    setLoading(true)
    const { data } = await supabase
      .from('household_members')
      .select('role, households(id, name, join_code)')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setHousehold(data.households)
      setRole(data.role)
    } else {
      setHousehold(null)
      setRole(null)
    }
    setLoading(false)
  }

  async function refreshHousehold() {
    await loadHousehold()
  }

  return (
    <HouseholdContext.Provider value={{ household, role, loading, refreshHousehold }}>
      {children}
    </HouseholdContext.Provider>
  )
}

export const useHousehold = () => useContext(HouseholdContext)
