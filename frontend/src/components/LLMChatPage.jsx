import { useState, useEffect, useRef } from 'react'
import * as api from '../api'
import '../styles.css'

export default function LLMChatPage({ token, user }) {
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatData, setNewChatData] = useState({ course_id: '', title: 'AI Assistant Chat' })
  const [courses, setCourses] = useState([])
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (token) {
      loadChats()
      loadCourses()
    }
  }, [token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChats = async () => {
    try {
      const allChats = await api.getLLMChats(token)
      setChats(allChats)
      setLoading(false)
    } catch (err) {
      setError('Failed to load chats')
      setLoading(false)
    }
  }

  const loadCourses = async () => {
    try {
      const allCourses = await api.fetchCourses()
      setCourses(allCourses)
    } catch (err) {
      console.error('Failed to load courses:', err)
    }
  }

  const selectChat = async (chat) => {
    try {
      const fullChat = await api.getLLMChat(chat.id, token)
      setSelectedChat(chat)
      setMessages(fullChat.messages || [])
    } catch (err) {
      setError('Failed to load chat messages')
    }
  }

  const createNewChat = async () => {
    if (!newChatData.course_id) {
      setError('Please select a course')
      return
    }
    try {
      const chat = await api.createLLMChat(newChatData.course_id, newChatData.title, token)
      setChats([chat, ...chats])
      setSelectedChat(chat)
      setMessages([])
      setNewChatData({ course_id: '', title: 'AI Assistant Chat' })
      setShowNewChat(false)
      setSuccess('Chat created successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to create chat')
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || !selectedChat) {
      setError('Please enter a message and select a chat')
      return
    }

    setSending(true)
    const userMessage = { role: 'user', content: inputValue }
    setMessages([...messages, userMessage])
    setInputValue('')

    try {
      const response = await api.sendLLMMessage(selectedChat.id, inputValue, token)
      setMessages(response.messages || [])
      setSuccess('Message sent!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      setError('Failed to send message. Make sure Ollama is running on http://localhost:11434')
    } finally {
      setSending(false)
    }
  }

  const deleteChat = async (chatId) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await api.deleteLLMChat(chatId, token)
        setChats(chats.filter((c) => c.id !== chatId))
        if (selectedChat?.id === chatId) {
          setSelectedChat(null)
          setMessages([])
        }
        setSuccess('Chat deleted successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } catch (err) {
        setError('Failed to delete chat')
      }
    }
  }

  if (loading) return <div className="loading">Loading LLM chat...</div>

  return (
    <div className="llm-chat-page">
      <div className="llm-chat-container">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <h2>My Chats</h2>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="btn-primary"
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            {showNewChat ? 'Cancel' : '+ New Chat'}
          </button>

          {showNewChat && (
            <div className="new-chat-form">
              <select
                value={newChatData.course_id}
                onChange={(e) => setNewChatData({ ...newChatData, course_id: e.target.value })}
                className="form-input"
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newChatData.title}
                onChange={(e) => setNewChatData({ ...newChatData, title: e.target.value })}
                placeholder="Chat title (optional)"
                className="form-input"
              />
              <button onClick={createNewChat} className="btn-primary">
                Create Chat
              </button>
            </div>
          )}

          <div className="chats-list">
            {chats.length === 0 ? (
              <p>No chats yet. Create one to start chatting with AI!</p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => selectChat(chat)}
                  className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                >
                  <strong>{chat.title}</strong>
                  <small>{new Date(chat.updated_at).toLocaleDateString()}</small>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChat(chat.id)
                    }}
                    className="btn-delete"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="chat-main">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {selectedChat ? (
            <>
              <div className="chat-header">
                <h2>{selectedChat.title}</h2>
              </div>

              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    <p>Start a conversation with the AI assistant!</p>
                    <p className="hint">Note: Make sure Ollama is running on http://localhost:11434</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                      <div className="message-content">
                        <strong>{msg.role === 'user' ? 'You' : 'AI'}</strong>
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="input-area">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Ask a question or type a message... (Shift+Enter for new line)"
                  className="form-textarea"
                  disabled={sending}
                />
                <button onClick={sendMessage} className="btn-primary" disabled={sending}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <p>Select a chat to start or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
