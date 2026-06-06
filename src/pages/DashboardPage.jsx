import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MONTHS } from '../lib/constants'
import { TrendingUp, TrendingDown, Wallet, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const now = new Date()
const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

function monthKey(month, year) {
  return `${MONTHS[month - 1].slice(0, 3)} ${year}`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  const [mode, setMode] = useState('single')

  // Single month
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  // Range
  const [fromMonth, setFromMonth] = useState(1)
  const [fromYear, setFromYear] = useState(now.getFullYear())
  const [toMonth, setToMonth] = useState(now.getMonth() + 1)
  const [toYear, setToYear] = useState(now.getFullYear())

  useEffect(() => { fetchData() }, [mode, selectedMonth, selectedYear, fromMonth, fromYear, toMonth, toYear])

  async function fetchData() {
    setLoading(true)
    setFetchError('')

    let query = supabase.from('transactions').select('*')

    if (mode === 'single') {
      query = query.eq('month', selectedMonth).eq('year', selectedYear)
    } else {
      query = query.gte('year', fromYear).lte('year', toYear)
    }

    const { data: rows, error } = await query
    if (error) { setFetchError('Failed to load data. Please refresh.'); setLoading(false); return }

    let filtered = rows || []
    if (mode === 'range') {
      filtered = filtered.filter(t => {
        const tKey = t.year * 100 + t.month
        return tKey >= fromYear * 100 + fromMonth && tKey <= toYear * 100 + toMonth
      })
    }

    setData(filtered)

    const uniqueIds = [...new Set(filtered.map(t => t.user_id))]
    if (uniqueIds.length > 0) {
      const { data: profileRows } = await supabase.from('profiles').select('id, first_name').in('id', uniqueIds)
      const map = {}
      for (const p of profileRows || []) map[p.id] = p.first_name || null
      setProfiles(map)
    }
    setLoading(false)
  }

  function getLabel(uid) {
    if (profiles[uid]) return profiles[uid]
    if (uid === user.id) {
      const part = user.email.split('@')[0]
      return part.charAt(0).toUpperCase() + part.slice(1)
    }
    return 'Family Member'
  }

  const totalIncome = data.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = data.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const net = totalIncome - totalExpenses
  const userIds = [...new Set(data.map(t => t.user_id))]

  // Month-by-month chart (range mode)
  function getRangeMonths() {
    const months = []
    let y = fromYear, m = fromMonth
    while (y * 100 + m <= toYear * 100 + toMonth) {
      months.push({ month: m, year: y, label: monthKey(m, y) })
      m++; if (m > 12) { m = 1; y++ }
    }
    return months
  }

  const rangeChartData = mode === 'range' ? getRangeMonths().map(({ month, year, label }) => {
    const monthTx = data.filter(t => t.month === month && t.year === year)
    return {
      label,
      Income: monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      Expenses: monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    }
  }) : []

  // Yearly overview chart (single mode)
  const yearlyChart = MONTHS.map((month, i) => {
    const monthData = data.filter(t => t.month === i + 1)
    return {
      month: month.slice(0, 3),
      Income: monthData.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      Expenses: monthData.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    }
  })

  const rangeLabel = mode === 'range'
    ? `${monthKey(fromMonth, fromYear)} – ${monthKey(toMonth, toYear)}`
    : `${MONTHS[selectedMonth - 1]} ${selectedYear}`

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white border rounded-xl p-3 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
          <p className={`text-lg sm:text-3xl font-bold mt-1 truncate ${color}`}>${Math.abs(value).toFixed(2)}</p>
        </div>
        <div className={`p-2 rounded-lg shrink-0 ml-2 ${color === 'text-green-600' ? 'bg-green-100' : color === 'text-red-600' ? 'bg-red-100' : 'bg-indigo-100'}`}>
          <Icon size={18} className={color} />
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2 truncate">{rangeLabel}</p>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header + mode toggle */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            <button
              onClick={() => setMode('single')}
              className={`px-4 py-2 font-medium transition-colors ${mode === 'single' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Single Month
            </button>
            <button
              onClick={() => setMode('range')}
              className={`px-4 py-2 font-medium transition-colors ${mode === 'range' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Date Range
            </button>
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

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : fetchError ? (
        <div className="text-center py-12 text-red-500">{fetchError}</div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Total Income" value={totalIncome} icon={TrendingUp} color="text-green-600" />
            <StatCard title="Total Expenses" value={totalExpenses} icon={TrendingDown} color="text-red-600" />
            <StatCard title="Net Savings" value={net} icon={Wallet} color={net >= 0 ? 'text-indigo-600' : 'text-orange-600'} />
            <div className="bg-white border rounded-xl p-3 sm:p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entries</p>
                  <p className="text-lg sm:text-3xl font-bold mt-1 text-gray-800">{data.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-gray-100 shrink-0 ml-2">
                  <Users size={18} className="text-gray-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Combined family</p>
            </div>
          </div>

          {/* Individual breakdown */}
          {userIds.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Individual Breakdown — {rangeLabel}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userIds.map(uid => {
                  const personData = data.filter(t => t.user_id === uid)
                  const income = personData.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
                  const expenses = personData.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
                  const isMe = uid === user.id
                  return (
                    <div key={uid} className={`bg-white border-2 rounded-xl p-5 shadow-sm ${isMe ? 'border-indigo-200' : 'border-pink-200'}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-3 h-3 rounded-full ${isMe ? 'bg-indigo-500' : 'bg-pink-500'}`} />
                        <h4 className="font-semibold text-gray-900">{getLabel(uid)}</h4>
                        {isMe && <span className="text-xs text-indigo-500 font-medium">(you)</span>}
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Income</span>
                          <span className="font-semibold text-green-600">${income.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Expenses</span>
                          <span className="font-semibold text-red-600">${expenses.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                          <span className="text-gray-500">Net</span>
                          <span className={`font-bold ${income - expenses >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
                            {income - expenses >= 0 ? '' : '-'}${Math.abs(income - expenses).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">{personData.length} {personData.length === 1 ? 'entry' : 'entries'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Range: month-by-month chart */}
          {mode === 'range' && rangeChartData.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-6">Month-by-Month Comparison</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rangeChartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={v => `$${Number(v).toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Single: yearly overview chart */}
          {mode === 'single' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-6">{selectedYear} Overview — Income vs Expenses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={yearlyChart} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={v => `$${v.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly summary table */}
          {mode === 'single' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Monthly Summary — {selectedYear}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Income</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Expenses</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {yearlyChart.map(row => (
                      <tr key={row.month} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-700">{row.month}</td>
                        <td className="py-2 px-3 text-right text-green-600">${row.Income.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-red-600">${row.Expenses.toFixed(2)}</td>
                        <td className={`py-2 px-3 text-right font-medium ${row.Income - row.Expenses >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
                          {row.Income - row.Expenses >= 0 ? '' : '-'}${Math.abs(row.Income - row.Expenses).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Range: summary table per month */}
          {mode === 'range' && rangeChartData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Summary — {rangeLabel}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Income</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Expenses</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rangeChartData.map(row => (
                      <tr key={row.label} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-700">{row.label}</td>
                        <td className="py-2 px-3 text-right text-green-600">${row.Income.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-red-600">${row.Expenses.toFixed(2)}</td>
                        <td className={`py-2 px-3 text-right font-medium ${row.Income - row.Expenses >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
                          {row.Income - row.Expenses >= 0 ? '' : '-'}${Math.abs(row.Income - row.Expenses).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
