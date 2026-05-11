import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLoginForm } from '../../hooks/useLoginForm'
import InlineError from '../../components/InlineError'
import './LoginPage.css'

function IconEmail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function LoginForm() {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)

  const form = useLoginForm({
    onSubmit: (email, password) => login(email, password),
  })

  return (
    <form
      className="login-card"
      onSubmit={form.handleSubmit}
      dir="rtl"
      noValidate
    >
      <img
        src="/abra-logo.png"
        alt="abra"
        className="login-logo"
      />

      <h1 className="login-welcome">
        ברוכים הבאים למערכת<br />
        הניהול של אברא
      </h1>

      <div className="login-form">

        <div className="login-field">
          <label htmlFor="email">אימייל</label>
          <div className="login-input-wrap">
            <input
              id="email"
              name="email"
              type="email"
              dir="rtl"
              className="login-input"
              value={form.email}
              onChange={form.handleChange}
              ref={form.emailRef}
              autoComplete="email"
              aria-invalid={!!form.errors.email}
              aria-describedby={form.errors.email ? 'email-error' : undefined}
            />
            <span className="login-input-icon">
              <IconEmail />
            </span>
          </div>
          <InlineError id="email-error" message={form.errors.email} />
        </div>

        <div className="login-field">
          <label htmlFor="password">סיסמה</label>
          <div className="login-input-wrap">
            <button
              type="button"
              className="login-pw-toggle"
              aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              onClick={() => setShowPassword(prev => !prev)}
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              dir="rtl"
              className="login-input"
              value={form.password}
              onChange={form.handleChange}
              ref={form.passwordRef}
              autoComplete="current-password"
              aria-invalid={!!form.errors.password}
              aria-describedby={form.errors.password ? 'password-error' : undefined}
            />
            <span className="login-input-icon">
              <IconLock />
            </span>
          </div>
          <InlineError id="password-error" message={form.errors.password} />
        </div>

        <div className="login-row">
          <label className="login-remember" htmlFor="remember">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            <span className={`login-checkbox-box${remember ? ' is-checked' : ''}`} aria-hidden="true" />
            זכור אותי
          </label>
        </div>

        <InlineError id="form-error" message={form.errors.form} />

        <button
          type="submit"
          className="login-submit"
          disabled={form.isSubmitting}
        >
          {form.isSubmitting ? 'מתחבר...' : 'כניסה'}
        </button>

      </div>
    </form>
  )
}
