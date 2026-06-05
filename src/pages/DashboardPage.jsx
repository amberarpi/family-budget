import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MONTHS } from '../lib/constants'
import { TrendingUp, TrendingDown, Wallet, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [profiles, setProfiles] = useState({}) // { user_id: first_name }
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    fetchYearData()
  }, [selectedYear])

  async function fetchYearData() {
    setLoading(true)
    setFetchError('')
    const { data: rows, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('year', selectedYear)
    if (error) { setFetchError('Failed to load data. Please refresh.'); setLoading(false); return }

    setData(rows || [])

    // Fetch profiles for all users who have transactions
    const uniqueIds = [...new Set((rows || []).map(t => t.user_id))]
    if (uniqueIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, first_name')
        .in('id', uniqueIds)
      const map = {}
      for (const p of profileRows || []) {
        map[p.id] = p.first_name || null
      }
      setProfiles(map)
    }
    setLoading(false)
  }

  const userIds = [...new Set(data.map(t => t.user_id))]

  // Label each user by their first name from profiles, fallback to email prefix
  function getLabel(uid) {
    if (profiles[uid]) return profiles[uid]
    if (uid === user.id) {
      const part = user.email.split('@')[0]
      return part.charAt(0).toUpperCase() + part.slice(1)
    }
    return 'Family Member'
  }

  const currentMonthData = data.filter(t => t.month === selectedMonth)
  const totalIncome = currentMonthData.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = currentMonthData.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const net = totalIncome - totalExpenses

  const monthlyChart = MONTHS.map((month, i) => {
    const monthData = data.filter(t => t.month === i + 1)
    return {
      month: month.slice(0, 3),
      Income: monthData.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      Expenses: monthData.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    }
  })

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>${Math.abs(value).toFixed(2)}</p>
        </div>
        <div className={`p-2 rounded-lg ${color === 'text-green-600' ? 'bg-green-100' : color === 'text-red-600' ? 'bg-red-100' : 'bg-indigo-100'}`}>
          <Icon size={20} className={color} />
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-2">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
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
      ) : fetchError ? (
        <div className="text-center py-12 text-red-500">{fetchError}</div>
      ) : (
        <>
          {/* Combined summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Total Income" value={totalIncome} icon={TrendingUp} color="text-green-600" />
            <StatCard title="Total Expenses" value={totalExpenses} icon={TrendingDown} color="text-red-600" />
            <StatCard
              title="Net Savings"
              value={net}
              icon={Wallet}
              color={net >= 0 ? 'text-indigo-600' : 'text-orange-600'}
            />
            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entries</p>
                  <p className="text-3xl font-bold mt-1 text-gray-800">{currentMonthData.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-gray-100">
                  <Users size={20} className="text-gray-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Combined family</p>
            </div>
          </div>

          {/* Per-person breakdown */}
          {userIds.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Individual Breakdown — {MONTHS[selectedMonth - 1]} {selectedYear}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userIds.map(uid => {
                  const personData = currentMonthData.filter(t => t.user_id === uid)
                  const income = personData.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
                  const expenses = personData.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
                  const label = getLabel(uid)
                  const isMe = uid === user.id

                  return (
                    <div key={uid} className={`bg-white border-2 rounded-xl p-5 shadow-sm ${isMe ? 'border-indigo-200' : 'border-pink-200'}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-3 h-3 rounded-full ${isMe ? 'bg-indigo-500' : 'bg-pink-500'}`} />
                        <h4 className="font-semibold text-gray-900">{label}</h4>
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

          {/* Yearly chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-6">{selectedYear} Overview — Income vs Expenses</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyChart} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={v => `$${v.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly summary table */}
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
                  {monthlyChart.map(row => (
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
        </>
      )}
    </div>
  )
}
