import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCourses, fetchMyRequests, fetchMyTrainerRequests, fetchProfile, fetchQuizzes } from '../api'

const formatQuizDateTime = (value) => {
  if (!value) {
    return 'Not scheduled'
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const StudentQuizzesPage = ({ token }) => {
  const [courseQuizzes, setCourseQuizzes] = useState([])
  const [profile, setProfile] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadQuizzes = async () => {
      setLoading(true)
      setError('')
      try {
        const [courses, currentUser] = await Promise.all([fetchCourses(), fetchProfile(token)])
        setProfile(currentUser)
        let visibleCourses = courses

        if (currentUser.role === 'student') {
          const requests = await fetchMyRequests(token)
          const approvedCourseIds = new Set(
            requests.filter((request) => request.status === 'approved').map((request) => request.course_id),
          )
          visibleCourses = courses.filter((course) => approvedCourseIds.has(course.id))
        }

        if (currentUser.role === 'trainer') {
          const requests = await fetchMyTrainerRequests(token)
          const approvedCourseIds = new Set(
            requests.filter((request) => request.status === 'approved').map((request) => request.course_id),
          )
          visibleCourses = courses.filter((course) => approvedCourseIds.has(course.id))
        }

        const quizzesByCourse = await Promise.all(
          visibleCourses.map(async (course) => ({
            course,
            quizzes: await fetchQuizzes(course.slug, token).catch(() => []),
          })),
        )
        setCourseQuizzes(quizzesByCourse)
      } catch (err) {
        setError('Unable to load quizzes.')
      } finally {
        setLoading(false)
      }
    }

    loadQuizzes()
  }, [token])

  const visibleCourseQuizzes = useMemo(
    () =>
      selectedCourse === 'all'
        ? courseQuizzes
        : courseQuizzes.filter((item) => item.course.slug === selectedCourse),
    [courseQuizzes, selectedCourse],
  )

  const totalQuizzes = courseQuizzes.reduce((total, item) => total + item.quizzes.length, 0)
  const attemptedQuizzes = courseQuizzes.reduce(
    (total, item) => total + item.quizzes.filter((quiz) => quiz.attempted).length,
    0,
  )
  const enrolledCourseCount = courseQuizzes.length

  return (
    <section className="student-quizzes-page">
      <div className="quizzes-hero">
        <div>
          <span className="eyebrow">Quiz Center</span>
          <h1>{profile?.role === 'student' ? 'Your enrolled course quizzes.' : 'Course quizzes in one place.'}</h1>
          <p>
            {profile?.role === 'student'
              ? 'Only quizzes from courses approved for your account appear here.'
              : 'Choose a course, check the schedule, and jump straight into the quiz section.'}
          </p>
        </div>
        <div className="quiz-summary-panel">
          <span>Available quizzes</span>
          <strong>{totalQuizzes}</strong>
          <small>{attemptedQuizzes} attempted / {enrolledCourseCount} courses</small>
        </div>
      </div>

      <div className="quiz-filter-bar">
        <label htmlFor="course-filter">Course</label>
        <select id="course-filter" value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>
          <option value="all">{profile?.role === 'student' ? 'All enrolled courses' : 'All courses'}</option>
          {courseQuizzes.map(({ course }) => (
            <option key={course.id} value={course.slug}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading && <div className="quiz-empty-state">Loading quizzes...</div>}

      {!loading && totalQuizzes === 0 && (
        <div className="quiz-empty-state">
          <h2>{profile?.role === 'student' && enrolledCourseCount === 0 ? 'No enrolled courses yet' : 'No quizzes are available yet'}</h2>
          <p>
            {profile?.role === 'student' && enrolledCourseCount === 0
              ? 'After admin approves your course request, that course and its quizzes will appear here.'
              : 'When trainers publish quizzes, they will appear here by course.'}
          </p>
        </div>
      )}

      {!loading && totalQuizzes > 0 && (
        <div className="course-quiz-sections">
          {visibleCourseQuizzes.map(({ course, quizzes }) => (
            <section key={course.id} className="course-quiz-section">
              <div className="course-quiz-heading">
                <div>
                  <span>{course.slug}</span>
                  <h2>{course.title}</h2>
                  <p>{course.summary}</p>
                </div>
                <Link className="button secondary small" to={`/course/${course.slug}?tab=quiz`}>
                  Open course quizzes
                </Link>
              </div>

              {quizzes.length === 0 ? (
                <p className="course-quiz-empty">No quizzes published for this course yet.</p>
              ) : (
                <div className="quiz-hub-grid">
                  {quizzes.map((quiz) => (
                    <article key={quiz.id} className="quiz-hub-card">
                      <div>
                        <span>{quiz.time_limit_minutes} min</span>
                        <h3>{quiz.title}</h3>
                        <p>{quiz.description}</p>
                        <div className="quiz-schedule">
                          <small>Starts: {formatQuizDateTime(quiz.starts_at)}</small>
                          <small>Ends: {formatQuizDateTime(quiz.ends_at)}</small>
                        </div>
                      </div>
                      <div className="quiz-hub-actions">
                        {quiz.attempted && (
                          <small className={quiz.passed ? 'passed' : 'failed'}>
                            Last score: {quiz.last_score}% - {quiz.passed ? 'Passed' : 'Failed'}
                          </small>
                        )}
                        <Link className="button primary small" to={`/course/${course.slug}?tab=quiz`}>
                          {quiz.attempted ? 'Retake' : 'Start'}
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

export default StudentQuizzesPage
