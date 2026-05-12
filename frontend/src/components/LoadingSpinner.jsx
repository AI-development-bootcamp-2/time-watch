import './LoadingSpinner.css'

export default function LoadingSpinner({ fullPage = false }) {
  return (
    <div
      className={fullPage ? 'spinner-overlay' : 'spinner-inline'}
      role="status"
      aria-label="טוען..."
    >
      <div className="spinner" />
    </div>
  )
}
