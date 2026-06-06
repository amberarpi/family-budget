import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { EXPENSE_CATEGORIES, MONTHS } from '../lib/constants'
import { PlusCircle, Trash2, Pencil, Check, X, CheckCircle2, Circle, Receipt } from 'lucide-react'

export default function BillsPage() {
  const { user } = useAuth()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([]) // bill_payments for selected month
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', amount: '', category: 'Utilities', due_day: '1' })
  const [editForm, setEditForm] = useState({})

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  useEffect(() => { fetchData() }, [selectedMonth, selectedYear])

  async function fetchData() {
    setLoading(true)
    const [{ data: billRows }, { data: paymentRows }] = await Promise.all([
      supabase.from('bills').select('*').eq('is_active', true).order('due_day'),
      supabase.from('bill_payments').select('*').eq('month', selectedMonth).eq('year', selectedYear),
    ])
    setBills(billRows || [])
    setPayments(paymentRows || [])
    setLoading(false)
  }

  async function handleAddBill(e) {
    e.preventDefault()
    const { error } = await supabase.from('bills').insert({
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      due_day: parseInt(form.due_day),
      user_id: user.id,
    })
    if (!error) {
      setShowForm(false)
      setForm({ name: '', amount: '', category: 'Utilities', due_day: '1' })
      fetchData()
    }
  }

  async function handleEditSave(id) {
    await supabase.from('bills').update({
      name: editForm.name.trim(),
      amount: parseFloat(editForm.amount),
      category: editForm.category,
      due_day: parseInt(editForm.due_day),
    }).eq('id', id).eq('user_id', user.id)
    setEditingId(null)
    fetchData()
  }

  async function handleDelete(id) {
    // soft delete — mark inactive
    await supabase.from('bills').update({ is_active: false }).eq('id', id).eq('user_id', user.id)
    fetchData()
  }

  async function handleMarkPaid(bill) {
    const existingPayment = payments.find(p => p.bill_id === bill.id)
    if (existingPayment) return // already paid

    // Create a transaction entry
    const { data: txData, error: txError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'expense',
      category: bill.category,
      amount: bill.amount,
      description: `${bill.name} — bill payment`,
      month: selectedMonth,
      year: selectedYear,
    }).select().single()

    if (txError) return

    // Record the payment
    await supabase.from('bill_payments').insert({
      bill_id: bill.id,
      user_id: user.id,
      month: selectedMonth,
      year: selectedYear,
      paid_at: new Date().toISOString(),
      transaction_id: txData.id,
    })
    fetchData()
  }

  async function handleMarkUnpaid(bill) {
    const payment = payments.find(p => p.bill_id === bill.id)
    if (!payment) return

    // Delete the linked transaction
    if (payment.transaction_id) {
      await supabase.from('transactions').delete().eq('id', payment.transaction_id).eq('user_id', user.id)
    }
    // Remove the payment record
    await supabase.from('bill_payments').delete().eq('id', payment.id)
    fetchData()
  }

  const paid = bills.filter(b => payments.some(p => p.bill_id === b.id))
  const unpaid = bills.filter(b => !payments.some(p => p.bill_id === b.id))
  const totalBills = bills.reduce((s, b) => s + Number(b.amount), 0)
  const totalPaid = paid.reduce((s, b) => s + Number(b.amount), 0)

  function isOverdue(bill) {
    const payment = payments.find(p => p.bill_id === bill.id)
    if (payment) return false
    const today = new Date()
    return today.getMonth() + 1 === selectedMonth &&
      today.getFullYear() === selectedYear &&
      today.getDate() > bill.due_day
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Bills</h2>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <PlusCircle size={16} />
            Add Bill
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 sm:p-4">
          <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Total Bills</p>
          <p className="text-lg sm:text-2xl font-bold text-indigo-700 mt-1 truncate">${totalBills.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Paid</p>
          <p className="text-lg sm:text-2xl font-bold text-green-700 mt-1 truncate">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Remaining</p>
          <p className="text-lg sm:text-2xl font-bold text-red-700 mt-1 truncate">${(totalBills - totalPaid).toFixed(2)}</p>
        </div>
      </div>

      {/* Add bill form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Add Recurring Bill</h3>
          <form onSubmit={handleAddBill} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Name</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                maxLength={100} placeholder="e.g. Internet"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input required type="number" min="0.01" step="0.01" max="9999999"
                value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Day of Month</label>
              <input required type="number" min="1" max="31"
                value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })}
                placeholder="e.g. 15"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
                Save Bill
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : bills.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <Receipt size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No bills set up yet</p>
          <p className="text-sm mt-1">Click "Add Bill" to add your recurring monthly bills</p>
        </div>
      ) : (
        <>
          {/* Unpaid bills */}
          {unpaid.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                <h3 className="font-semibold text-red-700">Unpaid — {unpaid.length} bill{unpaid.length > 1 ? 's' : ''}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {unpaid.map(bill => {
                  const overdue = isOverdue(bill)
                  const isEditing = editingId === bill.id
                  const isOwner = bill.user_id === user.id

                  return isEditing ? (
                    <div key={bill.id} className="p-4 bg-indigo-50 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        maxLength={100} className="border border-gray-300 rounded px-2 py-1.5 text-sm col-span-2 sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                        min="0.01" step="0.01" max="9999999" className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Due day:</span>
                        <input type="number" value={editForm.due_day} onChange={e => setEditForm({ ...editForm, due_day: e.target.value })}
                          min="1" max="31" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={() => handleEditSave(bill.id)} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    <div key={bill.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <button onClick={() => handleMarkPaid(bill)}
                        className="shrink-0 text-gray-300 hover:text-green-500 transition-colors">
                        <Circle size={22} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${overdue ? 'text-red-700' : 'text-gray-900'}`}>
                          {bill.name}
                          {overdue && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Overdue</span>}
                        </p>
                        <p className="text-xs text-gray-400">{bill.category} · Due on the {bill.due_day}{getDaySuffix(bill.due_day)}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">${Number(bill.amount).toFixed(2)}</span>
                      {isOwner && (
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingId(bill.id); setEditForm({ name: bill.name, amount: bill.amount, category: bill.category, due_day: bill.due_day }) }}
                            className="text-gray-400 hover:text-indigo-500 p-1"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(bill.id)}
                            className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Paid bills */}
          {paid.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                <h3 className="font-semibold text-green-700">Paid — {paid.length} bill{paid.length > 1 ? 's' : ''}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {paid.map(bill => {
                  const payment = payments.find(p => p.bill_id === bill.id)
                  return (
                    <div key={bill.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                      <button onClick={() => handleMarkUnpaid(bill)}
                        className="shrink-0 text-green-500 hover:text-red-400 transition-colors">
                        <CheckCircle2 size={22} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-400 line-through">{bill.name}</p>
                        <p className="text-xs text-gray-400">
                          {bill.category} · Paid {payment?.paid_at ? new Date(payment.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">${Number(bill.amount).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}
