import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { Home, Copy, CheckCircle, Users, Pencil, Check, X, ShieldCheck } from 'lucide-react'

const SUPABASE_STORAGE = 'supabase.co/storage'

export default function HouseholdPage() {
  const { user } = useAuth()
  const { household, role, refreshHousehold } = useHousehold()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [copied, setCopied] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null) // user_id to confirm removal

  useEffect(() => {
    if (household) fetchMembers()
  }, [household])

  async function fetchMembers() {
    setLoading(true)
    const { data: memberRows, error } = await supabase
      .from('household_members')
      .select('user_id, role, joined_at')
      .eq('household_id', household.id)

    if (!error && memberRows?.length) {
      const userIds = memberRows.map(m => m.user_id)
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds)

      const profileMap = {}
      for (const p of profileRows || []) profileMap[p.id] = p

      setMembers(memberRows.map(m => ({ ...m, profiles: profileMap[m.user_id] || null })))
    } else {
      setMembers([])
    }
    setLoading(false)
  }

  async function handleRename(e) {
    e.preventDefault()
    setSaveError('')
    const { error } = await supabase
      .from('households')
      .update({ name: newName.trim() })
      .eq('id', household.id)
    if (error) { setSaveError('Failed to rename household. Please try again.'); return }
    setEditingName(false)
    refreshHousehold()
  }

  async function handleRemoveMember(userId) {
    await supabase.from('household_members').delete()
      .eq('household_id', household.id)
      .eq('user_id', userId)
      .eq('role', 'member') // extra guard — cannot remove admins even via direct call
    setConfirmRemove(null)
    fetchMembers()
  }

  function copyCode() {
    navigator.clipboard.writeText(household.join_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getMemberName(member) {
    const p = member.profiles
    if (p?.first_name) return `${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`
    if (member.user_id === user.id) return 'You'
    return 'Family Member'
  }

  function isSafeAvatarUrl(url) {
    return url && url.includes(SUPABASE_STORAGE)
  }

  if (!household) return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
        <Home size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg">No household found</p>
        <p className="text-sm mt-1">Contact your admin to get a join code</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Household</h2>

      {/* Household name */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full">
            <Home size={22} />
          </div>
          <div className="flex-1">
            {editingName ? (
              <form onSubmit={handleRename} className="flex gap-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  maxLength={50}
                  autoFocus
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" className="text-green-600 hover:text-green-700 p-1"><Check size={16} /></button>
                <button type="button" onClick={() => setEditingName(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 text-lg">{household.name}</h3>
                {role === 'admin' && (
                  <button onClick={() => { setEditingName(true); setNewName(household.name) }}
                    className="text-gray-400 hover:text-indigo-500 transition-colors">
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
            {saveError && <p className="text-red-500 text-xs mt-1">{saveError}</p>}
            <p className="text-sm text-gray-500 mt-0.5">Your household</p>
          </div>
        </div>

        {/* Join code — only visible to admins */}
        {role === 'admin' && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-2">Household Join Code</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold font-mono text-indigo-800 tracking-widest">{household.join_code}</span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-white rounded-lg px-3 py-1.5 transition-colors"
              >
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-indigo-500 mt-2">Share this code with family members so they can join your household when signing up.</p>
          </div>
        )}
        {role === 'member' && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">Ask your household admin for the join code to share with others.</p>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full">
            <Users size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Members</h3>
            <p className="text-sm text-gray-500">{members.length} {members.length === 1 ? 'person' : 'people'} in this household</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 overflow-hidden flex items-center justify-center shrink-0">
                  {isSafeAvatarUrl(member.profiles?.avatar_url) ? (
                    <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-indigo-600 font-semibold text-sm">
                      {getMemberName(member).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{getMemberName(member)}</p>
                    {member.user_id === user.id && <span className="text-xs text-gray-400">(you)</span>}
                  </div>
                  <p className="text-xs text-gray-400">
                    Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === 'admin' && (
                    <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      <ShieldCheck size={11} />
                      Admin
                    </span>
                  )}
                  {role === 'admin' && member.user_id !== user.id && member.role === 'member' && (
                    confirmRemove === member.user_id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Sure?</span>
                        <button onClick={() => handleRemoveMember(member.user_id)}
                          className="text-xs text-red-600 font-medium hover:underline">Yes</button>
                        <button onClick={() => setConfirmRemove(null)}
                          className="text-xs text-gray-400 hover:underline">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemove(member.user_id)}
                        className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-0.5 transition-colors"
                      >
                        Remove
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
