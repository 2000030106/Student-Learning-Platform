import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAdminUsers,
  fetchAllRequests,
  fetchCourses,
  fetchMyRequests,
  fetchPendingRequests,
  fetchPendingTrainerRequests,
  fetchQuizAnalytics,
  fetchQuizzes,
} from '../api'

const Dashboard = ({ token, user, theme, setTheme }) => {
  const [myRequests, setMyRequests] = useState([])
  const [trainerCourses, setTrainerCourses] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [adminCourses, setAdminCourses] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [allRequests, setAllRequests] = useState([])
  const [trainerRequests, setTrainerRequests] = useState([])
  const [courseQuizzes, setCourseQuizzes] = useState([])
  const [quizAnalytics, setQuizAnalytics] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role === 'admin') {
      const loadAdminDashboard = async () => {
        try {
          const [courses, users, requests, trainerPending] = await Promise.all([
            fetchCourses(),
            fetchAdminUsers(token),
            fetchAllRequests(token),
            fetchPendingTrainerRequests(token),
          ])
          setAdminCourses(courses)
          setAdminUsers(users)
          setAllRequests(requests)
          setTrainerRequests(trainerPending)
          setSelectedCourseId((current) => current || String(courses[0]?.id || ''))

          const quizGroups = await Promise.all(
            courses.map(async (course) => ({
              course,
              quizzes: await fetchQuizzes(course.slug, token).catch(() => []),
            })),
          )
          setCourseQuizzes(quizGroups)

          const analytics = await Promise.all(
            quizGroups.flatMap(({ course, quizzes }) =>
              quizzes.map(async (quiz) => ({
                course,
                quiz,
                data: await fetchQuizAnalytics(course.slug, quiz.id, token).catch(() => null),
              })),
            ),
          )
          setQuizAnalytics(analytics.filter((item) => item.data))
        } catch (err) {
          setError('Unable to load admin analytics.')
        }
      }
      loadAdminDashboard()
    }
    if (user?.role === 'student') {
      fetchMyRequests(token)
        .then(setMyRequests)
        .catch(() => setError('Unable to load your requests.'))
    }
    if (user?.role === 'trainer') {
      fetchCourses()
        .then(setTrainerCourses)
        .catch(() => setError('Unable to load trainer courses.'))
      fetchPendingRequests(token)
        .then(setPendingRequests)
        .catch(() => setError('Unable to load pending requests.'))
    }
  }, [token, user])

  const dashboardSubtitle =
    user?.role === 'admin'
      ? 'Manage courses and review student access from one place.'
      : user?.role === 'trainer'
        ? 'Monitor student learning activity and course access.'
        : 'Track your course access requests.'

  const studentStats = {
    total: myRequests.length,
    approved: myRequests.filter((request) => request.status === 'approved').length,
    pending: myRequests.filter((request) => request.status === 'pending').length,
    rejected: myRequests.filter((request) => request.status === 'rejected').length,
  }

  const trainerStats = {
    courses: trainerCourses.length,
    pending: pendingRequests.length,
    modules: trainerCourses.length * 4,
    updates: trainerCourses.length ? 'Today' : 'None',
  }

  const featuredCourse = trainerCourses[0]

  const selectedCourse =
    adminCourses.find((course) => course.id === Number(selectedCourseId)) || adminCourses[0]
  const selectedCourseRequests = selectedCourse
    ? allRequests.filter((request) => request.course_id === selectedCourse.id)
    : []
  const selectedCourseQuizzes = selectedCourse
    ? courseQuizzes.find((item) => item.course.id === selectedCourse.id)?.quizzes || []
    : []
  const selectedQuizAnalytics = selectedCourse
    ? quizAnalytics.filter((item) => item.course.id === selectedCourse.id)
    : []

  const adminStats = {
    users: adminUsers.length,
    students: adminUsers.filter((item) => item.role === 'student').length,
    trainers: adminUsers.filter((item) => item.role === 'trainer').length,
    courses: adminCourses.length,
    requests: allRequests.length,
    approved: allRequests.filter((request) => request.status === 'approved').length,
    pending: allRequests.filter((request) => request.status === 'pending').length,
    rejected: allRequests.filter((request) => request.status === 'rejected').length,
    quizzes: courseQuizzes.reduce((total, item) => total + item.quizzes.length, 0),
    attempts: quizAnalytics.reduce((total, item) => total + item.data.attempted, 0),
  }

  const statusPercent = (count) => {
    if (!selectedCourseRequests.length) {
      return 0
    }
    return Math.round((count / selectedCourseRequests.length) * 100)
  }

  const selectedStatus = {
    approved: selectedCourseRequests.filter((request) => request.status === 'approved').length,
    pending: selectedCourseRequests.filter((request) => request.status === 'pending').length,
    rejected: selectedCourseRequests.filter((request) => request.status === 'rejected').length,
  }

  const averagePassRate = selectedQuizAnalytics.length
    ? Math.round(selectedQuizAnalytics.reduce((total, item) => total + item.data.pass_rate, 0) / selectedQuizAnalytics.length)
    : 0

  return (
    <section className="dashboard-page">
      <div className="theme-panel">
        <div>
          <span className="eyebrow">Theme</span>
          <strong>Choose your workspace look</strong>
        </div>
        <div className="theme-options" role="group" aria-label="Theme selector">
          {[
            ['light', 'Light'],
            ['dark', 'Dark'],
            ['mint', 'Mint'],
            ['rose', 'Rose'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={theme === value ? 'active' : ''}
              type="button"
              onClick={() => setTheme(value)}
            >
              <span className={`theme-dot ${value}`}></span>
              {label}
            </button>
          ))}
        </div>
      </div>
      {user?.role === 'student' && (
        <>
          <h1>Welcome, {user?.username}</h1>
          <p className="subtitle">{dashboardSubtitle}</p>
        </>
      )}
      {error && <div className="alert">{error}</div>}
      {user?.role === 'admin' && (
        <div className="admin-command-center">
          <section className="admin-analytics-hero">
            <div>
              <span className="eyebrow">Admin Command Center</span>
              <h1>Platform health, access, and quiz outcomes.</h1>
              <p>Track users, approvals, course demand, quiz publishing, and student results from one dashboard.</p>
            </div>
            <div className="admin-hero-actions">
              <Link className="button primary" to="/requests">Review requests</Link>
              <Link className="button secondary" to="/trainer-requests">Trainer approvals</Link>
            </div>
          </section>

          <section className="admin-stat-grid">
            <article><span>Total users</span><strong>{adminStats.users}</strong><small>{adminStats.students} students / {adminStats.trainers} trainers</small></article>
            <article><span>Courses</span><strong>{adminStats.courses}</strong><small>Active learning tracks</small></article>
            <article><span>Access approved</span><strong>{adminStats.approved}</strong><small>{adminStats.pending} pending / {adminStats.rejected} rejected</small></article>
            <article><span>Quiz attempts</span><strong>{adminStats.attempts}</strong><small>{adminStats.quizzes} quizzes published</small></article>
          </section>

          <section className="admin-dashboard-grid">
            <div className="admin-panel course-performance-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="eyebrow">Course Analytics</span>
                  <h2>Selected course report</h2>
                </div>
                <select value={selectedCourse?.id || ''} onChange={(event) => setSelectedCourseId(event.target.value)}>
                  {adminCourses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div className="course-health-layout">
                <div className="donut-card">
                  <div className="donut-chart" style={{ '--value': `${statusPercent(selectedStatus.approved)}%` }}>
                    <strong>{statusPercent(selectedStatus.approved)}%</strong>
                    <span>approved</span>
                  </div>
                  <p>{selectedCourse?.title || 'Course'} access approval rate</p>
                </div>
                <div className="metric-bars">
                  {[
                    ['Approved', selectedStatus.approved, '#22c55e'],
                    ['Pending', selectedStatus.pending, '#f59e0b'],
                    ['Rejected', selectedStatus.rejected, '#ef4444'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="metric-bar-row">
                      <div><span>{label}</span><strong>{value}</strong></div>
                      <div className="metric-track"><span style={{ width: `${statusPercent(value)}%`, background: color }}></span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-panel quiz-performance-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="eyebrow">Quiz Results</span>
                  <h2>{selectedCourseQuizzes.length} quizzes in this course</h2>
                </div>
                <div className="pass-rate-chip">{averagePassRate}% avg pass</div>
              </div>
              <div className="quiz-performance-list">
                {selectedQuizAnalytics.length === 0 ? (
                  <p>No quiz attempts recorded for this course yet.</p>
                ) : (
                  selectedQuizAnalytics.map(({ quiz, data }) => (
                    <article key={quiz.id}>
                      <div>
                        <strong>{quiz.title}</strong>
                        <small>{data.attempted} attempted / {data.passed} passed / {data.failed} failed</small>
                      </div>
                      <div className="result-bar">
                        <span style={{ width: `${data.pass_rate}%` }}></span>
                      </div>
                      <b>{data.pass_rate}%</b>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="admin-table-grid">
            <div className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="eyebrow">Access Table</span>
                  <h2>{selectedCourseRequests.length} users for selected course</h2>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr><th>User</th><th>Email</th><th>Course</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {selectedCourseRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.student_name || request.student_username}</td>
                        <td>{request.student_email || 'Not available'}</td>
                        <td>{request.course_title}</td>
                        <td><span className={`status-pill ${request.status}`}>{request.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="eyebrow">Users</span>
                  <h2>Recent platform users</h2>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-data-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th></tr>
                  </thead>
                  <tbody>
                    {adminUsers.slice(0, 8).map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.email}</td>
                        <td><span className={`role-pill ${item.role}`}>{item.role}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="admin-panel quiz-catalog-panel">
            <div className="admin-panel-heading">
              <div>
                <span className="eyebrow">Quiz Catalog</span>
                <h2>Published quizzes by course</h2>
              </div>
              <Link className="button secondary small" to="/quizzes">Open quiz tab</Link>
            </div>
            <div className="admin-quiz-catalog">
              {courseQuizzes.map(({ course, quizzes }) => (
                <article key={course.id}>
                  <span>{course.title}</span>
                  <strong>{quizzes.length}</strong>
                  <small>{quizzes.map((quiz) => quiz.title).join(', ') || 'No quizzes yet'}</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
      {user?.role === 'student' && (
        <>
          <div className="student-summary-grid">
            <article className="student-stat-card">
              <span>Total requests</span>
              <strong>{studentStats.total}</strong>
            </article>
            <article className="student-stat-card approved">
              <span>Approved</span>
              <strong>{studentStats.approved}</strong>
            </article>
            <article className="student-stat-card pending">
              <span>Pending</span>
              <strong>{studentStats.pending}</strong>
            </article>
            <article className="student-stat-card rejected">
              <span>Rejected</span>
              <strong>{studentStats.rejected}</strong>
            </article>
          </div>
          <div className="dashboard-card student-dashboard-card">
            <div className="student-card-heading">
              <div>
                <h2>Your course access</h2>
                <p>Follow your request status and continue exploring available learning tracks.</p>
              </div>
              <Link className="button primary small" to="/">
                Browse courses
              </Link>
            </div>
            {myRequests.length === 0 ? (
              <div className="empty-state">
                <h3>No course requests yet</h3>
                <p>Explore courses and request access to start your learning journey.</p>
                <Link className="button primary small" to="/">
                  View courses
                </Link>
              </div>
            ) : (
              <div className="student-request-list">
                {myRequests.map((request) => (
                  <article key={request.id} className="student-request-card">
                    <div>
                      <span className={`status-pill ${request.status}`}>{request.status}</span>
                      <h3>{request.course_title || `Course ${request.course_id}`}</h3>
                      <p>
                        {request.status === 'approved'
                          ? 'Access approved. You can continue with this learning track.'
                          : request.status === 'pending'
                            ? 'Waiting for admin approval.'
                            : 'Request was not approved. Please contact the admin team for details.'}
                      </p>
                    </div>
                    {request.course_slug && request.status === 'approved' && (
                      <Link className="button secondary small" to={`/course/${request.course_slug}`}>
                        Open course
                      </Link>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {user?.role === 'trainer' && (
        <div className="trainer-command-center">
          <div className="trainer-hero">
            <div>
              <span className="eyebrow">Trainer Workspace</span>
              <h1>Welcome, {user?.username}</h1>
              <p>Shape course material, prepare topic modules, attach video resources, and keep access requests visible.</p>
              <div className="trainer-hero-actions">
                <Link className="button primary" to="/">
                  Open course studio
                </Link>
                <Link className="button secondary" to="/requests">
                  View requests
                </Link>
              </div>
            </div>
            <div className="trainer-focus-panel">
              <span>Next focus</span>
              <strong>{featuredCourse?.title || 'Create course content'}</strong>
              <p>{featuredCourse ? 'Add one module, one quiz, and one video link for this track.' : 'Courses will appear here after admin creates them.'}</p>
            </div>
          </div>

          <div className="trainer-stat-grid">
            <article>
              <span>Courses</span>
              <strong>{trainerStats.courses}</strong>
            </article>
            <article>
              <span>Pending access</span>
              <strong>{trainerStats.pending}</strong>
            </article>
            <article>
              <span>Starter modules</span>
              <strong>{trainerStats.modules}</strong>
            </article>
            <article>
              <span>Content check</span>
              <strong>{trainerStats.updates}</strong>
            </article>
          </div>

          <div className="trainer-dashboard-grid trainer-dashboard-grid-single">
            <section className="trainer-worklist">
              <div className="trainer-section-heading">
                <div>
                  <span className="eyebrow">Course queue</span>
                  <h2>Continue building</h2>
                </div>
                <Link className="button secondary small" to="/">
                  See all
                </Link>
              </div>
              {trainerCourses.slice(0, 3).map((course, index) => (
                <Link key={course.id} className="trainer-work-item" to={`/course/${course.slug}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{course.title}</strong>
                    <p>{course.summary}</p>
                  </div>
                  <small>Open</small>
                </Link>
              ))}
            </section>
          </div>
        </div>
      )}
    </section>
  )
}

export default Dashboard
