import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import HomePage from './components/HomePage'
import AuthPage from './components/AuthPage'
import CourseDetail from './components/CourseDetail'
import Dashboard from './components/Dashboard'
import Navbar from './components/Navbar'

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'))
  const navigate = useNavigate()

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }, [token, user])

  const handleSignOut = () => {
    setToken('')
    setUser(null)
    navigate('/')
  }

  return (
    <div className="app-shell">
      <Navbar user={user} onSignOut={handleSignOut} />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<HomePage token={token} user={user} />} />
          <Route path="/login" element={<AuthPage mode="login" setToken={setToken} setUser={setUser} />} />
          <Route path="/register" element={<AuthPage mode="register" setToken={setToken} setUser={setUser} />} />
          <Route path="/course/:slug" element={<CourseDetail token={token} user={user} />} />
          <Route path="/dashboard" element={user ? <Dashboard token={token} user={user} /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
