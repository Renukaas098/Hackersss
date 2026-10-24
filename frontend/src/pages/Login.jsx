import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { USE_MOCK } from "../config";

export default function Login() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(USE_MOCK ? "ngo.demo@example.com" : "");
  const [password, setPassword] = useState(USE_MOCK ? "demo1234" : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      navigate(location.state?.from || (u.role === "ngo" ? "/ngo" : "/report"), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="card narrow">
        <div className="eyebrow">Logged in</div>
        <h1>{user.name}</h1>
        <p className="muted">
          {user.role === "ngo" ? "NGO partner" : "Scrap shop"} · {user.email}
        </p>
        <div className="row">
          <Link className="btn" to={user.role === "ngo" ? "/ngo" : "/report"}>
            {user.role === "ngo" ? "Go to NGO view" : "Report an offer"}
          </Link>
          <button className="btn ghost" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid2">
      <form className="card" onSubmit={onSubmit} noValidate>
        <h1>Log in</h1>
        <label className="field" htmlFor="login-email">
          Email
          <input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field" htmlFor="login-password">
          Password
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="form-actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </button>
          {error && (
            <span className="field-error" role="alert">
              {error}
            </span>
          )}
        </div>
        {USE_MOCK && <p className="note">Demo account is pre-filled: ngo.demo@example.com / demo1234</p>}
        <p className="note">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
      <div className="card">
        <h2>Do I need an account?</h2>
        <p className="muted">
          <b>No</b>, to see prices or report an offer. Reports stay anonymous either way.
        </p>
        <p className="muted">
          <b>Yes</b>, if you are an NGO partner and want the area underpayment view and CSV export, or a shop your NGO has
          invited.
        </p>
      </div>
    </div>
  );
}
