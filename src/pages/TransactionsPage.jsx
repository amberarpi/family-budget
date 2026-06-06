import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, MONTHS } from '../lib/constants'
import { PlusCircle, Trash2, Pencil, X, Check, Filter, Download } from 'lucide-react'

export default function TransactionsPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [profiles, setProfiles] = useState({}) // { user_id: first_name }
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [mutateError, setMutateError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Filters
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPerson, setFilterPerson] = useState('all')

  const now = new Date()
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  // Date mode: single month or range
  const [mode, setMode] = useState('single')
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [fromMonth, setFromMonth] = useState(1)
  const [fromYear, setFromYear] = useState(now.getFullYear())
  const [toMonth, setToMonth] = useState(now.getMonth() + 1)
  const [toYear, setToYear] = useState(now.getFullYear())

  const [form, setForm] = useState({
    type: 'expense', category: '', amount: '', description: '',
    month: now.getMonth() + 1, year: now.getFullYear(),
  })

  useEffect(() => { fetchTransactions() }, [mode, selectedMonth, selectedYear, fromMonth, fromYear, toMonth, toYear])

  async function fetchTransactions() {
    setLoading(true)
    setFetchError('')
    let query = supabase.from('transactions').select('*')

    if (mode === 'single') {
      query = query.eq('month', selectedMonth).eq('year', selectedYear)
    } else {
      query = query.gte('year', fromYear).lte('year', toYear)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) { setFetchError('Failed to load transactions. Please refresh.'); setLoading(false); return }

    let rows = data || []
    if (mode === 'range') {
      rows = rows.filter(t => {
        const tKey = t.year * 100 + t.month
        return tKey >= fromYear * 100 + fromMonth && tKey <= toYear * 100 + toMonth
      })
    }

    setTransactions(rows)

    // Fetch profiles for all users in this data
    const uniqueIds = [...new Set(rows.map(t => t.user_id))]
    if (uniqueIds.length > 0) {
      const { data: profileRows } = await supabase.from('profiles').select('id, first_name').in('id', uniqueIds)
      const map = {}
      for (const p of profileRows || []) map[p.id] = p.first_name || null
      setProfiles(map)
    }
    setLoading(false)
  }

  function getPersonName(uid) {
    if (profiles[uid]) return profiles[uid]
    if (uid === user.id) {
      const part = user.email.split('@')[0]
      return part.charAt(0).toUpperCase() + part.slice(1)
    }
    return 'Family Member'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMutateError('')
    const { error } = await supabase.from('transactions').insert({
      ...form, amount: parseFloat(form.amount), user_id: user.id,
    })
    if (error) setMutateError('Failed to save entry. Please try again.')
    else {
      setShowForm(false)
      setForm({ type: 'expense', category: '', amount: '', description: '', month: selectedMonth, year: selectedYear })
      fetchTransactions()
    }
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id)
    if (error) setMutateError('Failed to delete entry. Please try again.')
    else fetchTransactions()
  }

  function startEdit(t) {
    setEditingId(t.id)
    setEditForm({ type: t.type, category: t.category, amount: t.amount, description: t.description || '' })
  }

  async function handleEditSave(id) {
    const { error } = await supabase
      .from('transactions')
      .update({ type: editForm.type, category: editForm.category, amount: parseFloat(editForm.amount), description: editForm.description })
      .eq('id', id).eq('user_id', user.id)
    if (error) setMutateError('Failed to update entry. Please try again.')
    else { setEditingId(null); fetchTransactions() }
  }

  function exportToCSV() {
    const headers = ['Added By', 'Type', 'Category', 'Description', 'Amount', 'Month', 'Year']
    const rows = filtered.map(t => [
      getPersonName(t.user_id),
      t.type,
      t.category,
      t.description || '',
      Number(t.amount).toFixed(2),
      MONTHS[t.month - 1],
      t.year,
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${mode === 'single' ? `${MONTHS[selectedMonth - 1]}-${selectedYear}` : `${MONTHS[fromMonth - 1]}-${fromYear}-to-${MONTHS[toMonth - 1]}-${toYear}`}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const editCategories = editForm.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  // All unique categories and persons in current data (for filter dropdowns)
  const allCategories = [...new Set(transactions.map(t => t.category))].sort()
  const allPersonIds = [...new Set(transactions.map(t => t.user_id))]

  // Apply filters
  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    if (filterPerson !== 'all' && t.user_id !== filterPerson) return false
    return true
  })

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  const hasActiveFilter = filterType !== 'all' || filterCategory !== 'all' || filterPerson !== 'all'

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
              <button onClick={() => setMode('single')}
                className={`px-4 py-2 font-medium transition-colors ${mode === 'single' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Single Month
              </button>
              <button onClick={() => setMode('range')}
                className={`px-4 py-2 font-medium transition-colors ${mode === 'range' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Date Range
              </button>
            </div>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <PlusCircle size={16} />
              Add Entry
            </button>
            {filtered.length > 0 && (
              <button onClick={exportToCSV}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Download size={16} />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {mode === 'single' ? (
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-gray-500">From</span>
            <select value={fromMonth} onChange={e => setFromMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={fromYear} onChange={e => setFromYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-sm font-medium text-gray-500">To</span>
            <select value={toMonth} onChange={e => setToMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={toYear} onChange={e => setToYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Income</p>
          <p className="text-lg sm:text-2xl font-bold text-green-700 mt-1 truncate">${totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Expenses</p>
          <p className="text-lg sm:text-2xl font-bold text-red-700 mt-1 truncate">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className={`${totalIncome - totalExpenses >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} border rounded-xl p-3 sm:p-4`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${totalIncome - totalExpenses >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Net</p>
          <p className={`text-lg sm:text-2xl font-bold mt-1 truncate ${totalIncome - totalExpenses >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            ${(totalIncome - totalExpenses).toFixed(2)}
          </p>
        </div>
      </div>

      {fetchError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{fetchError}</p>}
      {mutateError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{mutateError}</p>}

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Entry</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, category: '' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input type="number" required min="0.01" step="0.01" max="9999999" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Whole Foods run" maxLength={200} />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter bar */}
      {!loading && transactions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Filter size={15} />
            Filter:
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {allPersonIds.length > 1 && (
            <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All People</option>
              {allPersonIds.map(uid => (
                <option key={uid} value={uid}>{getPersonName(uid)}</option>
              ))}
            </select>
          )}
          {hasActiveFilter && (
            <button onClick={() => { setFilterType('all'); setFilterCategory('all'); setFilterPerson('all') }}
              className="text-xs text-indigo-600 hover:underline font-medium">
              Clear filters
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {transactions.length} entries</span>
        </div>
      )}

      {/* Table — desktop / Card list — mobile */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-lg">{hasActiveFilter ? 'No entries match your filters' : `No entries for ${mode === 'single' ? `${MONTHS[selectedMonth - 1]} ${selectedYear}` : 'the selected range'}`}</p>
            <p className="text-sm mt-1">{hasActiveFilter ? 'Try clearing your filters' : 'Click "Add Entry" to get started'}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Added by</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(t => {
                    const isEditing = editingId === t.id
                    const isOwner = t.user_id === user.id
                    return isEditing ? (
                      <tr key={t.id} className="bg-indigo-50">
                        <td className="px-4 py-2 text-sm text-gray-500">{getPersonName(t.user_id)}</td>
                        <td className="px-4 py-2">
                          <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value, category: '' })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="expense">expense</option>
                            <option value="income">income</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            {editCategories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            maxLength={200} className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                            min="0.01" step="0.01" max="9999999"
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-24 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleEditSave(t.id)} className="text-green-600 hover:text-green-700" title="Save"><Check size={16} /></button>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600" title="Cancel"><X size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.user_id === user.id ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'}`}>
                            {getPersonName(t.user_id)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{t.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{t.description || '—'}</td>
                        <td className={`px-4 py-3 text-sm font-semibold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {isOwner && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => startEdit(t)} className="text-gray-400 hover:text-indigo-500" title="Edit"><Pencil size={15} /></button>
                              <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500" title="Delete"><Trash2 size={15} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-100">
              {filtered.map(t => {
                const isOwner = t.user_id === user.id
                const isEditing = editingId === t.id
                return isEditing ? (
                  <div key={t.id} className="p-4 bg-indigo-50 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value, category: '' })}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="expense">expense</option>
                        <option value="income">income</option>
                      </select>
                      <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {editCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      maxLength={200} placeholder="Description"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <div className="flex items-center gap-2">
                      <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                        min="0.01" step="0.01" max="9999999"
                        className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button onClick={() => handleEditSave(t.id)} className="text-green-600 hover:text-green-700 p-1" title="Save"><Check size={18} /></button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 p-1" title="Cancel"><X size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <div key={t.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.user_id === user.id ? 'bg-indigo-100 text-indigo-700' : 'bg-pink-100 text-pink-700'}`}>
                          {getPersonName(t.user_id)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.type}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{t.category}</p>
                      {t.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                      </span>
                      {isOwner && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(t)} className="text-gray-400 hover:text-indigo-500 p-1" title="Edit"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 p-1" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
