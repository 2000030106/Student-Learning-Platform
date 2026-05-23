import { useEffect, useState } from 'react'
import { approveTrainerRequest, fetchPendingTrainerRequests } from '../api'

const TrainerRequestsPage = ({ token }) => {
  const [requests, setRequests] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadRequests = () => {
    fetchPendingTrainerRequests(token)
      .then(setRequests)
      .catch(() => setError('Unable to load trainer course requests.'))
  }

  useEffect(() => {
    loadRequests()
  }, [token])

  const handleDecision = async (requestId, approve) => {
    setMessage('')
    setError('')
    try {
      await approveTrainerRequest(requestId, approve, token)
      setRequests((prev) => prev.filter((request) => request.id !== requestId))
      setMessage(approve ? 'Trainer approved for this course.' : 'Trainer request rejected.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update trainer request.')
    }
  }

  return (
    <section className="trainer-approval-page">
      <div className="trainer-approval-hero">
        <div>
          <span className="eyebrow">Trainer Course Requests</span>
          <h1>Approve teaching access.</h1>
          <p>Keep trainer permissions separate from student course access. Approve only the course each trainer will teach.</p>
        </div>
        <div className="approval-count">
          <span>Pending</span>
          <strong>{requests.length}</strong>
        </div>
      </div>

      {message && <div className="success-box">{message}</div>}
      {error && <div className="alert">{error}</div>}

      <div className="trainer-approval-list">
        {requests.length === 0 ? (
          <div className="trainer-approval-empty">
            <h2>No trainer requests waiting</h2>
            <p>New teaching requests will appear here separately from student access requests.</p>
          </div>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="trainer-approval-card">
              <div className="approval-avatar">{(request.trainer_name || request.trainer_username || 'T').slice(0, 2).toUpperCase()}</div>
              <div>
                <span>Trainer request</span>
                <h2>{request.course_title || `Course ${request.course_id}`}</h2>
                <p>
                  Requested by <strong>{request.trainer_name || `Trainer ${request.trainer_id}`}</strong>
                  {request.trainer_username && <small> @{request.trainer_username}</small>}
                </p>
              </div>
              <div className="request-actions">
                <button className="button primary small" onClick={() => handleDecision(request.id, true)}>
                  Approve
                </button>
                <button className="button secondary small" onClick={() => handleDecision(request.id, false)}>
                  Reject
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export default TrainerRequestsPage
