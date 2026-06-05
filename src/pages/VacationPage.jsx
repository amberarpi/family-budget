import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { PlusCircle, Trash2, Plane, PiggyBank, Pencil, X, Check } from 'lucide-react'

export default function VacationPage() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSaved, setEditingSaved] = useState(null)
  const [editingGoal, setEditingGoal] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [form, setForm] = useState({ name: '', destination: '', target_amount: '', target_date: '' })

  useEffect(() => {
    fetchGoals()
  }, [])

  async function fetchGoals() {
    setLoading(true)
    const { data } = await supabase.from('vacation_goals').select('*').order('target_date')
    setGoals(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from('vacation_goals').insert({
      ...form,
      target_amount: parseFloat(form.target_amount),
      user_id: user.id,
    })
    if (!error) {
      setShowForm(false)
      setForm({ name: '', destination: '', target_amount: '', target_date: '' })
      fetchGoals()
    }
  }

  async function handleDelete(id) {
    await supabase.from('vacation_goals').delete().eq('id', id).eq('user_id', user.id)
    fetchGoals()
  }

  async function handleUpdateSaved(id, amount) {
    await supabase.from('vacation_goals').update({ saved_amount: parseFloat(amount) }).eq('id', id)
    setEditingSaved(null)
    fetchGoals()
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
        <h2 className="text-2xl font-bold text-gray-900">Vacation Planner</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle size={16} />
          New Goal
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Plan a New Vacation</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vacation Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Summer Europe Trip"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
              <input
                value={form.destination}
                onChange={e => setForm({ ...form, destination: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Paris, France"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget ($)</label>
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
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
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
      ) : goals.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Plane size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No vacation goals yet</p>
          <p className="text-sm mt-1">Click "New Goal" to start planning your next trip</p>
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
                    <Plane size={18} className="text-indigo-500 shrink-0" />
                    {isEditing ? (
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        maxLength={100}
                        className="border border-gray-300 rounded px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <h3 className="font-bold text-gray-900">{goal.name}</h3>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleEditSave(goal.id)} className="text-green-600 hover:text-green-700 transition-colors" title="Save">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingGoal(null)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Cancel">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditGoal(goal)} className="text-gray-400 hover:text-indigo-500 transition-colors" title="Edit">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleDelete(goal.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Destination */}
                  {isEditing ? (
                    <input
                      value={editForm.destination}
                      onChange={e => setEditForm({ ...editForm, destination: e.target.value })}
                      maxLength={100}
                      placeholder="Destination"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    goal.destination && <p className="text-sm text-gray-500 -mt-2">{goal.destination}</p>
                  )}

                  {/* Target amount */}
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500">Target</span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.target_amount}
                        onChange={e => setEditForm({ ...editForm, target_amount: e.target.value })}
                        min="1"
                        step="0.01"
                        max="9999999"
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-28 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className="font-semibold text-gray-800">${Number(goal.target_amount).toFixed(2)}</span>
                    )}
                  </div>

                  {/* Target date */}
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500">Date</span>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.target_date}
                        onChange={e => setEditForm({ ...editForm, target_date: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <span className={`font-medium ${isPast ? 'text-orange-600' : 'text-gray-800'}`}>
                        {new Date(goal.target_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric', day: 'numeric' })}
                        {isPast && ' (past)'}
                      </span>
                    )}
                  </div>

                  {/* Saved amount */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Saved</span>
                      <button
                        className="font-semibold text-green-600 hover:underline"
                        onClick={() => isOwner && setEditingSaved(editingSaved === goal.id ? null : goal.id)}
                      >
                        ${Number(goal.saved_amount).toFixed(2)}
                      </button>
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
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button type="submit" className="px-2 py-1 text-xs text-white bg-indigo-600 rounded-lg">Save</button>
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
                      <p className="text-sm font-bold text-green-700">Goal reached! Time to book your trip!</p>
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
