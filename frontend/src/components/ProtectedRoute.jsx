import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loading } from "./Status";

// Shows children only to a logged-in user with the given role.
export default function ProtectedRoute({ role, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <Loading label="Checking your login" />;

  if (!user || (role && user.role !== role)) {
    return (
      <div className="card narrow">
        <h2>NGO partners only</h2>
        <p className="muted">
          This view shows area-level underpayment for advocacy, so it needs an NGO partner login. Prices and reporting work
          without an account.
        </p>
        {user && <p className="muted">You are logged in as a {user.role} account.</p>}
        <div className="row">
          <Link className="btn" to="/login" state={{ from: location.pathname }}>
            Log in
          </Link>
          <Link className="btn ghost" to="/register">
            Register your NGO
          </Link>
        </div>
      </div>
    );
  }
  return children;
}
