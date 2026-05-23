import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { approveRequest, fetchCourse, fetchPendingRequests } from '../api'

const RequestsPage = ({ token, user }) => {
  const { slug } = useParams()
  const [pending, setPending] = useState([])
  const [courseName, setCourseName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (slug) {
      fetchCourse(slug)
        .then((course) => setCourseName(course.title))
        .catch(() => setCourseName('Course'))
    } else {
      setCourseName('')
    }
    fetchPendingRequests(token)
      .then((requests) => {
        const visibleRequests = slug ? requests.filter((request) => request.course_slug === slug) : requests
        setPending(visibleRequests)
        if (!courseName) {
          setCourseName(visibleRequests[0]?.course_title || '')
        }
      })
      .catch(() => setError('Unable to load pending requests.'))
  }, [token, slug])

  const handleApprove = async (requestId, approve) => {
    setMessage('')
    setError('')
    try {
      await approveRequest(requestId, approve, token)
      setMessage(approve ? 'Request approved successfully.' : 'Request rejected successfully.')
      setPending((prev) => prev.filter((item) => item.id !== requestId))
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to update request.')
    }
  }

  return (
    <section className="dashboard-page">
      <h1>{slug ? `${courseName || 'Course'} Requests` : 'Access Requests'}</h1>
      <p className="subtitle">
        {slug ? 'Approve student access requests for this course.' : 'Approve student access requests for all Innolance learning tracks.'}
      </p>
      {message && <div className="success-box">{message}</div>}
      {error && <div className="alert">{error}</div>}
      <div className="dashboard-card">
        <h2>{slug ? 'Course pending requests' : 'All pending requests'}</h2>
        {pending.length === 0 ? (
          <p>No requests pending review.</p>
        ) : (
          <ul className="request-list">
            {pending.map((request) => (
              <li key={request.id}>
                <div className="request-info">
                  <span className="request-badge">Pending</span>
                  <h3>{request.course_title || `Course ${request.course_id}`}</h3>
                  <p>
                    Requested by <strong>{request.student_name || `User ${request.user_id}`}</strong>
                    {request.student_username && <span> @{request.student_username}</span>}
                  </p>
                </div>
                {user?.role === 'admin' ? (
                  <div className="request-actions">
                    <button className="button primary small" onClick={() => handleApprove(request.id, true)}>
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
    </section>
  )
}

export default RequestsPage
