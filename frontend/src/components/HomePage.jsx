import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteCourse, fetchCourses, fetchMyTrainerRequests, getAssetUrl, requestToTeachCourse } from '../api'

const HomePage = ({ token, user }) => {
  const [courses, setCourses] = useState([])
  const [trainerRequests, setTrainerRequests] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      setCourses([])
      setError('')
      return
    }
    fetchCourses()
      .then(setCourses)
      .catch(() => setError('Unable to load courses.'))
    if (user?.role === 'trainer') {
      fetchMyTrainerRequests(token)
        .then(setTrainerRequests)
        .catch(() => setError('Unable to load your trainer approvals.'))
    }
  }, [token, user])

  const handleDeleteCourse = async (course) => {
    const confirmed = window.confirm(`Delete ${course.title}? This will remove it for students and trainers.`)
    if (!confirmed) {
      return
    }
    setMessage('')
    setError('')
    try {
      await deleteCourse(course.slug, token)
      setCourses((prev) => prev.filter((item) => item.id !== course.id))
      setMessage(`${course.title} deleted successfully.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to delete course.')
    }
  }

  const trainerRequestByCourse = (courseId) => trainerRequests.find((request) => request.course_id === courseId)

  const courseInitials = (title) =>
    title
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  const handleTeachRequest = async (course) => {
    setMessage('')
    setError('')
    try {
      const request = await requestToTeachCourse(course.slug, token)
      setTrainerRequests((prev) => [...prev, request])
      setMessage(`Request sent to teach ${course.title}. Admin approval is required before editing.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to request this course.')
    }
  }

  if (user?.role === 'admin') {
    return (
      <section className="admin-courses-page">
        <div className="section-header">
          <span className="eyebrow">Admin course management</span>
          <h1>Manage learning tracks</h1>
          <p>Review available courses, open request approvals, or remove courses from the platform.</p>
        </div>
        {message && <div className="success-box">{message}</div>}
        {error && <div className="alert">{error}</div>}
        <div className="admin-course-list">
          {courses.map((course) => (
            <article key={course.id} className="admin-course-row">
              <div>
                <h2>{course.title}</h2>
                <p>{course.summary}</p>
                <small>{course.audience}</small>
              </div>
              <div className="admin-course-actions">
                <Link className="button primary small" to={`/requests/${course.slug}`}>
                  Review
                </Link>
                <Link className="button secondary small" to={`/course-editor/${course.slug}`}>
                  Edit
                </Link>
                <button className="button danger small" onClick={() => handleDeleteCourse(course)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (user?.role === 'trainer') {
    return (
      <section className="trainer-studio-page">
        <div className="trainer-studio-header">
          <div>
            <span className="eyebrow">Course Studio</span>
            <h1>Build the learning room.</h1>
            <p>Select a track and add the overview, modules, quizzes, and video links students will see after approval.</p>
          </div>
          <Link className="button primary" to="/dashboard">
            Trainer dashboard
          </Link>
        </div>
        {error && <div className="alert">{error}</div>}
        <div className="studio-lane">
          {courses.map((course) => (
            <article key={course.id} className="studio-course-tile">
              <div className="studio-course-topline"></div>
              <div className="studio-course-shell">
                <div className="studio-course-icon" aria-hidden="true">
                  <span></span>
                </div>
                <div className={`studio-status-badge ${trainerRequestByCourse(course.id)?.status || 'new'}`}>
                  {trainerRequestByCourse(course.id)?.status || 'not requested'}
                </div>
              </div>
              <div className="studio-course-body">
                <span>{course.slug}</span>
                <h2>{course.title}</h2>
                <p>{course.summary}</p>
                <small>{course.audience}</small>
              </div>
              <div className="studio-course-actions">
                {trainerRequestByCourse(course.id)?.status === 'approved' ? (
                  <Link className="button primary small" to={`/course/${course.slug}`}>
                    Open studio
                  </Link>
                ) : trainerRequestByCourse(course.id)?.status === 'pending' ? (
                  <button className="button secondary small" type="button" disabled>
                    Waiting for admin
                  </button>
                ) : trainerRequestByCourse(course.id)?.status === 'rejected' ? (
                  <button className="button secondary small" type="button" onClick={() => handleTeachRequest(course)}>
                    Request again
                  </button>
                ) : (
                  <button className="button primary small" type="button" onClick={() => handleTeachRequest(course)}>
                    Request to teach
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  if (user?.role === 'student') {
    return (
      <section className="student-courses-page">
        <div className="student-courses-hero">
          <div>
            <span className="eyebrow">Course Library</span>
            <h1>Choose your next learning track.</h1>
            <p>Explore structured courses, request access, and continue into quizzes when your course is approved.</p>
            <div className="student-course-actions">
              <Link className="button primary" to="/quizzes">
                View all quizzes
              </Link>
              <Link className="button secondary" to="/dashboard">
                My dashboard
              </Link>
            </div>
          </div>
          <div className="student-course-summary">
            <span>Available courses</span>
            <strong>{courses.length}</strong>
            <small>Admin-approved learning tracks</small>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="student-course-grid">
          {courses.map((course, index) => (
            <article key={course.id} className="student-course-card">
              {course.thumbnail_image_url ? (
                <img className="student-course-thumbnail" src={getAssetUrl(course.thumbnail_image_url)} alt={`${course.title} thumbnail`} />
              ) : (
                <div className={`student-course-badge accent-${(index % 5) + 1}`}>{courseInitials(course.title)}</div>
              )}
              <div className="student-course-content">
                <span>{course.slug}</span>
                <h2>{course.title}</h2>
                <p>{course.summary}</p>
                <small>{course.audience}</small>
              </div>
              <div className="student-course-card-actions">
                <Link className="button primary small" to={`/course/${course.slug}`}>
                  View course
                </Link>
                <Link className="button secondary small" to={`/course/${course.slug}?tab=quiz`}>
                  Quizzes
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">Innolance Solutions Learning Platform</span>
        <h1>Build skills for real-world careers.</h1>
        <p>
          Access curated tracks for Java, Python, SQL, DevOps, and Digital Marketing. Manage requests, track progress,
          and collaborate in one responsive learning portal.
        </p>
        {!user && (
          <div className="hero-actions">
            <Link className="button primary" to="/register">
              Start learning
            </Link>
            <Link className="button secondary" to="/login">
              I already have an account
            </Link>
          </div>
        )}
      </div>
      <div className="hero-media" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80"
          alt=""
        />
        <div className="learning-panel">
          <span>Live tracks</span>
          <strong>Java - Python - SQL - DevOps</strong>
        </div>
      </div>
      {user && (
        <div className="course-grid">
          {error && <div className="alert">{error}</div>}
          {courses.map((course) => (
            <article key={course.id} className="course-card">
              {course.thumbnail_image_url && (
                <img className="course-card-thumb" src={getAssetUrl(course.thumbnail_image_url)} alt={`${course.title} thumbnail`} />
              )}
              <div>
                <h2>{course.title}</h2>
                <p>{course.summary}</p>
                <small>{course.audience}</small>
              </div>
              <Link className="button primary small" to={`/course/${course.slug}`}>
                View course
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default HomePage
