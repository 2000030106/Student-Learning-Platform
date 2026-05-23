import { useEffect, useState } from 'react'
import { fetchPendingRequests, approveRequest, fetchMyRequests } from '../api'

const Dashboard = ({ token, user }) => {
  const [pending, setPending] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'trainer') {
      fetchPendingRequests(token)
        .then(setPending)
        .catch(() => setError('Unable to load pending requests.'))
    }
    if (user?.role === 'student') {
      fetchMyRequests(token)
        .then(setMyRequests)
        .catch(() => setError('Unable to load your requests.'))
    }
  }, [token, user])

  const handleApprove = async (requestId, approve) => {
    setMessage('')
    setError('')
    try {
      await approveRequest(requestId, approve, token)
      setMessage('Request updated successfully.')
      setPending((prev) => prev.filter((item) => item.id !== requestId))
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update request.')
    }
  }

  return (
    <section className="dashboard-page">
      <h1>Welcome, {user?.username}</h1>
      <p className="subtitle">Role: {user?.role}</p>
      {message && <div className="success-box">{message}</div>}
      {error && <div className="alert">{error}</div>}
      {user?.role === 'student' && (
        <div className="dashboard-card">
          <h2>Your access requests</h2>
          {myRequests.length === 0 ? (
            <p>No course requests yet.</p>
          ) : (
            <ul>
              {myRequests.map((request) => (
                <li key={request.id}>
                  Course ID {request.course_id} — {request.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {(user?.role === 'trainer' || user?.role === 'admin') && (
        <div className="dashboard-card">
          <h2>Pending access requests</h2>
          {pending.length === 0 ? (
            <p>No requests pending review.</p>
          ) : (
            <ul className="request-list">
              {pending.map((request) => (
                <li key={request.id}>
                  <div>
                    Request {request.id} for course {request.course_id} by user {request.user_id}
                  </div>
                  {user?.role === 'admin' ? (
                    <div className="request-actions">
                      <button className="button small" onClick={() => handleApprove(request.id, true)}>
                        Approve
                      </button>
                      <button className="button secondary small" onClick={() => handleApprove(request.id, false)}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <small>Only admin can approve or reject requests.</small>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default Dashboard
