import Icon from './Icon'

export function Spinner({ size = 16 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
}

export function LoadingState({ rows = 6, label = 'Loading…' }) {
  return (
    <div className="skeleton-list" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton-lines">
            <span className="skeleton skeleton-line" style={{ width: `${40 + ((i * 17) % 35)}%` }} />
            <span className="skeleton skeleton-line short" />
          </div>
          <span className="skeleton skeleton-pill" />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="state-box state-error" role="alert">
      <span className="state-icon">
        <Icon name="wifiOff" size={26} />
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon = 'users', title, message, children }) {
  return (
    <div className="state-box">
      <span className="state-icon neutral">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children}
    </div>
  )
}
