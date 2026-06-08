import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../contexts/HouseholdContext'
import { MONTHS, CATEGORY_COLORS } from '../lib/constants'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis
} from 'recharts'

const now = new Date()
const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

function monthKey(month, year) {
  return `${MONTHS[month - 1].slice(0, 3)} ${year}`
}

export default function AnalysisPage() {
  const { household } = useHousehold()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  // Single month mode
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  // Range mode
  const [mode, setMode] = useState('single') // 'single' | 'range'
  const [fromMonth, setFromMonth] = useState(1)
  const [fromYear, setFromYear] = useState(now.getFullYear())
  const [toMonth, setToMonth] = useState(now.getMonth() + 1)
  const [toYear, setToYear] = useState(now.getFullYear())

  useEffect(() => { fetchData() }, [selectedMonth, selectedYear, mode, fromMonth, fromYear, toMonth, toYear])

  async function fetchData() {
    setLoading(true)
    setFetchError('')
    let query = supabase.from('transactions').select('*')

    if (mode === 'single') {
      query = query.eq('month', selectedMonth).eq('year', selectedYear)
    } else {
      // Fetch all transactions in the year range and filter client-side
      query = query.gte('year', fromYear).lte('year', toYear)
    }

    const { data, error } = await query
    if (error) { setFetchError('Failed to load data. Please refresh.'); setLoading(false); return }

    if (mode === 'range') {
      // Filter to only months within the range
      const filtered = (data || []).filter(t => {
        const tKey = t.year * 100 + t.month
        const fromKey = fromYear * 100 + fromMonth
        const toKey = toYear * 100 + toMonth
        return tKey >= fromKey && tKey <= toKey
      })
      setTransactions(filtered)
    } else {
      setTransactions(data || [])
    }
    setLoading(false)
  }

  const expenses = transactions.filter(t => t.type === 'expense')
  const totalExpenses = expenses.reduce((s, t) => s + Number(t.amount), 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)

  // Aggregate by category (for pie + bar + detail)
  const byCategory = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
    return acc
  }, {})
  const pieData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)

  // Range: monthly comparison data
  function getRangeMonths() {
    const months = []
    let y = fromYear, m = fromMonth
    while (y * 100 + m <= toYear * 100 + toMonth) {
      months.push({ month: m, year: y, label: monthKey(m, y) })
      m++
      if (m > 12) { m = 1; y++ }
    }
    return months
  }

  const rangeMonths = mode === 'range' ? getRangeMonths() : []
  const rangeChartData = rangeMonths.map(({ month, year, label }) => {
    const monthTx = transactions.filter(t => t.month === month && t.year === year)
    return {
      label,
      Income: monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      Expenses: monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    }
  })

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-sm">
          <p className="font-medium text-gray-800">{name}</p>
          <p className="text-gray-600">${value.toFixed(2)} ({totalExpenses > 0 ? ((value / totalExpenses) * 100).toFixed(1) : 0}%)</p>
        </div>
      )
    }
    return null
  }

  const rangeLabel = mode === 'range'
    ? `${monthKey(fromMonth, fromYear)} – ${monthKey(toMonth, toYear)}`
    : `${MONTHS[selectedMonth - 1]} ${selectedYear}`

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Header + filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 shrink-0">Spending Analysis</h2>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm shrink-0">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-2 font-medium transition-colors whitespace-nowrap ${mode === 'single' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Single Month
            </button>
            <button
              onClick={() => setMode('range')}
              className={`px-3 py-2 font-medium transition-colors whitespace-nowrap ${mode === 'range' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
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
      ) : expenses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <p className="text-lg">No expense data for {rangeLabel}</p>
          <p className="text-sm mt-1">Add expenses in the Transactions tab to see analysis</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Income</p>
              <p className="text-lg sm:text-2xl font-bold text-green-700 mt-1 truncate">${totalIncome.toFixed(2)}</p>
              <p className="text-xs text-green-600 mt-1 truncate">{rangeLabel}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
              <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Expenses</p>
              <p className="text-lg sm:text-2xl font-bold text-red-700 mt-1 truncate">${totalExpenses.toFixed(2)}</p>
              <p className="text-xs text-red-600 mt-1 truncate">{rangeLabel}</p>
            </div>
            <div className={`${totalIncome - totalExpenses >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-orange-50 border-orange-200'} border rounded-xl p-3 sm:p-4`}>
              <p className={`text-xs font-medium uppercase tracking-wide ${totalIncome - totalExpenses >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>Net</p>
              <p className={`text-lg sm:text-2xl font-bold mt-1 truncate ${totalIncome - totalExpenses >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>
                ${Math.abs(totalIncome - totalExpenses).toFixed(2)}
              </p>
              <p className={`text-xs mt-1 truncate ${totalIncome - totalExpenses >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>{rangeLabel}</p>
            </div>
          </div>

          {/* Range: month-by-month comparison chart */}
          {mode === 'range' && rangeChartData.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Month-by-Month Comparison</h3>
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

          {/* Pie + bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-1">Spending Breakdown</h3>
              <p className="text-sm text-gray-500 mb-4">Total: ${totalExpenses.toFixed(2)}</p>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="40%" outerRadius={80} dataKey="value" label={false}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center"
                    formatter={(value) => <span style={{ fontSize: 12, color: '#374151' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">By Category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pieData} layout="vertical" margin={{ left: 60 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip formatter={v => `$${Number(v).toFixed(2)}`} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category detail */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Category Detail</h3>
            <div className="space-y-3">
              {pieData.map(item => {
                const pct = totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{item.name}</span>
                      <span className="text-gray-500">${item.value.toFixed(2)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[item.name] || '#9ca3af' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {pieData.length > 0 && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800">
                  Top spending category: <span className="font-bold">{pieData[0].name}</span> at ${pieData[0].value.toFixed(2)} ({((pieData[0].value / totalExpenses) * 100).toFixed(1)}% of total)
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
