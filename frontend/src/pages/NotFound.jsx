import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="card narrow">
      <h1>Page not found</h1>
      <p className="muted">That address does not exist. Try the price board instead.</p>
      <div className="row">
        <Link className="btn" to="/prices">
          See price ranges
        </Link>
      </div>
    </div>
  );
}
