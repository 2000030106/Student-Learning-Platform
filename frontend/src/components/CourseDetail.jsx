import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchCourse, requestAccess } from '../api'

const CourseDetail = ({ token, user }) => {
  const { slug } = useParams()
  const [course, setCourse] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCourse(slug)
      .then(setCourse)
      .catch(() => setError('Unable to load course information.'))
  }, [slug])

  const handleRequestAccess = async () => {
    setError('')
    setMessage('')
    if (!token) {
      setError('Login as a student to request access.')
      return
    }
    try {
      await requestAccess(slug, token)
      setMessage('Access request sent. Wait for admin approval.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to request access.')
    }
  }

  return (
    <section className="course-detail">
      {course ? (
        <>
          <div className="detail-header">
            <span className="eyebrow">Course Access Request</span>
            <h1>{course.title}</h1>
            <p>{course.summary}</p>
            <p className="meta">Audience: {course.audience}</p>
            <button className="button primary" onClick={handleRequestAccess}>
              Request access from admin
            </button>
            {message && <div className="success-box">{message}</div>}
            {error && <div className="alert">{error}</div>}
          </div>
          <div className="feature-list">
            <article>
              <h3>Professional pathway</h3>
              <p>Structured course experience for practical career readiness.</p>
            </article>
            <article>
              <h3>Admin controls</h3>
              <p>Admin can approve or reject access requests for learners.</p>
            </article>
            <article>
              <h3>Trainer support</h3>
              <p>Trainers can manage pending course requests and validate enrollments.</p>
            </article>
          </div>
        </>
      ) : (
        <div>Loading...</div>
      )}
    </section>
  )
}

export default CourseDetail
