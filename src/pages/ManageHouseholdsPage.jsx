import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { Home, PlusCircle, Copy, CheckCircle, Users, Pencil, Check, X } from 'lucide-react'

export default function ManageHouseholdsPage() {
  const { user } = useAuth()
  const { role } = useHousehold()
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(() => sessionStorage.getItem('households_showForm') === 'true')

  function toggleForm(val) {
    sessionStorage.setItem('households_showForm', val)
    setShowForm(val)
  }
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [memberCounts, setMemberCounts] = useState({})

  useEffect(() => {
    if (role === 'admin') fetchHouseholds()
  }, [role])

  async function fetchHouseholds() {
    setLoading(true)
    const { data } = await supabase
      .from('households')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at')

    setHouseholds(data || [])

    // Fetch member counts for each household
    if (data?.length) {
      const counts = {}
      for (const h of data) {
        const { count } = await supabase
          .from('household_members')
          .select('*', { count: 'exact', head: true })
          .eq('household_id', h.id)
        counts[h.id] = count || 0
      }
      setMemberCounts(counts)
    }
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)

    // Generate a cryptographically secure random join code (12 chars, uppercase)
    const code = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()

    const { error } = await supabase.from('households').insert({
      name: newName.trim(),
      join_code: code,
      created_by: user.id,
    })

    if (!error) {
      setNewName('')
      toggleForm(false)
      fetchHouseholds()
    }
    setCreating(false)
  }

  async function handleRename(id) {
    await supabase.from('households').update({ name: editName.trim() }).eq('id', id)
    setEditingId(null)
    fetchHouseholds()
  }

  function copyCode(household) {
    navigator.clipboard.writeText(household.join_code)
    setCopiedId(household.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (role !== 'admin') return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
        <Home size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg">Admin access required</p>
        <p className="text-sm mt-1">Only admins can manage households</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Manage Households</h2>
        <button
          onClick={() => toggleForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle size={16} />
          New Household
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Create a household for each family group. Share the join code with the members you want to invite. Each household's data is completely isolated.
      </p>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Household</h3>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              required
              value={newName}
              onChange={e => setNewName(e.target.value)}
              maxLength={50}
              placeholder="e.g. Brother's Household"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => toggleForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">A unique join code will be generated automatically.</p>
        </div>
      )}

      {/* Households list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : households.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Home size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No households created yet</p>
          <p className="text-sm mt-1">Click "New Household" to create one for your brother or other family groups</p>
        </div>
      ) : (
        <div className="space-y-4">
          {households.map(h => (
            <div key={h.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                    <Home size={18} />
                  </div>
                  {editingId === h.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        maxLength={50}
                        autoFocus
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button onClick={() => handleRename(h.id)} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{h.name}</h3>
                      <button
                        onClick={() => { setEditingId(h.id); setEditName(h.name) }}
                        className="text-gray-400 hover:text-indigo-500 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users size={13} />
                  <span>{memberCounts[h.id] ?? '—'} members</span>
                </div>
              </div>

              {/* Join code */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide mb-0.5">Join Code</p>
                  <span className="text-lg font-bold font-mono text-indigo-800 tracking-widest">{h.join_code}</span>
                </div>
                <button
                  onClick={() => copyCode(h)}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-white rounded-lg px-3 py-1.5 transition-colors"
                >
                  {copiedId === h.id ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copiedId === h.id ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-2">
                Created {new Date(h.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
