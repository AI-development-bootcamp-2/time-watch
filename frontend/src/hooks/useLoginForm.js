import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

export function useLoginForm({ onSubmit }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const navigate = useNavigate()

  function handleChange(e) {
    const { name, value } = e.target
    if (name === "email") setEmail(value)
    if (name === "password") setPassword(value)
    setErrors(prev => ({ ...prev, [name]: undefined, form: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {}
    if (!email) next.email = "נא להזין אימייל"
    if (!password) next.password = "נא להזין סיסמה"
    if (Object.keys(next).length) { setErrors(next); return }

    setIsSubmitting(true)
    try {
      await onSubmit(email, password)
      navigate("/daily", { replace: true })
    } catch (err) {
      setErrors({ form: err.message || "אימייל או סיסמה שגויים" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return { email, password, errors, isSubmitting, handleChange, handleSubmit, emailRef, passwordRef }
}
