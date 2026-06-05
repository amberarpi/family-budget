import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, MONTHS } from '../lib/constants'
import { PlusCircle, Trash2, ChevronDown } from 'lucide-react'

export default function TransactionsPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const [form, setForm] = useState({
    type: 'expense',
    category: '',
    amount: '',
    description: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  })

  useEffect(() => {
    fetchTransactions()
  }, [selectedMonth, selectedYear])

  async function fetchTransactions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .order('created_at', { ascending: false })
    if (!error) setTransactions(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from('transactions').insert({
      ...form,
      amount: parseFloat(form.amount),
      user_id: user.id,
    })
    if (!error) {
      setShowForm(false)
      setForm({ type: 'expense', category: '', amount: '', description: '', month: selectedMonth, year: selectedYear })
      fetchTransactions()
    }
  }

  async function handleDelete(id) {
    await supabase.from('transactions').delete().eq('id', id)
    fetchTransactions()
  }

  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PlusCircle size={16} />
            Add Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Total Income</p>
          <p className="text-2xl font-bold text-green-700 mt-1">${totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Total Expenses</p>
          <p className="text-2xl font-bold text-red-700 mt-1">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className={`${totalIncome - totalExpenses >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} border rounded-xl p-4`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${totalIncome - totalExpenses >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Net</p>
          <p className={`text-2xl font-bold mt-1 ${totalIncome - totalExpenses >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            ${(totalIncome - totalExpenses).toFixed(2)}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Entry</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value, category: '' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Whole Foods run"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-lg">No entries for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
            <p className="text-sm mt-1">Click "Add Entry" to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.description || '—'}</td>
                  <td className={`px-4 py-3 text-sm font-semibold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {t.user_id === user.id && (
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
