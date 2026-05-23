import { Link } from 'react-router-dom'

const Navbar = ({ user, onSignOut }) => {
  return (
    <header className="navbar">
      <div className="brand">
        <Link to={user ? '/dashboard' : '/'} className="brand-link">
          <span className="brand-mark" aria-hidden="true">
            <span></span>
          </span>
          <span className="brand-text">
            <strong>Innolance</strong>
            <small>Solutions</small>
          </span>
        </Link>
      </div>
      <nav>
        {user ? (
          <>
            <Link to="/">{user.role === 'admin' ? 'Manage Courses' : user.role === 'trainer' ? 'Course Studio' : 'Courses'}</Link>
            <Link to="/quizzes">Quizzes</Link>
            <Link to="/practice">Practice</Link>
            {user.role === 'admin' && <Link to="/course-editor">Add / Update</Link>}
            {user.role === 'admin' && <Link to="/requests">Student Requests</Link>}
            {user.role === 'admin' && <Link to="/trainer-requests">Trainer Requests</Link>}
            <Link to="/dashboard">Dashboard</Link>
            <button className="button secondary" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  )
}

export default Navbar
