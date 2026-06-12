import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { DollarSign } from 'lucide-react'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (isSignUp) {
      // Validate join code first
      const { data: household, error: codeError } = await supabase
        .from('households')
        .select('id, name')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single()

      if (codeError || !household) {
        setError('Invalid join code. Please check the code and try again.')
        setLoading(false)
        return
      }

      // Create the account
      const { data: signUpData, error: signUpError } = await signUp(email, password)
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Add to household as member
      // signUpData.user is available immediately when email confirmation is disabled
      const userId = signUpData?.user?.id
      if (userId) {
        const { error: memberError } = await supabase.from('household_members').insert({
          household_id: household.id,
          user_id: userId,
          role: 'member',
        })
        if (memberError) {
          setError('Account created but failed to join household. Please contact your admin.')
          setLoading(false)
          return
        }
        setMessage(`Welcome! You've joined "${household.name}". You can now sign in.`)
      } else {
        setMessage(`Account created! You've joined "${household.name}". Check your email to confirm, then sign in.`)
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-indigo-600 text-white p-3 rounded-xl">
            <DollarSign size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Family Budget</h1>
            <p className="text-sm text-gray-500">Track your finances together</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          {isSignUp ? 'Join your household' : 'Welcome back'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Household Join Code</label>
              <input
                type="text"
                required
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest font-mono"
                placeholder="Enter your join code"
                maxLength={20}
              />
              <p className="text-xs text-gray-400 mt-1">Ask your household admin for the join code</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          {message && <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg p-3">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Join Household' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {isSignUp ? 'Already have an account?' : "Have a join code?"}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
            className="text-indigo-600 font-medium hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
