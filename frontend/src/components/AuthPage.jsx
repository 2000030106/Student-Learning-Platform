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
        setToken('')
        setUser(null)
        navigate('/login')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to submit credentials')
    }
  }

  return (
    <section className="auth-panel auth-experience">
      <div className="auth-visual">
        <span className="eyebrow">Innolance Learning</span>
        <h1>{mode === 'login' ? 'Continue your learning workspace.' : 'Create your student or trainer account.'}</h1>
        <p>{mode === 'login' ? 'Access courses, quizzes, assignments, and coding practice from one focused dashboard.' : 'Students can request course access. Trainers can build quizzes, assignments, and learning material after approval.'}</p>
        <div className="auth-metrics">
          <article><strong>Quiz</strong><span>Timed tests</span></article>
          <article><strong>Tasks</strong><span>File uploads</span></article>
          <article><strong>Code</strong><span>Practice lab</span></article>
        </div>
      </div>
      <div className="auth-card">
        <span className="auth-chip">{mode === 'login' ? 'Welcome back' : 'New account'}</span>
        <h2>{mode === 'login' ? 'Sign in' : 'Register'}</h2>
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="field-group">
              <label>Name</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Full name" required />
            </div>
          )}
          <div className="field-group">
            <label>Username</label>
            <input name="username" value={form.username} onChange={handleChange} placeholder="Enter username" required />
          </div>
          {mode === 'register' && (
            <>
              <div className="field-group">
                <label>Email</label>
                <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="name@example.com" required />
              </div>
              <div className="field-group">
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Mobile number" />
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
            <input name="password" value={form.password} onChange={handleChange} type="password" placeholder="Enter password" required />
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
