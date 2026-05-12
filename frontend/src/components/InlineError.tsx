export default function InlineError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="text-red-500 text-xs mt-1">{message}</p>
}
