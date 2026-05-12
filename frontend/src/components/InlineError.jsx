import './InlineError.css'

export default function InlineError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="inline-error">
      {message}
    </p>
  )
}
