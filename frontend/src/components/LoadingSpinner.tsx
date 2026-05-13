import './LoadingSpinner.css'

export default function LoadingSpinner({ fullPage = false }: { fullPage?: boolean }) {
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
