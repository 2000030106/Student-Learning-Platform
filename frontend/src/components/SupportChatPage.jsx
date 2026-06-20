import { useState, useEffect } from 'react'
import * as api from '../api'
import '../styles.css'

export default function SupportChatPage({ token, user }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showNewMessageForm, setShowNewMessageForm] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [courseMessages, setCourseMessages] = useState([])
  const [reply, setReply] = useState({})

  useEffect(() => {
    if (token) {
      if (user?.role === 'student') {
        loadStudentMessages()
      } else if (user?.role === 'trainer' || user?.role === 'admin') {
        loadCourses()
      }
    }
  }, [token, user])

  const loadStudentMessages = async () => {
    try {
      const msgs = await api.getMySupportMessages(token)
      setMessages(msgs)
      setLoading(false)
    } catch (err) {
      setError('Failed to load messages')
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    try {
      const courses = await api.fetchCourses()
      setCourses(courses)
      setLoading(false)
    } catch (err) {
      setError('Failed to load courses')
      setLoading(false)
    }
  }

  const loadCourseMessages = async (courseId) => {
    try {
      const data = await api.getCourseSupportMessages(courseId, token)
      setCourseMessages(data.messages || [])
    } catch (err) {
      setError('Failed to load course messages')
    }
  }

  const handleCreateQuestion = async () => {
    if (!questionText.trim() || !selectedCourse) {
      setError('Please enter a question and select a course')
      return
    }
    try {
      const newMsg = await api.createSupportMessage(selectedCourse, questionText, token)
      setMessages([newMsg, ...messages])
      setQuestionText('')
      setShowNewMessageForm(false)
      setSuccess('Question submitted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to submit question')
    }
  }

  const handleReply = async (messageId) => {
    if (!reply[messageId] || !reply[messageId].trim()) {
      setError('Please enter a reply')
      return
    }
    try {
      await api.answerSupportMessage(messageId, reply[messageId], token)
      loadCourseMessages(selectedCourse)
      setReply({ ...reply, [messageId]: '' })
      setSuccess('Reply sent successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to send reply')
    }
  }

  if (loading) return <div className="loading">Loading support messages...</div>

  return (
    <div className="support-chat-page">
      <div className="support-container">
        <h1>Support Chat</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {user?.role === 'student' && (
          <div className="support-section">
            <div className="section-header">
              <h2>My Questions</h2>
              <button onClick={() => setShowNewMessageForm(!showNewMessageForm)} className="btn-primary">
                {showNewMessageForm ? 'Cancel' : 'Ask a Question'}
              </button>
            </div>

            {showNewMessageForm && (
              <div className="new-question-form">
                <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="form-input">
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Ask your question here..."
                  className="form-textarea"
                />
                <button onClick={handleCreateQuestion} className="btn-primary">
                  Submit Question
                </button>
              </div>
            )}

            <div className="messages-list">
              {messages.length === 0 ? (
                <p>No questions yet. Ask a question to get help from trainers!</p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="message-item">
                    <div className="message-header">
                      <strong>{msg.course.title}</strong>
                      {msg.is_resolved && <span className="badge resolved">Resolved</span>}
                      {!msg.is_resolved && <span className="badge pending">Pending</span>}
                    </div>
                    <p className="message-question">{msg.question}</p>
                    {msg.answer && (
                      <div className="message-answer">
                        <strong>Answer from trainer:</strong>
                        <p>{msg.answer}</p>
                      </div>
                    )}
                    <small>{new Date(msg.created_at).toLocaleString()}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {(user?.role === 'trainer' || user?.role === 'admin') && (
          <div className="support-section">
            <div className="section-header">
              <h2>Course Support Messages</h2>
              <select onChange={(e) => { setSelectedCourse(e.target.value); loadCourseMessages(e.target.value); }} className="form-input">
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedCourse && (
              <div className="messages-list">
                {courseMessages.length === 0 ? (
                  <p>No questions for this course yet.</p>
                ) : (
                  courseMessages.map((msg) => (
                    <div key={msg.id} className="message-item trainer-view">
                      <div className="message-header">
                        <strong>{msg.student.name}</strong>
                        {msg.is_resolved && <span className="badge resolved">Answered</span>}
                        {!msg.is_resolved && <span className="badge pending">Pending</span>}
                      </div>
                      <p className="message-question"><strong>Question:</strong> {msg.question}</p>
                      {msg.answer && (
                        <div className="message-answer">
                          <strong>Your Answer:</strong>
                          <p>{msg.answer}</p>
                        </div>
                      )}
                      {!msg.is_resolved && (
                        <div className="reply-form">
                          <textarea
                            value={reply[msg.id] || ''}
                            onChange={(e) => setReply({ ...reply, [msg.id]: e.target.value })}
                            placeholder="Write your answer..."
                            className="form-textarea"
                          />
                          <button onClick={() => handleReply(msg.id)} className="btn-primary">
                            Send Answer
                          </button>
                        </div>
                      )}
                      <small>{new Date(msg.created_at).toLocaleString()}</small>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
