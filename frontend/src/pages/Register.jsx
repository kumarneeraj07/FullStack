import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h2>Create account</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input value={form.name} onChange={update("name")} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={update("email")} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={update("password")}
            minLength={6}
            required
          />
        </label>
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? "Creating..." : "Sign up"}
        </button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
