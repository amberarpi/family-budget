import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { PlusCircle, Trash2, Target, PiggyBank, Pencil, X, Check } from 'lucide-react'

export default function GoalsPage() {
  const { user } = useAuth()
  const { household } = useHousehold()
  const [goals, setGoals] = useState([])
  const [profiles, setProfiles] = useState({}) // { user_id: first_name }
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [showForm, setShowForm] = useState(() => sessionStorage.getItem('goals_showForm') === 'true')

  function toggleForm(val) {
    sessionStorage.setItem('goals_showForm', val)
    setShowForm(val)
  }
  const [editingSaved, setEditingSaved] = useState(null)
  const [editingGoal, setEditingGoal] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [form, setForm] = useState({ name: '', destination: '', target_amount: '', target_date: '' })

  useEffect(() => { fetchGoals() }, [])

  async function fetchGoals() {
    setLoading(true)
    setFetchError('')
    const { data, error } = await supabase.from('vacation_goals').select('*').order('target_date')
    if (error) { setFetchError('Failed to load goals. Please refresh.'); setLoading(false); return }
    setGoals(data || [])

    const uniqueIds = [...new Set((data || []).map(g => g.user_id))]
    if (uniqueIds.length > 0) {
      const { data: profileRows } = await supabase.from('profiles').select('id, first_name').in('id', uniqueIds)
      const map = {}
      for (const p of profileRows || []) map[p.id] = p.first_name || null
      setProfiles(map)
    }
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from('vacation_goals').insert({
      ...form,
      target_amount: parseFloat(form.target_amount),
      user_id: user.id,
      household_id: household?.id,
    })
    if (!error) {
      toggleForm(false)
      setForm({ name: '', destination: '', target_amount: '', target_date: '' })
      fetchGoals()
    }
  }

  async function handleDelete(id) {
    await supabase.from('vacation_goals').delete().eq('id', id).eq('user_id', user.id)
    fetchGoals()
  }

  async function handleUpdateSaved(id, amount) {
    if (!household?.id) return
    const { error } = await supabase.from('vacation_goals')
      .update({ saved_amount: parseFloat(amount) })
      .eq('id', id)
      .eq('household_id', household.id)
    if (!error) {
      setEditingSaved(null)
      fetchGoals()
    } else {
      setFetchError('Failed to update saved amount. Please try again.')
    }
  }

  function startEditGoal(goal) {
    setEditingGoal(goal.id)
    setEditForm({
      name: goal.name,
      destination: goal.destination || '',
      target_amount: goal.target_amount,
      target_date: goal.target_date,
    })
  }

  async function handleEditSave(id) {
    const { error } = await supabase
      .from('vacation_goals')
      .update({
        name: editForm.name,
        destination: editForm.destination,
        target_amount: parseFloat(editForm.target_amount),
        target_date: editForm.target_date,
      })
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) {
      setEditingGoal(null)
      fetchGoals()
    }
  }

  function getOwnerName(uid) {
    if (profiles[uid]) return profiles[uid]
    if (uid === user.id) {
      const part = user.email.split('@')[0]
      return part.charAt(0).toUpperCase() + part.slice(1)
    }
    return 'Family Member'
  }

  function calcMonthlySavings(goal) {
    const today = new Date()
    const target = new Date(goal.target_date + 'T12:00:00')
    const remaining = goal.target_amount - goal.saved_amount
    const months = Math.max(1,
      (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
    )
    return { monthly: Math.max(0, remaining / months), months, remaining }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Future Goals</h2>
        <button
          onClick={() => toggleForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle size={16} />
          New Goal
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Goal</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Buy a Car, Trip to Florida"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                value={form.destination}
                onChange={e => setForm({ ...form, destination: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Toyota Camry, Orlando"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount ($)</label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                max="9999999"
                value={form.target_amount}
                onChange={e => setForm({ ...form, target_amount: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
              <input
                required
                type="date"
                value={form.target_date}
                onChange={e => setForm({ ...form, target_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => toggleForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
                Create Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : fetchError ? (
        <div className="text-center py-12 text-red-500">{fetchError}</div>
      ) : goals.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Target size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No goals yet</p>
          <p className="text-sm mt-1">Click "New Goal" to start tracking a future goal</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map(goal => {
            const { monthly, months, remaining } = calcMonthlySavings(goal)
            const progress = Math.min(100, (goal.saved_amount / goal.target_amount) * 100)
            const isPast = new Date(goal.target_date + 'T12:00:00') < new Date()
            const isOwner = goal.user_id === user.id
            const isEditing = editingGoal === goal.id

            return (
              <div key={goal.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-indigo-500 shrink-0" />
                    {isEditing ? (
                      <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        maxLength={100}
                        className="border border-gray-300 rounded px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    ) : (
                      <h3 className="font-bold text-gray-900">{goal.name}</h3>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleEditSave(goal.id)} className="text-green-600 hover:text-green-700" title="Save"><Check size={16} /></button>
                          <button onClick={() => setEditingGoal(null)} className="text-gray-400 hover:text-gray-600" title="Cancel"><X size={16} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditGoal(goal)} className="text-gray-400 hover:text-indigo-500" title="Edit goal"><Pencil size={15} /></button>
                          <button onClick={() => handleDelete(goal.id)} className="text-gray-400 hover:text-red-500" title="Delete"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Added by badge */}
                {!isEditing && (
                  <div className="mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      goal.user_id === user.id ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                      Added by {getOwnerName(goal.user_id)}
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Description */}
                  {isEditing ? (
                    <input value={editForm.destination} onChange={e => setEditForm({ ...editForm, destination: e.target.value })}
                      maxLength={100} placeholder="Description (optional)"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  ) : (
                    goal.destination && <p className="text-sm text-gray-500 -mt-2">{goal.destination}</p>
                  )}

                  {/* Target amount */}
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500">Target</span>
                    {isEditing ? (
                      <input type="number" value={editForm.target_amount} onChange={e => setEditForm({ ...editForm, target_amount: e.target.value })}
                        min="1" step="0.01" max="9999999"
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-28 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    ) : (
                      <span className="font-semibold text-gray-800">${Number(goal.target_amount).toFixed(2)}</span>
                    )}
                  </div>

                  {/* Target date */}
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500">By</span>
                    {isEditing ? (
                      <input type="date" value={editForm.target_date} onChange={e => setEditForm({ ...editForm, target_date: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    ) : (
                      <span className={`font-medium ${isPast ? 'text-orange-600' : 'text-gray-800'}`}>
                        {new Date(goal.target_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric', day: 'numeric' })}
                        {isPast && ' (past)'}
                      </span>
                    )}
                  </div>

                  {/* Saved amount */}
                  <div>
                    <div className="flex justify-between text-sm mb-1 items-center">
                      <span className="text-gray-500">Saved</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-green-600">${Number(goal.saved_amount).toFixed(2)}</span>
                        {!isEditing && (
                          <button
                            onClick={() => setEditingSaved(editingSaved === goal.id ? null : goal.id)}
                            className="text-gray-400 hover:text-indigo-500 transition-colors"
                            title="Update saved amount"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    {editingSaved === goal.id && (
                      <form
                        className="flex gap-2 mt-1 mb-2"
                        onSubmit={e => { e.preventDefault(); handleUpdateSaved(goal.id, e.target.amount.value) }}
                      >
                        <input
                          name="amount"
                          type="number"
                          defaultValue={goal.saved_amount}
                          step="0.01"
                          min="0"
                          max="9999999"
                          autoFocus
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Enter amount saved"
                        />
                        <button type="submit" className="px-3 py-1 text-xs text-white bg-indigo-600 rounded-lg">Save</button>
                        <button type="button" onClick={() => setEditingSaved(null)} className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded-lg">Cancel</button>
                      </form>
                    )}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{progress.toFixed(0)}% saved</p>
                  </div>

                  {!isPast && remaining > 0 && !isEditing && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <PiggyBank size={16} className="text-indigo-500" />
                        <p className="text-sm font-medium text-indigo-800">
                          Save <span className="font-bold">${monthly.toFixed(2)}/month</span> for {months} {months === 1 ? 'month' : 'months'}
                        </p>
                      </div>
                      <p className="text-xs text-indigo-500 mt-1">Remaining: ${remaining.toFixed(2)}</p>
                    </div>
                  )}
                  {progress >= 100 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-sm font-bold text-green-700">Goal reached! 🎉</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
