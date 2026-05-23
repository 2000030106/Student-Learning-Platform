import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, fetchProfile } from '../api'

const AuthPage = ({ mode, setToken, setUser }) => {
  const [form, setForm] = useState({ name: '', username: '', email: '', phone: '', password: '', role: 'student' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const updateSession = async (accessToken) => {
    const profile = await fetchProfile(accessToken)
    setUser(profile)
    setToken(accessToken)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      if (mode === 'login') {
        const data = await login(form.username, form.password)
        await updateSession(data.access_token)
        navigate('/')
      } else {
        await register(form.role, form)
        // After successful registration, redirect user to the login page
        // instead of automatically logging them in.
        navigate('/login')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to submit credentials')
    }
  }

  return (
    <section className="auth-panel">
      <div className="auth-card">
        <h2>{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
        {mode === 'register' && (
          <div className="field-group">
            <label>Name</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Full name" />
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label>Username</label>
            <input name="username" value={form.username} onChange={handleChange} required />
          </div>
          {mode === 'register' && (
            <>
              <div className="field-group">
                <label>Email</label>
                <input name="email" value={form.email} onChange={handleChange} type="email" required />
              </div>
              <div className="field-group">
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className="field-group">
                <label>Account Type</label>
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="student">Student</option>
                  <option value="trainer">Trainer</option>
                </select>
              </div>
            </>
          )}
          <div className="field-group">
            <label>Password</label>
            <input name="password" value={form.password} onChange={handleChange} type="password" required />
          </div>
          {error && <div className="alert">{error}</div>}
          <button className="button primary" type="submit">
            {mode === 'login' ? 'Sign in' : 'Register'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default AuthPage
