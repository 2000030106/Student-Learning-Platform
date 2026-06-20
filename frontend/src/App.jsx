import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import HomePage from './components/HomePage'
import AuthPage from './components/AuthPage'
import CourseEditor from './components/CourseEditor'
import CourseDetail from './components/CourseDetail'
import Dashboard from './components/Dashboard'
import RequestsPage from './components/RequestsPage'
import TrainerRequestsPage from './components/TrainerRequestsPage'
import StudentQuizzesPage from './components/StudentQuizzesPage'
import CodingPractice from './components/CodingPractice'
import ProfilePage from './components/ProfilePage'
import SupportChatPage from './components/SupportChatPage'
import LLMChatPage from './components/LLMChatPage'
import Navbar from './components/Navbar'

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'))
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

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
          <Route
            path="/quizzes"
            element={user ? <StudentQuizzesPage token={token} /> : <Navigate to="/login" />}
          />
          <Route path="/practice" element={user ? <CodingPractice token={token} user={user} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <ProfilePage token={token} user={user} setUser={setUser} /> : <Navigate to="/login" />} />
          <Route path="/support" element={user ? <SupportChatPage token={token} user={user} /> : <Navigate to="/login" />} />
          <Route path="/llm-chat" element={user ? <LLMChatPage token={token} user={user} /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={user ? <Dashboard token={token} user={user} theme={theme} setTheme={setTheme} /> : <Navigate to="/login" />} />
          <Route
            path="/requests"
            element={user?.role === 'admin' || user?.role === 'trainer' ? <RequestsPage token={token} user={user} /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/requests/:slug"
            element={user?.role === 'admin' || user?.role === 'trainer' ? <RequestsPage token={token} user={user} /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/trainer-requests"
            element={user?.role === 'admin' ? <TrainerRequestsPage token={token} /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/course-editor"
            element={user?.role === 'admin' ? <CourseEditor token={token} /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/course-editor/:slug"
            element={user?.role === 'admin' ? <CourseEditor token={token} /> : <Navigate to="/dashboard" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
