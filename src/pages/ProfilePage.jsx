import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { User, KeyRound, CheckCircle, Camera } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileInputRef = useRef(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
      }
    }
    loadProfile()
  }, [user.id])

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Image must be smaller than 2MB.')
      return
    }

    setAvatarLoading(true)
    setProfileError('')

    const ext = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setProfileError('Failed to upload image. Please try again.')
      setAvatarLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`

    await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl })
    setAvatarUrl(urlWithBust)
    setAvatarLoading(false)
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileLoading(true)

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    })

    if (error) setProfileError(error.message)
    else setProfileSuccess('Profile updated successfully.')
    setProfileLoading(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')

    if (newPassword !== confirmPassword) { setPwError('New passwords do not match.'); return }
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return }

    setPwLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (signInError) { setPwError('Current password is incorrect.'); setPwLoading(false); return }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) setPwError(updateError.message)
    else {
      setPwSuccess('Password updated successfully.')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    }
    setPwLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>

      {/* Account Info + Avatar */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full">
            <User size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Account Details</h3>
            <p className="text-sm text-gray-500">Your account information</p>
          </div>
        </div>

        {/* Avatar upload */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-indigo-400" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={avatarLoading}
              className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-full shadow transition-colors"
              title="Change photo"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">{firstName || user?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WebP · Max 2MB</p>
            {avatarLoading && <p className="text-xs text-indigo-500 mt-1">Uploading...</p>}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-500">Email</span>
            <span className="text-sm text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-500">Account ID</span>
            <span className="text-sm text-gray-400 font-mono">{user?.id?.slice(0, 8)}...</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-sm font-medium text-gray-500">Member since</span>
            <span className="text-sm text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                maxLength={50} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Amber" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                maxLength={50} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Smith" />
            </div>
          </div>

          {profileError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{profileError}</p>}
          {profileSuccess && (
            <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle size={16} />{profileSuccess}
            </div>
          )}

          <button type="submit" disabled={profileLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
            {profileLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full">
            <KeyRound size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Change Password</h3>
            <p className="text-sm text-gray-500">Choose a strong password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input type="password" required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Repeat new password" />
          </div>

          {pwError && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{pwError}</p>}
          {pwSuccess && (
            <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle size={16} />{pwSuccess}
            </div>
          )}

          <button type="submit" disabled={pwLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
