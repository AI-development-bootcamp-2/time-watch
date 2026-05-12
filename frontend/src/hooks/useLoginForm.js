import { useRef, useState } from 'react'
import { isRequired, isValidEmail } from '../utils/validation'
import { AUTH_ERRORS } from '../utils/errorMessages'

export function useLoginForm({ onSubmit, onSuccess } = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'email') setEmail(value)
    if (name === 'password') setPassword(value)
    setErrors(prev => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  function validate() {
    const next = {}
    if (!isRequired(email)) {
      next.email = AUTH_ERRORS.REQUIRED_FIELD
    } else if (!isValidEmail(email)) {
      next.email = AUTH_ERRORS.INVALID_EMAIL
    }
    if (!isRequired(password)) {
      next.password = AUTH_ERRORS.REQUIRED_FIELD
    }
    setErrors(next)
    if (next.email) { emailRef.current?.focus(); return false }
    if (next.password) { passwordRef.current?.focus(); return false }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isSubmitting) return
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const result = await onSubmit(email, password)
      onSuccess?.(result)
    } catch (err) {
      const msg =
        err.status === 401 ? AUTH_ERRORS.WRONG_CREDENTIALS
        : err.status === 423 ? AUTH_ERRORS.ACCOUNT_LOCKED
        : AUTH_ERRORS.SERVER_ERROR
      setErrors(prev => ({ ...prev, form: msg }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return { email, password, errors, isSubmitting, handleChange, handleSubmit, validate, emailRef, passwordRef }
}
