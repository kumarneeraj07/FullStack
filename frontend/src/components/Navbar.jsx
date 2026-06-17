import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        🎬 CineBook
      </Link>
      <nav className="nav-links">
        <Link to="/">Movies</Link>
        {user ? (
          <>
            <Link to="/my-bookings">My Bookings</Link>
            <span className="nav-user">Hi, {user.name}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn btn-primary">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
