export function Loading({ label = "Loading" }) {
  return (
    <div className="status" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}…
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="status error" role="alert">
      <div>
        <b>Something went wrong.</b> {error?.message || String(error)}
      </div>
      {onRetry && (
        <button className="btn ghost sm" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="status">{children}</div>;
}
