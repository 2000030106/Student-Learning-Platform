import { Link } from 'react-router-dom'

const Navbar = ({ user, onSignOut }) => {
  return (
    <header className="navbar">
      <div className="brand">
        <Link to="/">Learning Platform</Link>
      </div>
      <nav>
        <Link to="/">Courses</Link>
        {user ? (
          <>
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
