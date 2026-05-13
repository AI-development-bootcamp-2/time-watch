import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

interface LoginErrors {
  email?: string
  password?: string
  form?: string
}

interface UseLoginFormOptions {
  onSubmit: (email: string, password: string) => Promise<unknown>
}

export function useLoginForm({ onSubmit }: UseLoginFormOptions) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    if (name === 'email') setEmail(value)
    if (name === 'password') setPassword(value)
    setErrors(prev => ({ ...prev, [name]: undefined, form: undefined }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next: LoginErrors = {}
    if (!email) next.email = 'נא להזין אימייל'
    if (!password) next.password = 'נא להזין סיסמה'
    if (Object.keys(next).length) { setErrors(next); return }

    setIsSubmitting(true)
    try {
      await onSubmit(email, password)
      navigate('/monthly', { replace: true })
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'אימייל או סיסמה שגויים' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return { email, password, errors, isSubmitting, handleChange, handleSubmit, emailRef, passwordRef }
}
