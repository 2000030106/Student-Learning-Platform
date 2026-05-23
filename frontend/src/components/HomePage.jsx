import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCourses } from '../api'

const HomePage = ({ token, user }) => {
  const [courses, setCourses] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => setError('Unable to load courses.'))
  }, [])

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow">Modern student learning</span>
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
      <div className="course-grid">
        {error && <div className="alert">{error}</div>}
        {courses.map((course) => (
          <article key={course.id} className="course-card">
            <h2>{course.title}</h2>
            <p>{course.summary}</p>
            <small>{course.audience}</small>
            <Link className="button small" to={`/course/${course.slug}`}>
              View course
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}

export default HomePage
