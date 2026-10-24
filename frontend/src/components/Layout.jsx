import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { USE_MOCK } from "../config";

const LINKS = [
  { to: "/prices", label: "Prices" },
  { to: "/report", label: "Report an offer" },
  { to: "/map", label: "Area map" },
  { to: "/impact", label: "Impact" },
  { to: "/ngo", label: "NGO view" },
  { to: "/about", label: "Methodology" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      {USE_MOCK && (
        <div className="mock-banner" role="status">
          Demo mode: all figures are sample data loaded in the browser.
        </div>
      )}
      <header className="topbar">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden="true" />
          Fair Price Index
        </Link>
        <button className="menu-btn" type="button" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>
          Menu
        </button>
        <nav id="main-nav" className={`nav ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.label}
            </NavLink>
          ))}
          <span className="nav-sep" aria-hidden="true" />
          {user ? (
            <>
              <span className="nav-user" title={user.email}>
                {user.name}
              </span>
              <button type="button" className="btn ghost sm" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register" className="nav-cta">
                Sign up
              </NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="page">{children}</main>
      <footer className="footer">
        <span>Fair Price Index · SDG 12.5 · SDG 11</span>
        <span>Prices are ranges with source and date. Reports are anonymous and shown only in aggregate.</span>
      </footer>
    </div>
  );
}
