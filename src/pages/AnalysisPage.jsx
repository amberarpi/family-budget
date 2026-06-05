import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MONTHS, CATEGORY_COLORS } from '../lib/constants'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis
} from 'recharts'

export default function AnalysisPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  useEffect(() => {
    fetchData()
  }, [selectedMonth, selectedYear])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
    setTransactions(data || [])
    setLoading(false)
  }

  const expenses = transactions.filter(t => t.type === 'expense')
  const totalExpenses = expenses.reduce((s, t) => s + Number(t.amount), 0)

  const byCategory = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
    return acc
  }, {})

  const pieData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

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

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Spending Analysis</h2>
        <div className="flex gap-2">
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
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <p className="text-lg">No expense data for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
          <p className="text-sm mt-1">Add expenses in the Transactions tab to see analysis</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-1">Spending Breakdown</h3>
              <p className="text-sm text-gray-500 mb-4">Total: ${totalExpenses.toFixed(2)}</p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
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
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CATEGORY_COLORS[item.name] || '#9ca3af'
                        }}
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
