import { useState } from 'react'
import { changePassword, updateProfile } from '../api'

const ProfilePage = ({ token, user, setUser }) => {
  const [profileForm, setProfileForm] = useState({ email: user?.email || '', phone: user?.phone || '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [editing, setEditing] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const saveProfile = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const updated = await updateProfile(profileForm, token)
      setUser(updated)
      setEditing('')
      setMessage('Profile updated successfully.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update profile.')
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New password and confirmation must match.')
      return
    }
    try {
      await changePassword(
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
        token,
      )
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setMessage('Password changed successfully.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to change password.')
    }
  }

  return (
    <section className="profile-page">
      <div className="profile-hero">
        <div className="profile-avatar">{(user?.name || user?.username || 'U').slice(0, 1).toUpperCase()}</div>
        <div>
          <span className="eyebrow">{user?.role} profile</span>
          <h1>{user?.name}</h1>
          <p>{user?.username}</p>
        </div>
      </div>

      {message && <div className="success-box">{message}</div>}
      {error && <div className="alert">{error}</div>}

      <div className="profile-grid">
        <form className="profile-panel" onSubmit={saveProfile}>
          <div className="profile-panel-heading">
            <div>
              <span className="eyebrow">Contact</span>
              <h2>Email and mobile</h2>
            </div>
          </div>

          <div className="profile-row">
            <label>Email ID</label>
            {editing === 'email' ? (
              <input value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} type="email" required />
            ) : (
              <strong>{profileForm.email}</strong>
            )}
            <button className="button secondary small" type="button" onClick={() => setEditing(editing === 'email' ? '' : 'email')}>
              Edit
            </button>
          </div>

          <div className="profile-row">
            <label>Mobile Number</label>
            {editing === 'phone' ? (
              <input value={profileForm.phone || ''} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
            ) : (
              <strong>{profileForm.phone || 'Not added'}</strong>
            )}
            <button className="button secondary small" type="button" onClick={() => setEditing(editing === 'phone' ? '' : 'phone')}>
              Edit
            </button>
          </div>

          <button className="button primary" type="submit">Save profile</button>
        </form>

        <form className="profile-panel" onSubmit={savePassword}>
          <div className="profile-panel-heading">
            <div>
              <span className="eyebrow">Security</span>
              <h2>Change password</h2>
            </div>
          </div>
          <div className="field-group">
            <label>Current password</label>
            <input type="password" value={passwordForm.current_password} onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })} required />
          </div>
          <div className="field-group">
            <label>New password</label>
            <input type="password" value={passwordForm.new_password} onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })} required />
          </div>
          <div className="field-group">
            <label>Confirm new password</label>
            <input type="password" value={passwordForm.confirm_password} onChange={(event) => setPasswordForm({ ...passwordForm, confirm_password: event.target.value })} required />
          </div>
          <button className="button primary" type="submit">Change password</button>
        </form>
      </div>
    </section>
  )
}

export default ProfilePage
