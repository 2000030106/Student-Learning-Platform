import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, fetchProfile, requestOTP, verifyOTP } from '../api'

const AuthPage = ({ mode, setToken, setUser }) => {
  const [form, setForm] = useState({ name: '', username: '', email: '', phone: '', password: '', role: 'student' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [useOTP, setUseOTP] = useState(false)
  const [otpMethod, setOtpMethod] = useState('email')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState(1) // 1: initial, 2: OTP sent, 3: verify
  const [captcha, setCaptcha] = useState('')
  const [captchaText, setCaptchaText] = useState(generateCaptcha())
  const navigate = useNavigate()

  function generateCaptcha() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const updateSession = async (accessToken) => {
    const profile = await fetchProfile(accessToken)
    setUser(profile)
    setToken(accessToken)
  }

  const validateCaptcha = () => {
    return captcha.toUpperCase() === captchaText.toUpperCase()
  }

  const handleRequestOTP = async (event) => {
    event.preventDefault()
    setError('')
    if (!validateCaptcha()) {
      setError('Incorrect CAPTCHA. Please try again.')
      setCaptcha('')
      return
    }
    try {
      await requestOTP(form.username, otpMethod)
      setSuccess(`OTP sent to your ${otpMethod}`)
      setStep(2)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP')
    }
  }

  const handleVerifyOTP = async (event) => {
    event.preventDefault()
    setError('')
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }
    try {
      const data = await verifyOTP(form.username, otpCode)
      await updateSession(data.access_token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!validateCaptcha()) {
      setError('Incorrect CAPTCHA. Please try again.')
      setCaptcha('')
      return
    }
    try {
      if (mode === 'login') {
        const data = await login(form.username, form.password)
        await updateSession(data.access_token)
        navigate('/')
      } else {
        await register(form.role, form)
        setSuccess('Account created successfully! Redirecting to login...')
        setTimeout(() => navigate('/login'), 2000)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to submit credentials')
    }
  }

  if (mode === 'login' && useOTP && step === 2) {
    return (
      <section className="auth-panel auth-experience">
        <div className="auth-visual">
          <span className="eyebrow">Innolance Learning</span>
          <h1>Verify Your OTP</h1>
          <p>We've sent a one-time password (OTP) to your registered {otpMethod}. Please enter it below to continue.</p>
        </div>
        <div className="auth-card">
          <span className="auth-chip">OTP Verification</span>
          <h2>Enter OTP</h2>
          <form onSubmit={handleVerifyOTP}>
            <div className="field-group">
              <label>6-Digit OTP</label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="000000"
                maxLength="6"
                required
              />
              <small>OTP expires in 10 minutes</small>
            </div>
            {error && <div className="alert">{error}</div>}
            {success && <div className="success-box">{success}</div>}
            <button className="button primary" type="submit">Verify OTP</button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setStep(1)
                setOtpCode('')
                setError('')
                setCaptcha('')
                setCaptchaText(generateCaptcha())
              }}
            >
              Back
            </button>
          </form>
        </div>
      </section>
    )
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
        
        {mode === 'login' && (
          <div className="login-method-toggle">
            <button
              type="button"
              className={`method-btn ${!useOTP ? 'active' : ''}`}
              onClick={() => {
                setUseOTP(false)
                setStep(1)
                setError('')
              }}
            >
              Password Login
            </button>
            <button
              type="button"
              className={`method-btn ${useOTP ? 'active' : ''}`}
              onClick={() => {
                setUseOTP(true)
                setStep(1)
                setError('')
                setCaptcha('')
                setCaptchaText(generateCaptcha())
              }}
            >
              OTP Login
            </button>
          </div>
        )}

        <form onSubmit={useOTP ? handleRequestOTP : handleSubmit}>
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
          
          {useOTP && mode === 'login' && (
            <div className="field-group">
              <label>Receive OTP via:</label>
              <select value={otpMethod} onChange={(e) => setOtpMethod(e.target.value)}>
                <option value="email">Email</option>
              </select>
              <small>We'll send a one-time password to verify your identity</small>
            </div>
          )}

          {!useOTP && (
            <div className="field-group">
              <label>Password</label>
              <input name="password" value={form.password} onChange={handleChange} type="password" placeholder="Enter password" required />
            </div>
          )}

          {/* CAPTCHA */}
          <div className="captcha-field">
            <label>CAPTCHA Verification</label>
            <div className="captcha-container">
              <div className="captcha-text">{captchaText}</div>
              <button type="button" onClick={() => setCaptchaText(generateCaptcha())} className="btn-refresh">
                Refresh
              </button>
            </div>
            <input
              type="text"
              value={captcha}
              onChange={(e) => setCaptcha(e.target.value)}
              placeholder="Enter the characters shown above"
              required
            />
            <small>Enter the 6-character code from the image above</small>
          </div>

          {error && <div className="alert">{error}</div>}
          {success && <div className="success-box">{success}</div>}
          <button className="button primary" type="submit">
            {useOTP ? 'Send OTP' : mode === 'login' ? 'Sign in' : 'Register'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default AuthPage
